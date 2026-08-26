import z from "zod";
import { defineDomain, domainTable } from "@deepseek-ai/dsh-storage-domain";
import { NORMALIZED_CARD_INDEX_VERSION, parseCard, sha256, type NormalizedCard } from "./card-runtime.js";
import { activateWorldbookWithRenderer, normalizeWorldbookEntry, placeWorldbook, substituteCardMacros, type WorldbookActivation } from "./worldbook.js";
import { applyCompiledPromptToRequest, compileTavernPrompt, compiledTavernSystemPrompt, normalizeTavernChatMessages, renderTavernContextEnvelope, type CompiledTavernPrompt } from "./prompt-compiler.js";
import { DEFAULT_TAVERN_PRESET, exportSillyTavernPreset, normalizeTavernPreset, type TavernPromptPreset } from "./preset-runtime.js";
import { createTavernSessionSeed, currentOpeningSurfaceSeq, currentOpeningText, currentWorldbookSurfaceSeq, hasPlayerMessage, isolateTavernAssembly, openingIdFromSetChatMessages, tavernSurfaceAudit, tavernSurfaceEventDetail, TAVERN_WORLD_CONTEXT_MARKER, upsertTavernAssemblyContext, worldbookContextRevision, type TavernAssemblySummary } from "./session-runtime.js";
import { applyVariableUpdate, CommittedReplyVariableGate, initializeVariableRuntime, mergeVariableScopes, variableStateDigest, type VariableObject, type VariableRuntimeEvent, type VariableSource, type VariableUpdateResult } from "./variable-runtime.js";
import { adaptOpeningFrontendHtml, applyFrontendStateAction, bridgeCapabilities, frontendStateDigest, groupFrontendMessagesForNativeFlow, initialFrontendState, projectFrontendMessages, waitForCommittedFrontendTurn, type FrontendDefinition, type FrontendProjection } from "./frontend-runtime.js";
import { createEjsRuntime } from "./ejs-runtime.js";
import { applySplitMvuPatchCompatibility, hasSplitMvuContract, splitMvuActivationForPhase } from "./split-mvu.js";
import { compatibilityCallCatalog, describeCompatibilityCall } from "./compatibility-call-runtime.js";
import { defaultMvuSessionSettings, normalizeMvuSessionSettings, replayMvuReplies, resolveMvuExtraModel, supportsExtraModelParsing, type MvuSessionSettings } from "./mvu-session-control.js";
import { personaBindingKey, personaBindingKeysToClearForSelection, renderPersonaPrompt, resolvePersona, validatePersonaDraft, type PersonaBindingRecord, type PersonaBindingScope, type PersonaRecord } from "./persona-runtime.js";
import { applyTavernHelperGenerateInjections, generateScanText, normalizeTavernHelperGenerateConfig } from "./auxiliary-generation.js";
import { hideCardFromLibrary, orderVisibleCards, preserveCardLibraryMetadata, reorderVisibleCards, restoreCardToLibrary, type CardLibraryRecord } from "./card-library.js";

export const name = "dsh-re3-rp";
export const inject = ["webServer", "sessions", "sessionPersistence", "storageDomain", "agents", "agentDefaultModel", "llm"];

type RecordValue = Record<string, unknown>;
type Binding = {
  sessionId: string;
  revisionId: string;
  openingId: string;
  openingDigest: string;
  userName: string;
  provider: string;
  model: string;
  presetId?: string;
  createdAt: string;
  normalizedIndexVersion: number;
  worldbookState?: import("./worldbook.js").WorldbookRuntimeState;
  worldInfoMaxRecursionSteps?: number;
  worldbookEnabledOverrides?: Record<string, boolean>;
  frontendStorage?: Record<string, string>;
  lastAssemblyId?: string;
  lastActiveEntryIds?: string[];
  mvuSettings?: MvuSessionSettings;
  splitMvu?: {
    enabled: true;
    provider: string;
    model: string;
    status: "ready" | "running" | "committed" | "failed";
    updatedAt: string;
    error?: string;
  };
};

const recordSchema = z.record(z.string(), z.unknown());
const domainSpec = defineDomain({
  name: "dsh_re3_rp",
  version: 1,
  tables: {
    cards: domainTable(recordSchema),
    bindings: domainTable(recordSchema),
    traces: domainTable(recordSchema),
  },
});

const variableDomainSpec = defineDomain({
  name: "dsh_re3_rp_variables",
  version: 1,
  tables: {
    states: domainTable(recordSchema),
    events: domainTable(recordSchema),
  },
});

const frontendDomainSpec = defineDomain({
  name: "dsh_re3_rp_frontend",
  version: 1,
  tables: {
    states: domainTable(recordSchema),
    events: domainTable(recordSchema),
    receipts: domainTable(recordSchema),
    assets: domainTable(recordSchema),
  },
});

const personaDomainSpec = defineDomain({
  name: "dsh_re3_rp_personas",
  version: 1,
  tables: {
    personas: domainTable(recordSchema),
    bindings: domainTable(recordSchema),
  },
});

const presetDomainSpec = defineDomain({
  name: "dsh_re3_rp_presets",
  version: 1,
  tables: {
    presets: domainTable(recordSchema),
    settings: domainTable(recordSchema),
  },
});

type VariableStateRecord = {
  sessionId: string;
  revisionId: string;
  selectedOpeningId: string;
  state: VariableObject;
  digest: string;
  initialSnapshots: Record<string, { state: VariableObject; digest: string; status: "initialized" | "failed" }>;
  eventSequence: number;
  updatedAt: string;
  lastCommittedStateBefore?: VariableObject;
  lastCommittedReplyDigest?: string;
};

type FrontendStateRecord = {
  sessionId: string;
  revisionId: string;
  cardId: string;
  contentDigest: string;
  caseId: string;
  state: RecordValue;
  stateDigest: string;
  eventSequence: number;
  updatedAt: string;
};

type BridgeFailure = Error & { code?: string };

function jsonBody(res: any, status: number, value: unknown): void {
  const body = JSON.stringify(value);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Length": new TextEncoder().encode(body).byteLength,
  });
  res.end(body);
}

async function readBody(req: any, maximum = 512 * 1024 * 1024): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  let length = 0;
  for await (const chunk of req) {
    const bytes = typeof chunk === "string" ? new TextEncoder().encode(chunk) : chunk as Uint8Array;
    length += bytes.byteLength;
    if (length > maximum) throw new Error("单个原件超过 512 MiB 安全边界");
    chunks.push(bytes);
  }
  const result = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength; }
  return result;
}

async function readJson(req: any, maximum = 256 * 1024): Promise<RecordValue> {
  const value = JSON.parse(new TextDecoder().decode(await readBody(req, maximum))) as unknown;
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("请求 JSON 必须是对象");
  return value as RecordValue;
}

function messageText(message: any): string {
  if (typeof message?.content === "string") return message.content;
  if (!Array.isArray(message?.content)) return "";
  return message.content.filter((part: any) => part?.type === "text" && typeof part.text === "string").map((part: any) => part.text).join("\n");
}

function sessionTexts(session: any): string[] {
  const events = session?.surface?.nodes?.map((seq: number) => session.events?.[seq]) ?? [];
  return events.flatMap((event: any) => {
    if (event?.type !== "user/message" && event?.type !== "assistant/message") return [];
    const message = event.data?.message ?? event.data;
    if (message?.source?.kind === "plugin" && message.source.plugin === "dsh-re3-rp") return [];
    const value = messageText(message);
    return value.length === 0 ? [] : [value];
  }) ?? [];
}

function cardPrompt(card: NormalizedCard, userName: string, personaDescription = ""): string {
  const values = { userName, characterName: card.title };
  return [card.systemPrompt, `你正在扮演 ${card.title}。`, renderPersonaPrompt(userName, personaDescription), card.description, card.personality, card.scenario, card.messageExample, card.postHistoryInstructions]
    .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
    .map((part) => substituteCardMacros(part, values))
    .join("\n\n");
}

function literalMacroVariables(card: NormalizedCard): Map<string, string> {
  const variables = new Map<string, string>();
  const texts = [card.systemPrompt, card.description, card.personality, card.scenario, card.messageExample, card.postHistoryInstructions, ...card.worldbook.map((entry) => entry.content)];
  for (const text of texts) {
    if (typeof text !== "string") continue;
    for (const match of text.matchAll(/\{\{[^{}]+\}\}/gu)) {
      const token = match[0];
      if (/^\{\{(?:user|char)\}\}$/iu.test(token) || variables.has(token)) continue;
      variables.set(token, `dsh_re3_rp_literal_${variables.size}`);
    }
  }
  return variables;
}

function protectLiteralMacros(text: string, variables: ReadonlyMap<string, string>): string {
  let protectedText = text;
  for (const [token, variable] of variables) protectedText = protectedText.split(token).join(`{{${variable}}}`);
  return protectedText;
}

function publicCard(card: NormalizedCard, bindings: readonly Binding[], sessionLookup?: (sessionId: string) => any): RecordValue {
  const visibleMessageCount = (sessionId: string): number => {
    const session = sessionLookup?.(sessionId);
    const events = session?.surface?.nodes?.map((seq: number) => session.events[seq]) ?? [];
    return events.filter((event: any) => {
      if (event?.type === "assistant/message") return true;
      if (event?.type !== "user/message") return false;
      const message = event.data?.message ?? event.data;
      return message?.source?.kind !== "plugin";
    }).length || 1;
  };
  return {
    revisionId: card.revisionId,
    sourceName: card.sourceName,
    sourceFormat: card.sourceFormat,
    title: card.title,
    creator: card.creator,
    summary: (card.description || card.scenario).replace(/\s+/gu, " ").trim().slice(0, 160),
    playability: card.playability,
    statusText: card.statusText,
    statusDetail: card.statusDetail,
    worldbookEntryCount: card.worldbook.length,
    openings: card.openings.map((opening) => ({ id: opening.id, label: opening.label, preview: opening.message.trim().length === 0 ? "（原件中的空白开场）" : opening.message.replace(/\s+/gu, " ").trim().slice(0, 100) })),
    compatibilityRows: card.compatibilityRows,
    sessions: bindings.filter((binding) => binding.revisionId === card.revisionId).map((binding) => ({
      id: binding.sessionId,
      sessionId: binding.sessionId,
      title: card.openings.find((opening) => opening.id === binding.openingId)?.label ?? "卡片会话",
      messageCount: visibleMessageCount(binding.sessionId),
      lastActive: binding.createdAt,
      openingId: binding.openingId,
    })),
    originalUrl: `/dsh-re3-rp/original?revision=${card.revisionId}`,
  };
}

function publicCardDetail(card: NormalizedCard, bindings: readonly Binding[], worldbookEnabledOverrides: Record<string, boolean> = {}): RecordValue {
  return {
    revisionId: card.revisionId,
    sourceName: card.sourceName,
    sourceFormat: card.sourceFormat,
    importedAt: card.importedAt,
    title: card.title,
    creator: card.creator,
    creatorNotes: card.creatorNotes ?? "",
    tags: card.tags ?? [],
    characterVersion: card.characterVersion ?? "",
    description: card.description,
    personality: card.personality,
    scenario: card.scenario,
    systemPrompt: card.systemPrompt,
    postHistoryInstructions: card.postHistoryInstructions,
    messageExample: card.messageExample,
    openings: card.openings,
    worldbook: card.worldbook.map((entry) => ({
      ...entry,
      enabled: worldbookEnabledOverrides[entry.id] ?? entry.enabled,
      sourceEnabled: entry.enabled,
    })),
    runtime: {
      sessionCount: bindings.filter((binding) => binding.revisionId === card.revisionId).length,
      scriptCount: card.tavernHelperScripts.length,
      regexCount: card.messageRegexScripts.length,
      hasFrontend: card.frontendDefinition !== undefined,
      variableFormatCount: card.variableDefinition.initializationFormats.length + card.variableDefinition.updateFormats.length,
    },
    variableDefinition: {
      initializationFormats: card.variableDefinition.initializationFormats,
      updateFormats: card.variableDefinition.updateFormats,
      worldbookInitvarEntryIds: card.variableDefinition.worldbookInitvarEntryIds,
      openingInitvarIds: card.variableDefinition.openingInitvarIds,
    },
    messageRegexScripts: card.messageRegexScripts,
    tavernHelperScripts: card.tavernHelperScripts,
    frontendDefinition: card.frontendDefinition ?? null,
    compatibilityRows: card.compatibilityRows,
    unknownFields: card.unknownFields,
    playability: card.playability,
    statusText: card.statusText,
    statusDetail: card.statusDetail,
    originalUrl: `/dsh-re3-rp/original?revision=${card.revisionId}`,
  };
}

function replaceOpening(session: any, text: string): void {
  const target = currentOpeningSurfaceSeq(session);
  if (target === undefined) throw new Error("当前会话缺少可切换的开场消息");
  const message = {
    id: crypto.randomUUID(),
    role: "assistant",
    content: [{ type: "text", text }],
    source: { kind: "model", provider: "dsh-re3-rp", model: "character-card-opening" },
  };
  session.append("assistant/message", { turn: 1, step: 1, message }, {
    surfaceOp: { op: "replace", start: target, end: target },
    sourceEventSeqs: [target],
  });
}

export async function apply(ctx: any): Promise<() => Promise<void>> {
  const verificationInstanceId = crypto.randomUUID();
  const hostGlobal = globalThis as unknown as { process: { cwd(): string; env: Record<string, string | undefined>; getBuiltinModule(id: string): any } };
  const fs = hostGlobal.process.getBuiltinModule("node:fs") as any;
  const path = hostGlobal.process.getBuiltinModule("node:path") as any;
  const zlib = hostGlobal.process.getBuiltinModule("node:zlib") as any;
  // QuickJS is initialized before the plugin advertises its client surface.
  // If the isolated renderer cannot load, the plugin fails closed instead of
  // claiming EJS compatibility while passing templates through to the model.
  const ejsRuntime = await createEjsRuntime();
  try {
  const dshHome = hostGlobal.process.env.DSH_HOME;
  if (typeof dshHome !== "string" || dshHome.length === 0) throw new Error("dsh-re3-rp 需要隔离的 DSH_HOME");
  const blobRoot = path.join(dshHome, "dsh-re3-rp", "blobs");
  const frontendAssetRoot = path.join(dshHome, "dsh-re3-rp", "frontend-assets");
  fs.mkdirSync(blobRoot, { recursive: true });
  fs.mkdirSync(frontendAssetRoot, { recursive: true });

  const domain = await ctx.storageDomain.open(domainSpec);
  const variableDomain = await ctx.storageDomain.open(variableDomainSpec);
  const frontendDomain = await ctx.storageDomain.open(frontendDomainSpec);
  const personaDomain = await ctx.storageDomain.open(personaDomainSpec);
  const presetDomain = await ctx.storageDomain.open(presetDomainSpec);
  const cards = domain.table("cards");
  const bindings = domain.table("bindings");
  const traces = domain.table("traces");
  const variableStates = variableDomain.table("states");
  const variableEvents = variableDomain.table("events");
  const frontendStates = frontendDomain.table("states");
  const frontendEvents = frontendDomain.table("events");
  const frontendReceipts = frontendDomain.table("receipts");
  const frontendAssets = frontendDomain.table("assets");
  const personas = personaDomain.table("personas");
  const personaBindings = personaDomain.table("bindings");
  const storedPresets = presetDomain.table("presets");
  const presetSettings = presetDomain.table("settings");

  const presetFor = (presetId: string | undefined): TavernPromptPreset => {
    if (presetId === undefined || presetId.length === 0 || presetId === DEFAULT_TAVERN_PRESET.id) return DEFAULT_TAVERN_PRESET;
    const value = storedPresets.get(presetId) as RecordValue | undefined;
    if (value === undefined) return DEFAULT_TAVERN_PRESET;
    return normalizeTavernPreset(value, {
      id: presetId,
      source: value.source === "created" ? "created" : "imported",
      now: typeof value.updatedAt === "string" ? value.updatedAt : undefined,
    });
  };
  const allPresets = (): TavernPromptPreset[] => [
    DEFAULT_TAVERN_PRESET,
    ...Array.from(storedPresets.entries() as IterableIterator<[string, RecordValue]>).map(([id, value]) => presetFor(id)).filter((preset) => preset.id !== DEFAULT_TAVERN_PRESET.id),
  ];
  const activePresetId = (): string => {
    const value = presetSettings.get("active") as RecordValue | undefined;
    const requested = typeof value?.presetId === "string" ? value.presetId : DEFAULT_TAVERN_PRESET.id;
    return presetFor(requested).id;
  };
  const bindingPreset = (binding: Binding): TavernPromptPreset => presetFor(binding.presetId ?? DEFAULT_TAVERN_PRESET.id);
  const uniquePresetName = (requested: string, exceptId = ""): string => {
    const base = requested.trim() || "未命名预设";
    const occupied = new Set(allPresets().filter((preset) => preset.id !== exceptId).map((preset) => preset.name.toLocaleLowerCase("zh-CN")));
    if (!occupied.has(base.toLocaleLowerCase("zh-CN"))) return base;
    for (let suffix = 2; suffix < 10_000; suffix += 1) {
      const candidate = `${base} ${suffix}`;
      if (!occupied.has(candidate.toLocaleLowerCase("zh-CN"))) return candidate;
    }
    return `${base} ${crypto.randomUUID().slice(0, 8)}`;
  };
  const presetState = (sessionId = ""): RecordValue => {
    const binding = sessionId.length === 0 ? undefined : bindings.get(sessionId) as unknown as Binding | undefined;
    const sessionPreset = binding === undefined ? undefined : bindingPreset(binding);
    return {
      ok: true,
      activePresetId: activePresetId(),
      sessionId: binding?.sessionId ?? null,
      sessionPresetId: sessionPreset?.id ?? null,
      presets: allPresets(),
      runtimeSupport: {
        promptOrder: "applied",
        contextBudget: "dsh-estimated-truncation",
        maxReplyTokens: "provider-request",
        temperature: "provider-request",
        stream: "always-on",
        topP: "round-trip-only",
        frequencyPenalty: "round-trip-only",
        presencePenalty: "round-trip-only",
      },
    };
  };

  // A card revision is immutable, but its derived executable index is not. Rebuild
  // old indexes from the byte-identical original so parser fixes also apply after a
  // real DSH restart; sessions continue to bind the same revision SHA-256.
  for (const [revisionId, storedValue] of Array.from(cards.entries()) as Array<[string, RecordValue]>) {
    const storedCard = storedValue as unknown as NormalizedCard;
    if (storedCard.normalizedIndexVersion === NORMALIZED_CARD_INDEX_VERSION) continue;
    const blobPath = path.join(blobRoot, revisionId);
    if (!fs.existsSync(blobPath)) continue;
    const reparsed = await parseCard(
      new Uint8Array(fs.readFileSync(blobPath)),
      storedCard.sourceName || `${revisionId}.png`,
      (input) => new Uint8Array(zlib.inflateSync(input)),
    );
    if (reparsed.revisionId !== revisionId) throw new Error(`角色卡原件摘要不匹配：${revisionId}`);
    await cards.put(revisionId, preserveCardLibraryMetadata(reparsed as unknown as CardLibraryRecord, storedValue as CardLibraryRecord) as RecordValue);
  }

  const handles = new Map<string, any>();
  const latestActivations = new Map<string, { activation: WorldbookActivation; placement: ReturnType<typeof placeWorldbook> }>();
  const latestAssemblies = new Map<string, { assemblyId: string; activeEntryIds: string[]; compiled: CompiledTavernPrompt }>();
  const pendingAssemblies = new Map<string, {
    summary: TavernAssemblySummary;
    assemblySeq: number;
    compiled: CompiledTavernPrompt;
    activation: WorldbookActivation;
    updateCompiled?: CompiledTavernPrompt;
    ejsDiagnostics: Array<{ source: "card" | "worldbook"; id: string; code: string; message: string }>;
  }>();
  const variableReplyGate = new CommittedReplyVariableGate();
  const pendingBridgeOperations = new Map<string, Promise<RecordValue>>();
  const pendingOpeningSelections = new Map<string, Promise<unknown>>();
  const activeAuxiliaryGenerations = new Map<string, AbortController>();
  const compiledRequestReentryGuards = new WeakSet<object>();
  const splitMvuRequestGuards = new WeakSet<object>();
  const disposers: Array<() => void> = [];

  const allBindings = (): Binding[] => Array.from(bindings.entries(), ([, value]: [string, RecordValue]) => value as unknown as Binding);
  const personaMap = (): Map<string, PersonaRecord> => new Map(Array.from(personas.entries(), ([key, value]: [string, RecordValue]) => [key, value as unknown as PersonaRecord]));
  const personaBindingMap = (): Map<string, PersonaBindingRecord> => new Map(Array.from(personaBindings.entries(), ([key, value]: [string, RecordValue]) => [key, value as unknown as PersonaBindingRecord]));
  const resolvedPersona = (context: { revisionId?: string; sessionId?: string }) => resolvePersona(personaMap(), personaBindingMap(), context);
  const activePersona = (binding: Binding) => resolvedPersona({ revisionId: binding.revisionId, sessionId: binding.sessionId });
  const effectiveUserName = (binding: Binding): string => activePersona(binding)?.persona.displayName ?? binding.userName;
  const cardFor = (revisionId: string): NormalizedCard | undefined => {
    const card = cards.get(revisionId) as unknown as NormalizedCard | undefined;
    if (card === undefined) return undefined;
    const worldbook = (card.worldbook ?? []).map((entry, index) => normalizeWorldbookEntry(entry, index));
    const fallbackDefinition = {
      character: {},
      scripts: [],
      worldbookInitvarEntryIds: worldbook.filter((entry) => /\[initvar\]/iu.test(entry.comment)).map((entry) => entry.id),
      openingInitvarIds: card.openings.filter((opening) => /<initvar\b/iu.test(opening.message)).map((opening) => opening.id),
      initializationFormats: [],
      updateFormats: [],
      unknownFormats: [],
    };
    return { ...card, worldbook, variableDefinition: card.variableDefinition ?? fallbackDefinition, tavernHelperScripts: card.tavernHelperScripts ?? [] };
  };
  const personaLibraryState = (context: { revisionId?: string; sessionId?: string }): RecordValue => {
    const records = Array.from(personaMap().values()).sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id));
    const bindingRecords = personaBindingMap();
    const directBinding = (scope: PersonaBindingScope, targetId = ""): PersonaBindingRecord | null => bindingRecords.get(personaBindingKey(scope, targetId)) ?? null;
    const effective = resolvePersona(new Map(records.map((persona) => [persona.id, persona])), bindingRecords, context);
    return {
      ok: true,
      personas: records,
      context,
      bindings: {
        global: directBinding("global"),
        card: context.revisionId === undefined || context.revisionId.length === 0 ? null : directBinding("card", context.revisionId),
        session: context.sessionId === undefined || context.sessionId.length === 0 ? null : directBinding("session", context.sessionId),
      },
      effective: effective === null ? null : {
        personaId: effective.persona.id,
        scope: effective.binding.scope,
        targetId: effective.binding.targetId,
      },
    };
  };

  const runtimeText = (relativePath: string): string => fs.readFileSync(new URL(`../runtime-assets/${relativePath}`, import.meta.url), "utf8").replace(/\r\n/gu, "\n");
  const runtimeAsset = (relativePath: string): Uint8Array => new TextEncoder().encode(runtimeText(relativePath));
  const standaloneCore = runtimeText("standalone/core.js");
  const standaloneStyle = runtimeText("standalone/style.css");
  const standaloneIndex = runtimeText("standalone/index.html");
  const requiredAssetIndex = runtimeText("required/index.html");
  const requiredWeatherAsset = runtimeAsset("required/weather-flags.json");

  const initializeFrontend = async (sessionId: string, card: NormalizedCard): Promise<FrontendStateRecord | undefined> => {
    const definition = card.frontendDefinition;
    if (definition === undefined) return undefined;
    const state = initialFrontendState(definition.caseId);
    const record: FrontendStateRecord = {
      sessionId,
      revisionId: card.revisionId,
      cardId: definition.cardId,
      contentDigest: card.revisionId,
      caseId: definition.caseId,
      state,
      stateDigest: frontendStateDigest(definition.caseId, state),
      eventSequence: 0,
      updatedAt: new Date().toISOString(),
    };
    await frontendStates.put(sessionId, record as unknown as RecordValue);
    return record;
  };

  const appendFrontendEvent = async (record: FrontendStateRecord, type: string, operationId: string, detail: RecordValue = {}): Promise<RecordValue> => {
    const sequence = record.eventSequence;
    record.eventSequence += 1;
    record.updatedAt = new Date().toISOString();
    const event = { sessionId: record.sessionId, revisionId: record.revisionId, sequence, type, operationId, capturedAt: record.updatedAt, ...detail };
    await frontendEvents.put(`${record.sessionId}:${String(sequence).padStart(8, "0")}`, event);
    await frontendStates.put(record.sessionId, record as unknown as RecordValue);
    return event;
  };

  const frontendContext = (sessionId: string, requiredCapability?: string): { binding: Binding; card: NormalizedCard; definition: FrontendDefinition; record: FrontendStateRecord; session: any } => {
    const binding = bindings.get(sessionId) as unknown as Binding | undefined;
    const card = binding === undefined ? undefined : cardFor(binding.revisionId);
    const definition = card?.frontendDefinition;
    const record = frontendStates.get(sessionId) as unknown as FrontendStateRecord | undefined;
    const session = ctx.sessions.get(sessionId);
    if (binding === undefined || card === undefined || definition === undefined || record === undefined || session === undefined) {
      throw bridgeFailure("bridge_unavailable", "找不到已绑定的卡内前端 Session");
    }
    if (requiredCapability !== undefined && !bridgeCapabilities(definition).includes(requiredCapability)) {
      throw bridgeFailure("capability_denied", `当前前端没有 ${requiredCapability} 权限`);
    }
    return { binding, card, definition, record, session };
  };

  const cardBridgeContext = (sessionId: string): { binding: Binding; card: NormalizedCard; variables: VariableStateRecord; session: any } => {
    const binding = bindings.get(sessionId) as unknown as Binding | undefined;
    const card = binding === undefined ? undefined : cardFor(binding.revisionId);
    const variables = variableStates.get(sessionId) as unknown as VariableStateRecord | undefined;
    const session = ctx.sessions.get(sessionId);
    if (binding === undefined || card === undefined || variables === undefined || session === undefined) {
      throw bridgeFailure("bridge_unavailable", "找不到已绑定的真实酒馆卡 Session");
    }
    return { binding, card, variables, session };
  };

  const openingState = (binding: Binding, card: NormalizedCard, session: any): RecordValue => {
    const currentIndex = Math.max(0, card.openings.findIndex((opening) => opening.id === binding.openingId));
    return {
      ok: true,
      sessionId: binding.sessionId,
      revisionId: binding.revisionId,
      openingId: binding.openingId,
      currentIndex,
      currentMessage: substituteCardMacros(card.openings[currentIndex]?.message ?? "", { userName: effectiveUserName(binding), characterName: card.title }),
      locked: hasPlayerMessage(session.events),
      openings: card.openings.map((opening, index) => ({
        id: opening.id,
        index,
        label: opening.label,
        preview: opening.message.replace(/\s+/gu, " ").trim().slice(0, 120) || "（空白开场）",
      })),
    };
  };

  const openingIntentKey = (sessionId: string): string => `opening-intent:${sessionId}`;

  const commitSessionOpening = async (sessionId: string, openingId: string): Promise<RecordValue> => {
    const { binding, card, variables, session } = cardBridgeContext(sessionId);
    if (hasPlayerMessage(session.events)) throw bridgeFailure("opening_locked", "第一句玩家消息已经发出，开场已锁定");
    const opening = card.openings.find((candidate) => candidate.id === openingId);
    if (opening === undefined) throw bridgeFailure("invalid_action", "找不到这个备选开场");
    const renderedOpening = substituteCardMacros(opening.message, { userName: effectiveUserName(binding), characterName: card.title });
    if (currentOpeningText(session) !== renderedOpening) replaceOpening(session, renderedOpening);
    binding.openingId = opening.id;
    binding.openingDigest = await sha256(new TextEncoder().encode(renderedOpening));
    await selectOpeningVariables(variables, opening.id);
    await bindings.put(sessionId, binding as unknown as RecordValue);
    // Flush even if the live surface already matches: a prior attempt may have
    // persisted binding/variables and then failed before Session persistence.
    await ctx.sessions.flush(session);
    return openingState(binding, card, session);
  };

  const putOpeningReceipt = async (sessionId: string, operationId: unknown, state: RecordValue): Promise<void> => {
    if (typeof operationId !== "string") return;
    await frontendReceipts.put(`${sessionId}:${operationId}`, {
      ok: true,
      committed: true,
      operationId,
      openingId: state.openingId,
      currentIndex: state.currentIndex,
    });
  };

  const performSessionOpeningSelection = async (sessionId: string, openingId: string, operationId?: string): Promise<RecordValue> => {
    const { card, session } = cardBridgeContext(sessionId);
    if (hasPlayerMessage(session.events)) throw bridgeFailure("opening_locked", "第一句玩家消息已经发出，开场已锁定");
    if (!card.openings.some((opening) => opening.id === openingId)) throw bridgeFailure("invalid_action", "找不到这个备选开场");
    const intentKey = openingIntentKey(sessionId);
    await frontendReceipts.put(intentKey, { kind: "opening_selection_intent", sessionId, openingId, ...(operationId === undefined ? {} : { operationId }), createdAt: new Date().toISOString() });
    try {
      const state = await commitSessionOpening(sessionId, openingId);
      await putOpeningReceipt(sessionId, operationId, state);
      await frontendReceipts.delete(intentKey);
      return state;
    } catch (error) {
      const code = (error as BridgeFailure).code;
      if (code === "opening_locked" || code === "invalid_action") await frontendReceipts.delete(intentKey);
      throw error;
    }
  };

  const selectSessionOpening = async (sessionId: string, openingId: string, operationId?: string): Promise<RecordValue> => {
    const previous = pendingOpeningSelections.get(sessionId) ?? Promise.resolve();
    const operation = previous.catch(() => undefined).then(() => performSessionOpeningSelection(sessionId, openingId, operationId));
    pendingOpeningSelections.set(sessionId, operation);
    try {
      return await operation;
    } finally {
      if (pendingOpeningSelections.get(sessionId) === operation) pendingOpeningSelections.delete(sessionId);
    }
  };

  const compatibilityCallSequences = new Map<string, number>();
  const appendCompatibilityCall = async (sessionId: string, operationIdValue: unknown, payload: RecordValue): Promise<RecordValue> => {
    const { binding } = cardBridgeContext(sessionId);
    const operationId = requireOperationId(operationIdValue);
    const descriptor = describeCompatibilityCall(String(payload.surface ?? ""), String(payload.method ?? ""));
    if (descriptor === undefined) throw bridgeFailure("capability_denied", "未声明的酒馆兼容调用");
    const frontendRecord = frontendStates.get(sessionId) as unknown as FrontendStateRecord | undefined;
    if (frontendRecord !== undefined) {
      return appendFrontendEvent(frontendRecord, "compatibility_call_observed", operationId, descriptor as unknown as RecordValue);
    }
    const current = compatibilityCallSequences.get(sessionId) ?? Array.from(frontendEvents.entries() as IterableIterator<[string, RecordValue]>)
      .flatMap(([, event]) => event.sessionId === sessionId && typeof event.sequence === "number" ? [event.sequence] : [])
      .reduce((maximum, sequence) => Math.max(maximum, sequence + 1), 0);
    compatibilityCallSequences.set(sessionId, current + 1);
    const capturedAt = new Date().toISOString();
    const event = { sessionId, revisionId: binding.revisionId, sequence: current, type: "compatibility_call_observed", operationId, capturedAt, ...descriptor };
    await frontendEvents.put(`${sessionId}:${String(current).padStart(8, "0")}`, event);
    return event;
  };

  const frontendProjection = (sessionId: string): FrontendProjection => {
    const { binding, card, record, session } = frontendContext(sessionId);
    const variableState = variableStates.get(sessionId) as unknown as VariableStateRecord | undefined;
    return {
      sessionId,
      messages: projectFrontendMessages(session, card.messageRegexScripts, { userName: effectiveUserName(binding), characterName: card.title, messageVariables: variableState?.state, macroSeed: sessionId }),
      state: record.state,
      stateDigest: record.stateDigest,
      eventSequence: record.eventSequence,
    };
  };

  const hostedFrontendEntry = (sessionId: string, definition: FrontendDefinition): string | undefined => {
    if (definition.container === "standalone") return `/dsh-re3-rp/frontend-standalone/index.html?sessionId=${encodeURIComponent(sessionId)}`;
    if (definition.container === "required-asset") return `/dsh-re3-rp/frontend-required/index.html?sessionId=${encodeURIComponent(sessionId)}`;
    return undefined;
  };

  const requireOperationId = (value: unknown): string => {
    if (typeof value !== "string" || !/^[a-z0-9][a-z0-9._:-]{0,127}$/iu.test(value)) throw bridgeFailure("invalid_action", "operationId 必须是稳定的短标识");
    return value;
  };

  const generateAuxiliaryText = async (sessionId: string, operationIdValue: unknown, payload: RecordValue, requestSignal?: AbortSignal): Promise<RecordValue> => {
    const { binding, card, variables, session } = cardBridgeContext(sessionId);
    const operationId = requireOperationId(operationIdValue);
    const config = normalizeTavernHelperGenerateConfig(payload);
    const traceId = `tavern-helper-generate:${sessionId}:${operationId}`;
    const capturedAt = new Date().toISOString();
    const preset = bindingPreset(binding);
    const baseTrace: RecordValue = {
      traceId,
      kind: "tavern-helper-generation",
      operationId,
      sessionId,
      revisionId: binding.revisionId,
      capturedAt,
      provider: binding.provider,
      model: binding.model,
      presetId: preset.id,
      presetRevision: preset.revision,
      requestedStreaming: config.shouldStream,
      injectionCount: config.injects.length,
      injectionRoles: config.injects.map((item) => item.role),
      injectionLengths: config.injects.map((item) => item.content.length),
      status: "running",
    };
    await traces.put(traceId, baseTrace);
    const abortController = new AbortController();
    const activeKey = `${sessionId}:${operationId}`;
    if (activeAuxiliaryGenerations.has(activeKey)) throw bridgeFailure("invalid_action", "同一 operationId 的辅助生成仍在运行");
    activeAuxiliaryGenerations.set(activeKey, abortController);
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; abortController.abort(); }, config.timeoutMs);
    const abortFromRequest = (): void => abortController.abort();
    if (requestSignal?.aborted) abortController.abort();
    else requestSignal?.addEventListener("abort", abortFromRequest, { once: true });
    try {
      const chat = normalizeTavernChatMessages(typeof session.deriveMessages === "function" ? session.deriveMessages() : []);
      const currentPersona = activePersona(binding)?.persona;
      const currentUserName = currentPersona?.displayName ?? binding.userName;
      const personaDescription = currentPersona?.content ?? "";
      const ejsVariables = variables.state ?? {};
      const messageId = Math.max(-1, chat.length - 1);
      const ejsDiagnostics: Array<{ source: "card" | "worldbook"; id: string; code: string; message: string }> = [];
      let ejsSourceCount = 0;
      let ejsInputBytes = 0;
      let ejsOutputBytes = 0;
      const encoder = new TextEncoder();
      const renderEjsSource = async (source: string, sourceType: "card" | "worldbook", id: string): Promise<string | undefined> => {
        if (!/<%|%>/u.test(source)) return source;
        const sourceBytes = encoder.encode(source).byteLength;
        if (ejsSourceCount >= 128 || ejsInputBytes + sourceBytes > 2 * 1024 * 1024) {
          ejsDiagnostics.push({ source: sourceType, id, code: "ejs_round_limit", message: "辅助生成 EJS 输入超过安全边界" });
          return undefined;
        }
        ejsSourceCount += 1;
        ejsInputBytes += sourceBytes;
        try {
          const missingVariables: string[] = [];
          const rendered = (await ejsRuntime.render([source], ejsVariables, {
            messageId,
            seed: `${card.revisionId}:${sessionId}:${operationId}:${sourceType}:${id}`,
            missingVariables,
          }))[0]!;
          const outputBytes = encoder.encode(rendered).byteLength;
          if (ejsOutputBytes + outputBytes > 4 * 1024 * 1024) {
            ejsDiagnostics.push({ source: sourceType, id, code: "ejs_round_limit", message: "辅助生成 EJS 输出超过安全边界" });
            return undefined;
          }
          ejsOutputBytes += outputBytes;
          if (missingVariables.length > 0) ejsDiagnostics.push({ source: sourceType, id, code: "ejs_variable_unavailable", message: `缺少变量：${[...new Set(missingVariables)].join("、")}` });
          return rendered;
        } catch (error) {
          ejsDiagnostics.push({ source: sourceType, id, code: typeof (error as { code?: unknown })?.code === "string" ? (error as { code: string }).code : "ejs_render_failed", message: error instanceof Error ? error.message : String(error) });
          return undefined;
        }
      };
      const renderedCard = { ...card };
      for (const key of ["description", "personality", "scenario", "messageExample", "systemPrompt", "postHistoryInstructions"] as const) {
        const rendered = await renderEjsSource(card[key], "card", key);
        if (rendered === undefined) throw Object.assign(new Error(`辅助生成的 EJS 顶层角色字段 ${key} 渲染失败`), { code: "ejs_render_failed" });
        renderedCard[key] = rendered;
      }
      const executableWorldbook = card.worldbook.map((entry) => binding.worldbookEnabledOverrides?.[entry.id] === undefined ? entry : { ...entry, enabled: binding.worldbookEnabledOverrides[entry.id] === true });
      const resolved = await activateWorldbookWithRenderer(
        executableWorldbook,
        generateScanText(chat, config),
        sessionId,
        { messageCount: chat.length, runtimeState: binding.worldbookState, maxRecursionSteps: binding.worldInfoMaxRecursionSteps },
        (entry) => /<%|%>/u.test(entry.content),
        async (entry) => renderEjsSource(entry.content, "worldbook", entry.id),
      );
      let compiled = compileTavernPrompt({ card: renderedCard, userName: currentUserName, personaDescription, chat, activation: resolved.activation, messageVariables: variables.state, macroSeed: `${sessionId}:${operationId}`, preset });
      compiled = applyTavernHelperGenerateInjections(compiled, config);
      const visibleText = compiled.messages.map((message) => message.content).join("\n");
      if (/<%|%>/u.test(visibleText)) throw Object.assign(new Error("辅助生成请求仍含未解析 EJS，已阻止发送"), { code: "ejs_unresolved" });
      binding.worldbookState = resolved.activation.runtimeState;
      await bindings.put(sessionId, binding as unknown as RecordValue);
      const options: any = { provider: binding.provider, model: binding.model, system: "", messages: [], tools: [], sessionId, purpose: "tavern-helper-generate", signal: abortController.signal };
      applyCompiledPromptToRequest(options, compiled);
      const requestText = JSON.stringify({ system: options.system, messages: options.messages });
      let body = "";
      let providerFailure = "";
      for await (const chunk of ctx.llm.stream(options)) {
        if (chunk?.type === "text-delta" && typeof chunk.text === "string") body += chunk.text;
        if (body.length > 4 * 1024 * 1024) throw Object.assign(new Error("辅助生成结果超过 4 MiB"), { code: "provider_error" });
        if (chunk?.type === "finish" && (chunk.reason?.kind === "error" || chunk.reason?.kind === "aborted")) providerFailure = typeof chunk.reason.failure?.message === "string" ? chunk.reason.failure.message : `辅助生成${chunk.reason.kind}`;
      }
      if (providerFailure.length > 0) throw Object.assign(new Error(providerFailure), { code: abortController.signal.aborted ? "generation_cancelled" : "provider_error" });
      if (abortController.signal.aborted) throw Object.assign(new Error(timedOut ? "辅助生成超时" : "辅助生成已取消"), { code: timedOut ? "generation_timeout" : "generation_cancelled" });
      await traces.put(traceId, {
        ...baseTrace,
        status: "completed",
        completedAt: new Date().toISOString(),
        requestDigest: await sha256(encoder.encode(requestText)),
        messageRoles: (options.messages ?? []).map((message: any) => message.role),
        messageLengths: (options.messages ?? []).map((message: any) => messageText(message).length),
        responseDigest: await sha256(encoder.encode(body)),
        responseLength: body.length,
        ejsDiagnostics,
      });
      return { text: body, operationId, traceId, status: "completed", streamed: false };
    } catch (error) {
      const requestedCode = typeof (error as { code?: unknown })?.code === "string" ? (error as { code: string }).code : "provider_error";
      const code = timedOut ? "generation_timeout" : abortController.signal.aborted && requestedCode === "provider_error" ? "generation_cancelled" : requestedCode;
      const message = error instanceof Error ? error.message : String(error);
      await traces.put(traceId, { ...baseTrace, status: code === "generation_timeout" ? "timeout" : code === "generation_cancelled" ? "cancelled" : "failed", completedAt: new Date().toISOString(), error: { code, message } });
      throw bridgeFailure(code, message);
    } finally {
      clearTimeout(timer);
      activeAuxiliaryGenerations.delete(activeKey);
      requestSignal?.removeEventListener("abort", abortFromRequest);
    }
  };

  const cancelAuxiliaryGeneration = (sessionId: string, operationIdValue: unknown): RecordValue => {
    cardBridgeContext(sessionId);
    const operationId = requireOperationId(operationIdValue);
    const controller = activeAuxiliaryGenerations.get(`${sessionId}:${operationId}`);
    if (controller === undefined) return { operationId, cancelled: false, status: "not_running" };
    controller.abort();
    return { operationId, cancelled: true, status: "cancelling" };
  };

  const missingRuntimeCriticalApis = (card: NormalizedCard): string[] => (card.requiredCriticalTavernHelperApis ?? []).filter((api) => {
    const match = /^TavernHelper\.(.+)$/u.exec(api);
    if (match === null || describeCompatibilityCall("TavernHelper", match[1]!) === undefined) return true;
    return match[1] === "generate" && typeof generateAuxiliaryText !== "function";
  });

  const storedReceipt = (sessionId: string, operationId: string): RecordValue | undefined => frontendReceipts.get(`${sessionId}:${operationId}`) as RecordValue | undefined;

  const selectOpeningFromChatMessages = async (sessionId: string, operationIdValue: unknown, payload: RecordValue): Promise<RecordValue> => {
    const operationId = requireOperationId(operationIdValue);
    const key = `${sessionId}:${operationId}`;
    const prior = storedReceipt(sessionId, operationId);
    if (prior !== undefined) return { ...prior, duplicate: true };
    const active = pendingBridgeOperations.get(key);
    if (active !== undefined) return active;
    const operation = (async (): Promise<RecordValue> => {
      const { card } = cardBridgeContext(sessionId);
      const openingId = openingIdFromSetChatMessages(payload.messages, card.openings);
      if (openingId === undefined) throw bridgeFailure("invalid_action", "setChatMessages 只允许切换首条 assistant 消息的现有开场 swipe");
      const state = await selectSessionOpening(sessionId, openingId, operationId);
      const receipt = storedReceipt(sessionId, operationId);
      if (receipt === undefined) throw bridgeFailure("state_commit_failed", "开场状态已提交但 operation receipt 缺失");
      return { ...receipt, state };
    })().finally(() => pendingBridgeOperations.delete(key));
    pendingBridgeOperations.set(key, operation);
    return operation;
  };

  const submitFrontendTurn = async (sessionId: string, operationIdValue: unknown, payload: RecordValue): Promise<RecordValue> => {
    const operationId = requireOperationId(operationIdValue);
    const key = `${sessionId}:${operationId}`;
    const prior = storedReceipt(sessionId, operationId);
    if (prior !== undefined) return { ...prior, duplicate: true, projection: frontendProjection(sessionId) };
    const active = pendingBridgeOperations.get(key);
    if (active !== undefined) return active;
    const operation = (async (): Promise<RecordValue> => {
      const { binding, card, record, session } = frontendContext(sessionId, "turn.submit");
      const projectionMacros = { userName: effectiveUserName(binding), characterName: card.title, messageVariables: (variableStates.get(sessionId) as unknown as VariableStateRecord | undefined)?.state, macroSeed: sessionId };
      const text = typeof payload.text === "string" ? payload.text.trim() : "";
      if (text.length === 0 || text.length > 20_000) throw bridgeFailure("invalid_action", "正式玩家动作不能为空或超过 20000 字符");
      const agent = ctx.agents.get(sessionId);
      if (agent === undefined) throw bridgeFailure("bridge_unavailable", "当前 DSH Session 尚未恢复 Host Agent");
      const before = projectFrontendMessages(session, card.messageRegexScripts, projectionMacros);
      agent.followup({ id: crypto.randomUUID(), role: "user", content: [{ type: "text", text }], source: { kind: "user" } });
      await agent.whenIdle();
      const committed = await waitForCommittedFrontendTurn({
        afterSeq: before.at(-1)?.seq ?? -1,
        userText: text,
        flush: () => ctx.sessions.flush(session),
        readMessages: () => projectFrontendMessages(session, card.messageRegexScripts, projectionMacros),
      });
      if (committed === undefined) throw bridgeFailure("state_commit_failed", "Host 没有提交完整的正式玩家消息与模型回复");
      const event = await appendFrontendEvent(record, "generation_committed", operationId, { committedUserSeq: committed.user.seq, committedSeq: committed.assistant.seq });
      const receipt = { ok: true, committed: true, operationId, committedSeq: committed.assistant.seq, eventSequence: event.sequence };
      await frontendReceipts.put(key, receipt);
      return { ...receipt, projection: frontendProjection(sessionId) };
    })().finally(() => pendingBridgeOperations.delete(key));
    pendingBridgeOperations.set(key, operation);
    return operation;
  };

  const submitCardTurn = async (sessionId: string, operationIdValue: unknown, payload: RecordValue): Promise<RecordValue> => {
    const operationId = requireOperationId(operationIdValue);
    const key = `${sessionId}:${operationId}`;
    const prior = storedReceipt(sessionId, operationId);
    if (prior !== undefined) return { ...prior, duplicate: true };
    const active = pendingBridgeOperations.get(key);
    if (active !== undefined) return active;
    const operation = (async (): Promise<RecordValue> => {
      const { binding, card, session } = cardBridgeContext(sessionId);
      const text = typeof payload.text === "string" ? payload.text.trim() : "";
      if (text.length === 0 || text.length > 20_000) throw bridgeFailure("invalid_action", "正式玩家动作不能为空或超过 20000 字符");
      const agent = ctx.agents.get(sessionId);
      if (agent === undefined) throw bridgeFailure("bridge_unavailable", "当前 DSH Session 尚未恢复 Host Agent");
      const macros = { userName: effectiveUserName(binding), characterName: card.title, messageVariables: cardBridgeContext(sessionId).variables.state, macroSeed: sessionId };
      const before = projectFrontendMessages(session, card.messageRegexScripts, macros);
      agent.followup({ id: crypto.randomUUID(), role: "user", content: [{ type: "text", text }], source: { kind: "user" } });
      await agent.whenIdle();
      const committed = await waitForCommittedFrontendTurn({
        afterSeq: before.at(-1)?.seq ?? -1,
        userText: text,
        flush: () => ctx.sessions.flush(session),
        readMessages: () => projectFrontendMessages(session, card.messageRegexScripts, macros),
      });
      if (committed === undefined) throw bridgeFailure("state_commit_failed", "Host 没有提交完整的正式玩家消息与模型回复");
      const receipt = { ok: true, committed: true, operationId, committedUserSeq: committed.user.seq, committedSeq: committed.assistant.seq };
      await frontendReceipts.put(key, receipt);
      return receipt;
    })().finally(() => pendingBridgeOperations.delete(key));
    pendingBridgeOperations.set(key, operation);
    return operation;
  };

  const cardStateProjection = (sessionId: string): RecordValue => {
    const { variables } = cardBridgeContext(sessionId);
    return { state: variables.state, stateDigest: variables.digest, eventSequence: variables.eventSequence };
  };

  const replaceCardState = async (sessionId: string, operationIdValue: unknown, payload: RecordValue): Promise<RecordValue> => {
    const operationId = requireOperationId(operationIdValue);
    const key = `${sessionId}:${operationId}`;
    const prior = storedReceipt(sessionId, operationId);
    if (prior !== undefined) return { ...prior, duplicate: true, ...cardStateProjection(sessionId) };
    if (typeof payload.state !== "object" || payload.state === null || Array.isArray(payload.state)) throw bridgeFailure("invalid_action", "卡内变量必须是 JSON 对象");
    const { variables } = cardBridgeContext(sessionId);
    const nextState = mergeVariableScopes({ character: payload.state as VariableObject });
    const previousDigest = variables.digest;
    variables.state = nextState;
    variables.digest = await variableStateDigest(nextState);
    variables.updatedAt = new Date().toISOString();
    const sequence = variables.eventSequence;
    variables.eventSequence += 1;
    await variableEvents.put(`${sessionId}:${String(sequence).padStart(8, "0")}`, {
      sessionId,
      revisionId: variables.revisionId,
      sequence,
      capturedAt: variables.updatedAt,
      type: "VARIABLE_FRONTEND_REPLACED",
      phase: "card_frontend",
      operationId,
      stateDigestBefore: previousDigest,
      stateDigestAfter: variables.digest,
    });
    await variableStates.put(sessionId, variables as unknown as RecordValue);
    const receipt = { ok: true, committed: true, operationId, stateDigest: variables.digest, eventSequence: sequence };
    await frontendReceipts.put(key, receipt);
    return { ...receipt, state: variables.state };
  };

  const compatibleWorldbook = (sessionId: string): RecordValue[] => {
    const { binding, card } = cardBridgeContext(sessionId);
    return card.worldbook.map((entry) => ({
      id: entry.id,
      uid: /^\d+$/u.test(entry.id) ? Number(entry.id) : entry.id,
      name: entry.comment,
      comment: entry.comment,
      content: entry.content,
      enabled: binding.worldbookEnabledOverrides?.[entry.id] ?? entry.enabled,
      position: { order: entry.order, type: entry.position, depth: entry.depth, role: entry.role },
      strategy: { keys: entry.keys, keys_secondary: entry.secondaryKeys },
      constant: entry.constant,
      selective: entry.selective,
    }));
  };

  const updateCardWorldbook = async (sessionId: string, operationIdValue: unknown, payload: RecordValue): Promise<RecordValue> => {
    const operationId = requireOperationId(operationIdValue);
    const key = `${sessionId}:${operationId}`;
    const prior = storedReceipt(sessionId, operationId);
    if (prior !== undefined) return { ...prior, duplicate: true };
    const updates = Array.isArray(payload.updates) ? payload.updates : [];
    if (updates.length > 4_000) throw bridgeFailure("invalid_action", "单次世界书更新条目过多");
    const { binding, card } = cardBridgeContext(sessionId);
    const byId = new Map(card.worldbook.map((entry) => [entry.id, entry]));
    const byName = new Map(card.worldbook.map((entry) => [entry.comment, entry]));
    const overrides = { ...(binding.worldbookEnabledOverrides ?? {}) };
    let changed = 0;
    for (const value of updates) {
      if (typeof value !== "object" || value === null || Array.isArray(value)) continue;
      const update = value as RecordValue;
      const entry = (typeof update.id === "string" ? byId.get(update.id) : undefined) ?? (typeof update.name === "string" ? byName.get(update.name) : undefined);
      if (entry === undefined || typeof update.enabled !== "boolean") continue;
      if ((overrides[entry.id] ?? entry.enabled) !== update.enabled) changed += 1;
      overrides[entry.id] = update.enabled;
    }
    binding.worldbookEnabledOverrides = overrides;
    await bindings.put(sessionId, binding as unknown as RecordValue);
    const receipt = { ok: true, committed: true, operationId, changed };
    await frontendReceipts.put(key, receipt);
    return receipt;
  };

  const replaceCardStorage = async (sessionId: string, payload: RecordValue): Promise<RecordValue> => {
    const { binding } = cardBridgeContext(sessionId);
    if (typeof payload.entries !== "object" || payload.entries === null || Array.isArray(payload.entries)) throw bridgeFailure("invalid_action", "卡片存储必须是字符串键值对象");
    const entries: Record<string, string> = {};
    for (const [key, value] of Object.entries(payload.entries as RecordValue)) {
      if (Object.keys(entries).length >= 512 || key.length > 256 || typeof value !== "string") throw bridgeFailure("invalid_action", "卡片存储键值无效或数量过多");
      entries[key] = value;
    }
    if (new TextEncoder().encode(JSON.stringify(entries)).byteLength > 1_048_576) throw bridgeFailure("invalid_action", "卡片存储超过 1 MiB");
    binding.frontendStorage = entries;
    await bindings.put(sessionId, binding as unknown as RecordValue);
    return { ok: true, committed: true, entries: binding.frontendStorage };
  };

  const submitFrontendStateAction = async (sessionId: string, operationIdValue: unknown, payload: RecordValue): Promise<RecordValue> => {
    const operationId = requireOperationId(operationIdValue);
    const key = `${sessionId}:${operationId}`;
    const prior = storedReceipt(sessionId, operationId);
    if (prior !== undefined) return { ...prior, duplicate: true, projection: frontendProjection(sessionId) };
    const { definition, record } = frontendContext(sessionId, "state.submit");
    const nextState = applyFrontendStateAction(definition.caseId, record.state, payload);
    record.state = nextState;
    record.stateDigest = frontendStateDigest(definition.caseId, nextState);
    const event = await appendFrontendEvent(record, "state_committed", operationId, { stateDigest: record.stateDigest, action: payload.action });
    const receipt = { ok: true, committed: true, operationId, eventSequence: event.sequence, stateDigest: record.stateDigest };
    await frontendReceipts.put(key, receipt);
    return { ...receipt, projection: frontendProjection(sessionId) };
  };

  const resolveFrontendAsset = async (sessionId: string, payload: RecordValue): Promise<RecordValue> => {
    const { definition, record } = frontendContext(sessionId, "asset.resolve");
    if (definition.caseId !== "required-remote-asset" || payload.assetId !== "weather-flags") throw bridgeFailure("capability_denied", "当前卡没有这个 required 资源");
    const scenario = typeof payload.scenario === "string" ? payload.scenario : "normal";
    if (scenario === "missing") throw bridgeFailure("asset_unavailable", "required 资源不存在");
    const expectedDigest = await sha256(requiredWeatherAsset);
    const candidate = scenario === "digest-mismatch" ? new TextEncoder().encode(`${new TextDecoder().decode(requiredWeatherAsset)}\n`) : requiredWeatherAsset;
    const actualDigest = await sha256(candidate);
    if (actualDigest !== expectedDigest) throw bridgeFailure("asset_digest_mismatch", `required 资源摘要不匹配：${actualDigest}`);
    const assetPath = path.join(frontendAssetRoot, expectedDigest);
    if (!fs.existsSync(assetPath)) {
      const temporary = `${assetPath}.${crypto.randomUUID()}.tmp`;
      fs.writeFileSync(temporary, candidate, { flag: "wx" });
      try { fs.renameSync(temporary, assetPath); } finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
    }
    const token = crypto.randomUUID();
    await frontendAssets.put(token, { token, sessionId, revisionId: record.revisionId, digest: expectedDigest, path: assetPath, contentType: "application/json; charset=utf-8" });
    await appendFrontendEvent(record, "asset_ready", `asset:${token}`, { assetId: "weather-flags", digest: expectedDigest });
    return { assetId: "weather-flags", digest: expectedDigest, url: `/dsh-re3-rp/asset?token=${encodeURIComponent(token)}` };
  };

  const frontendEventsAfter = (sessionId: string, after: number): RecordValue[] => Array.from(frontendEvents.entries() as IterableIterator<[string, RecordValue]>)
    .flatMap(([, event]) => event.sessionId === sessionId && typeof event.sequence === "number" && event.sequence > after ? [event] : [])
    .sort((left, right) => Number(left.sequence) - Number(right.sequence));

  const standaloneMain = (sessionId: string): string => `import { mountStandaloneFrontend } from "./core.js";
const sessionId = ${JSON.stringify(sessionId)};
const listeners = new Set();
async function call(method, payload = {}) {
  const response = await fetch('/dsh-re3-rp/bridge', { method: 'POST', headers: { 'content-type': 'application/json; charset=utf-8' }, body: JSON.stringify({ sessionId, method, payload, operationId: payload.operationId }) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.ok !== true) throw Object.assign(new Error(body?.error?.message || body?.error || 'Bridge request failed'), { code: body?.error?.code || 'bridge_unavailable' });
  return body.result;
}
const adapter = Object.freeze({
  version: 'dsh-re3-rp-v1',
  async getBinding() { const value = await call('connect'); return { chatId: value.sessionId, cardId: value.cardId }; },
  getProjection: () => call('getProjection'),
  subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  async submitTurn(action) { const result = await call('submitTurn', action); const event = { type: 'generation_committed', operationId: result.operationId, committedSeq: result.committedSeq, projection: result.projection }; for (const listener of listeners) listener(event); return result; }
});
await mountStandaloneFrontend({ adapter, document });
`;

  const requiredAssetMain = (sessionId: string): string => `const sessionId = ${JSON.stringify(sessionId)};
const result = document.querySelector('#result');
document.querySelector('#origin').textContent = 'DSH Host 固化资源';
async function digest(bytes) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(value => value.toString(16).padStart(2, '0')).join(''); }
async function call(payload) {
  const response = await fetch('/dsh-re3-rp/bridge', { method: 'POST', headers: { 'content-type': 'application/json; charset=utf-8' }, body: JSON.stringify({ sessionId, method: 'resolveAsset', payload }) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.ok !== true) throw Object.assign(new Error(body?.error?.message || body?.error || 'resource failed'), { code: body?.error?.code || 'asset_unavailable' });
  return body.result;
}
async function probe(scenario) {
  delete result.dataset.error; result.dataset.status = 'checking'; result.textContent = '正在检查 ' + scenario + '…';
  const resolved = await call({ assetId: 'weather-flags', scenario });
  const response = await fetch(resolved.url, { cache: 'no-store' });
  if (!response.ok) throw Object.assign(new Error('HTTP ' + response.status), { code: 'asset_unavailable' });
  const actualDigest = await digest(await response.arrayBuffer());
  if (actualDigest !== resolved.digest) throw Object.assign(new Error(actualDigest + ' != ' + resolved.digest), { code: 'asset_digest_mismatch' });
  result.dataset.status = 'pass'; result.textContent = 'asset_ready sha256=' + actualDigest;
}
for (const button of document.querySelectorAll('[data-scenario]')) button.addEventListener('click', () => probe(button.dataset.scenario).catch(error => { result.dataset.status = 'blocked'; result.dataset.error = error.code || 'asset_unavailable'; result.textContent = result.dataset.error + ': ' + error.message; }));
`;

  const scriptVariables = (card: NormalizedCard): VariableObject => card.variableDefinition.scripts.reduce(
    (state, script) => mergeVariableScopes({ global: state, character: script.variables }),
    {} as VariableObject,
  );

  const supportsExtraModel = (card: NormalizedCard): boolean => supportsExtraModelParsing(card.variableDefinition.updateFormats);

  const mvuSettingsFor = (binding: Binding, card: NormalizedCard): MvuSessionSettings => normalizeMvuSessionSettings(
    binding.mvuSettings,
    { provider: binding.provider, model: binding.model, supportsExtraModel: supportsExtraModel(card) },
  );

  const assistantVariableReplies = (session: any): string[] => {
    const events = session?.surface?.nodes?.map((seq: number) => session.events?.[seq]) ?? [];
    return events.flatMap((event: any) => {
      if (event?.type !== "assistant/message") return [];
      const message = event.data?.message ?? event.data;
      if (message?.source?.kind === "plugin") return [];
      if (message?.source?.provider === "dsh-re3-rp" && message?.source?.model === "character-card-opening") return [];
      const value = messageText(message);
      return value.length === 0 ? [] : [value];
    });
  };

  const initializationSources = (card: NormalizedCard, openingId: string): VariableSource[] => {
    const worldbook = card.worldbook
      .filter((entry) => card.variableDefinition.worldbookInitvarEntryIds.includes(entry.id))
      .map((entry) => ({ id: `worldbook:${entry.id}`, content: entry.content, location: "worldbook" as const }));
    const opening = card.openings.find((candidate) => candidate.id === openingId);
    return opening !== undefined && /<initvar\b/iu.test(opening.message)
      ? [...worldbook, { id: `opening:${opening.id}`, content: opening.message, location: "opening" as const }]
      : worldbook;
  };

  const appendVariableEvents = async (record: VariableStateRecord, events: readonly VariableRuntimeEvent[], metadata: RecordValue = {}): Promise<void> => {
    for (const event of events) {
      const sequence = record.eventSequence;
      record.eventSequence += 1;
      await variableEvents.put(`${record.sessionId}:${String(sequence).padStart(8, "0")}`, {
        sessionId: record.sessionId,
        revisionId: record.revisionId,
        sequence,
        capturedAt: new Date().toISOString(),
        ...metadata,
        ...event,
      });
    }
  };

  const initializeVariables = async (sessionId: string, card: NormalizedCard, selectedOpeningId: string): Promise<VariableStateRecord> => {
    const baseScopes = {
      global: {},
      character: card.variableDefinition.character,
      script: scriptVariables(card),
      chat: {},
      messageSelectedVariant: {},
    };
    const initialSnapshots: VariableStateRecord["initialSnapshots"] = {};
    const results = new Map<string, ReturnType<typeof initializeVariableRuntime>>();
    for (const opening of card.openings) {
      const result = initializeVariableRuntime(baseScopes, initializationSources(card, opening.id));
      results.set(opening.id, result);
      initialSnapshots[opening.id] = { state: result.state, digest: await variableStateDigest(result.state), status: result.status };
    }
    const selected = initialSnapshots[selectedOpeningId];
    if (selected === undefined) throw new Error("变量运行时找不到所选开场快照");
    const record: VariableStateRecord = {
      sessionId,
      revisionId: card.revisionId,
      selectedOpeningId,
      state: selected.state,
      digest: selected.digest,
      initialSnapshots,
      eventSequence: 0,
      updatedAt: new Date().toISOString(),
    };
    for (const opening of card.openings) await appendVariableEvents(record, results.get(opening.id)?.events ?? [], { phase: "initialization", openingId: opening.id, stateDigest: initialSnapshots[opening.id].digest });
    await variableStates.put(sessionId, record as unknown as RecordValue);
    return record;
  };

  const selectOpeningVariables = async (record: VariableStateRecord, openingId: string): Promise<void> => {
    const snapshot = record.initialSnapshots[openingId];
    if (snapshot === undefined) throw new Error("变量运行时找不到这个开场的独立初始快照");
    record.selectedOpeningId = openingId;
    record.state = snapshot.state;
    record.digest = snapshot.digest;
    record.updatedAt = new Date().toISOString();
    await variableStates.put(record.sessionId, record as unknown as RecordValue);
  };

  const updateVariablesFromReply = async (sessionId: string, body: string): Promise<VariableUpdateResult | undefined> => {
    const record = variableStates.get(sessionId) as unknown as VariableStateRecord | undefined;
    if (record === undefined) return;
    const result = applyVariableUpdate(record.state, body);
    if (result.status === "ignored") return result;
    const nextDigest = result.status === "committed" ? await variableStateDigest(result.state) : record.digest;
    await appendVariableEvents(record, result.events, { phase: "reply", stateDigestBefore: record.digest, stateDigestAfter: nextDigest, committed: result.status === "committed" });
    if (result.status === "committed") {
      record.lastCommittedStateBefore = structuredClone(record.state);
      record.lastCommittedReplyDigest = await sha256(new TextEncoder().encode(body));
      record.state = result.state;
      record.digest = nextDigest;
    }
    record.updatedAt = new Date().toISOString();
    await variableStates.put(sessionId, record as unknown as RecordValue);
    return result;
  };

  const replayVariablesFromInitial = async (record: VariableStateRecord, replies: readonly string[], phase: string): Promise<void> => {
    const initial = record.initialSnapshots[record.selectedOpeningId];
    if (initial === undefined || initial.status !== "initialized") throw new Error("当前开场没有可用的初始变量快照");
    const replay = replayMvuReplies(initial.state, replies);
    if (replay.failedReplies > 0) throw new Error(`变量重放有 ${replay.failedReplies} 条回复未通过原子校验，原状态未改动`);
    const nextDigest = await variableStateDigest(replay.state);
    await appendVariableEvents(record, replay.events, { phase, stateDigestBefore: record.digest, stateDigestAfter: nextDigest });
    record.state = replay.state;
    record.digest = nextDigest;
    record.updatedAt = new Date().toISOString();
    await variableStates.put(record.sessionId, record as unknown as RecordValue);
  };

  const reprocessVariables = async (sessionId: string): Promise<{ digest: string; replayedReplies: number }> => {
    const record = variableStates.get(sessionId) as unknown as VariableStateRecord | undefined;
    const session = ctx.sessions.get(sessionId);
    if (record === undefined || session === undefined) throw new Error("找不到酒馆 Session 的变量状态");
    const replies = assistantVariableReplies(session);
    if (record.lastCommittedStateBefore !== undefined && record.lastCommittedReplyDigest !== undefined) {
      let target = "";
      for (const reply of replies.slice().reverse()) {
        if (await sha256(new TextEncoder().encode(reply)) === record.lastCommittedReplyDigest) { target = reply; break; }
      }
      if (target.length > 0) {
        const result = applyVariableUpdate(record.lastCommittedStateBefore, target);
        if (result.status === "failed") throw new Error("最后一次变量更新重新处理失败，原状态未改动");
        if (result.status === "committed") {
          const nextDigest = await variableStateDigest(result.state);
          await appendVariableEvents(record, result.events, { phase: "repair-reprocess", stateDigestBefore: record.digest, stateDigestAfter: nextDigest });
          record.state = result.state;
          record.digest = nextDigest;
          record.updatedAt = new Date().toISOString();
          await variableStates.put(sessionId, record as unknown as RecordValue);
          return { digest: record.digest, replayedReplies: 1 };
        }
      }
    }
    await replayVariablesFromInitial(record, replies, "repair-reprocess");
    return { digest: record.digest, replayedReplies: replies.length };
  };

  const reloadInitialVariables = async (sessionId: string, card: NormalizedCard): Promise<{ digest: string; replayedReplies: number }> => {
    const current = variableStates.get(sessionId) as unknown as VariableStateRecord | undefined;
    const session = ctx.sessions.get(sessionId);
    if (current === undefined || session === undefined) throw new Error("找不到酒馆 Session 的变量状态");
    const temporaryId = `${sessionId}:reload:${crypto.randomUUID()}`;
    try {
      const replacement = await initializeVariables(temporaryId, card, current.selectedOpeningId);
      replacement.sessionId = sessionId;
      replacement.eventSequence = current.eventSequence;
      const replies = assistantVariableReplies(session);
      const initial = replacement.initialSnapshots[replacement.selectedOpeningId];
      if (initial === undefined || initial.status !== "initialized") throw new Error("重新读取的初始变量未通过校验，原状态未改动");
      const replay = replayMvuReplies(initial.state, replies);
      if (replay.failedReplies > 0) throw new Error(`重新读取后有 ${replay.failedReplies} 条历史回复无法重放，原状态未改动`);
      replacement.state = replay.state;
      replacement.digest = await variableStateDigest(replay.state);
      replacement.updatedAt = new Date().toISOString();
      await appendVariableEvents(replacement, replay.events, { phase: "repair-reload-initial", stateDigestBefore: current.digest, stateDigestAfter: replacement.digest });
      await variableStates.put(sessionId, replacement as unknown as RecordValue);
      return { digest: replacement.digest, replayedReplies: replies.length };
    } finally {
      await variableStates.delete(temporaryId);
      for (const [key, event] of variableEvents.entries() as IterableIterator<[string, RecordValue]>) {
        if (event.sessionId === temporaryId) await variableEvents.delete(key);
      }
    }
  };

  const runSplitMvuUpdate = async (sessionId: string, binding: Binding, card: NormalizedCard, compiled: CompiledTavernPrompt | string, narrative: string): Promise<VariableUpdateResult | undefined> => {
    const target = resolveMvuExtraModel(mvuSettingsFor(binding, card), binding);
    binding.splitMvu = {
      enabled: true,
      provider: target.provider,
      model: target.model,
      status: "running",
      updatedAt: new Date().toISOString(),
    };
    await bindings.put(sessionId, binding as unknown as RecordValue);
    let correction = "";
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const options: any = {
        provider: target.provider,
        model: target.model,
        system: "",
        messages: [],
        tools: [],
        maxTokens: target.maxTokens,
        sessionId,
      };
      if (typeof compiled === "string") options.system = compiled;
      else applyCompiledPromptToRequest(options, compiled);
      options.messages.push({
        id: crypto.randomUUID(),
        role: "assistant",
        content: [{ type: "text", text: narrative }],
        source: { kind: "model", provider: target.provider, model: target.model },
      }, {
        id: crypto.randomUUID(),
        role: "user",
        content: [{ type: "text", text: correction.length === 0
          ? "根据刚刚完成的当前剧情，只执行分步 MVU 变量更新。严格遵守 [mvu_update] 指令，只输出完整的 <UpdateVariable> 块，不要续写剧情。"
          : `上一次变量更新被 Host 原子校验拒绝：${correction}\n请修正路径或操作类型；缺少的对象分支使用 insert 创建。重新输出一个完整的 <UpdateVariable> 块，不要续写剧情。` }],
        source: { kind: "plugin", plugin: "dsh-re3-rp", form: attempt === 0 ? "split-mvu" : "split-mvu-repair" },
      });
      splitMvuRequestGuards.add(options);
      let body = "";
      let failure = "";
      for await (const chunk of ctx.llm.stream(options)) {
        if (chunk?.type === "text-delta" && typeof chunk.text === "string") body += chunk.text;
        if (chunk?.type === "finish" && (chunk.reason?.kind === "error" || chunk.reason?.kind === "aborted")) {
          failure = typeof chunk.reason.failure?.message === "string" ? chunk.reason.failure.message : `副模型调用${chunk.reason.kind}`;
        }
      }
      if (failure.length > 0) throw new Error(failure);
      if (!/<UpdateVariable\b[^>]*>[\s\S]*?<\/UpdateVariable>/iu.test(body)) {
        correction = "没有返回完整的 UpdateVariable 块";
      } else {
        const variableRecord = variableStates.get(sessionId) as unknown as VariableStateRecord | undefined;
        const compatibility = variableRecord === undefined
          ? undefined
          : applySplitMvuPatchCompatibility(variableRecord.state, body);
        const result = await updateVariablesFromReply(sessionId, compatibility?.body ?? body);
        if (result?.status === "committed") {
          binding.splitMvu = { ...binding.splitMvu, status: "committed", updatedAt: new Date().toISOString() };
          await bindings.put(sessionId, binding as unknown as RecordValue);
          return result;
        }
        correction = result?.diagnostics.map((item) => item.message).join("；") || "变量更新未提交";
      }
    }
    throw new Error(correction || "副模型变量更新未提交");
  };

  const setupAgent = (sessionId: string, card: NormalizedCard, binding: Binding) => (agentCtx: any): void => {
    const literalMacros = literalMacroVariables(card);
    for (const [token, variable] of literalMacros) agentCtx.systemPrompt.variable(variable, () => token);
    const protect = (text: string): string => protectLiteralMacros(text, literalMacros);
    const initialPersona = activePersona(binding)?.persona;
    agentCtx.systemPrompt.section({ name: "dsh-re3-rp:complete-character-prompt", order: 0, complete: true, text: protect(cardPrompt(card, initialPersona?.displayName ?? binding.userName, initialPersona?.content ?? "")) });
    agentCtx.on("system-prompt/assemble", async (_assembly: any, _context: any, next: () => Promise<any>) => isolateTavernAssembly(await next()));
    agentCtx.on("agent/pre-step", async ({ agent, messages, signal }: any) => {
      if (signal?.aborted) return { kind: "reject" };
      const session = agent.session;
      const existing = normalizeTavernChatMessages(typeof session?.deriveMessages === "function" ? session.deriveMessages() : []);
      const incoming = normalizeTavernChatMessages(Array.isArray(messages) ? messages : []);
      const chat = [...existing, ...incoming];
      const variableState = variableStates.get(sessionId) as unknown as VariableStateRecord | undefined;
      const currentPersona = activePersona(binding)?.persona;
      const currentUserName = currentPersona?.displayName ?? binding.userName;
      const personaDescription = currentPersona?.content ?? "";
      const ejsVariables = variableState?.state ?? {};
      const messageId = Math.max(-1, chat.length - 1);
      const ejsDiagnostics: Array<{ source: "card" | "worldbook"; id: string; code: string; message: string }> = [];
      let ejsSourceCount = 0;
      let ejsInputBytes = 0;
      let ejsOutputBytes = 0;
      const ejsRoundEncoder = new TextEncoder();
      const renderEjsSource = async (source: string, sourceType: "card" | "worldbook", id: string): Promise<string | undefined> => {
        if (!/<%|%>/u.test(source)) return source;
        const sourceBytes = ejsRoundEncoder.encode(source).byteLength;
        if (ejsSourceCount >= 128 || ejsInputBytes + sourceBytes > 2 * 1024 * 1024) {
          ejsDiagnostics.push({ source: sourceType, id, code: "ejs_round_limit", message: "本轮 EJS 输入超过条目数或总字节安全边界" });
          return undefined;
        }
        ejsSourceCount += 1;
        ejsInputBytes += sourceBytes;
        try {
          const missingVariables: string[] = [];
          const rendered = (await ejsRuntime.render([source], ejsVariables, {
            messageId,
            seed: `${card.revisionId}:${sessionId}:${messageId}:${sourceType}:${id}`,
            missingVariables,
          }))[0]!;
          const uniqueMissing = [...new Set(missingVariables)];
          if (uniqueMissing.length > 0) {
            ejsDiagnostics.push({
              source: sourceType,
              id,
              code: "ejs_variable_unavailable",
              message: `EJS getvar 本轮缺少变量：${uniqueMissing.join("、")}；已按模板自己的 defaults / fallback 语义继续`,
            });
          }
          const outputBytes = ejsRoundEncoder.encode(rendered).byteLength;
          if (ejsOutputBytes + outputBytes > 4 * 1024 * 1024) {
            ejsDiagnostics.push({ source: sourceType, id, code: "ejs_round_limit", message: "本轮 EJS 输出超过总字节安全边界" });
            return undefined;
          }
          ejsOutputBytes += outputBytes;
          return rendered;
        } catch (error) {
          ejsDiagnostics.push({
            source: sourceType,
            id,
            code: typeof (error as { code?: unknown })?.code === "string" ? (error as { code: string }).code : "ejs_render_failed",
            message: error instanceof Error ? error.message : String(error),
          });
          return undefined;
        }
      };
      const promptFieldKeys = ["description", "personality", "scenario", "messageExample", "systemPrompt", "postHistoryInstructions"] as const;
      const renderedCard = { ...card };
      for (const key of promptFieldKeys) {
        const rendered = await renderEjsSource(card[key], "card", key);
        if (rendered === undefined) {
          const detail = [...ejsDiagnostics].reverse().find((item) => item.source === "card" && item.id === key);
          throw Object.assign(new Error(`EJS 顶层角色字段 ${key} 渲染失败，已阻止模型请求${detail === undefined ? "" : `：${detail.message}`}`), { code: detail?.code ?? "ejs_render_failed" });
        }
        renderedCard[key] = rendered;
      }
      const executableWorldbook = card.worldbook.map((entry) => binding.worldbookEnabledOverrides?.[entry.id] === undefined
        ? entry
        : { ...entry, enabled: binding.worldbookEnabledOverrides[entry.id] === true });
      const resolvedWorldbook = await activateWorldbookWithRenderer(
        executableWorldbook,
        chat.map((message) => message.content),
        sessionId,
        {
          messageCount: chat.length,
          runtimeState: binding.worldbookState,
          maxRecursionSteps: binding.worldInfoMaxRecursionSteps,
        },
        (entry) => /<%|%>/u.test(entry.content),
        async (entry) => renderEjsSource(entry.content, "worldbook", entry.id),
      );
      const renderedActivation = resolvedWorldbook.activation;
      const mvuSettings = mvuSettingsFor(binding, card);
      binding.mvuSettings = mvuSettings;
      const extraModelRequested = mvuSettings.updateMethod === "额外模型解析" && supportsExtraModel(card);
      const splitMvu = extraModelRequested && hasSplitMvuContract(renderedActivation.active);
      const plotActivation = splitMvu ? splitMvuActivationForPhase(renderedActivation, "plot") : renderedActivation;
      const updateActivation = !extraModelRequested
        ? undefined
        : splitMvu ? splitMvuActivationForPhase(renderedActivation, "update") : renderedActivation;
      const committedRuntimeState = renderedActivation.runtimeState;
      latestActivations.set(sessionId, {
        activation: plotActivation,
        placement: placeWorldbook(plotActivation.active, { userName: currentUserName, characterName: card.title }),
      });
      const preset = bindingPreset(binding);
      const compiled = compileTavernPrompt({ card: renderedCard, userName: currentUserName, personaDescription, chat, activation: plotActivation, messageVariables: variableState?.state, macroSeed: sessionId, preset });
      const updateCompiled = updateActivation === undefined
        ? undefined
        : compileTavernPrompt({ card: renderedCard, userName: currentUserName, personaDescription, chat, activation: updateActivation, messageVariables: variableState?.state, macroSeed: `${sessionId}:mvu-update`, preset });
      const compiledModelText = compiled.messages.map((message) => message.content).join("\n");
      if (/<%|%>/u.test(compiledModelText)) throw Object.assign(new Error("EJS 渲染后仍有未解析标签，已阻止模型请求"), { code: "ejs_unresolved" });
      binding.worldbookState = committedRuntimeState;
      const previous = latestAssemblies.get(sessionId);
      const activeEntryIds = compiled.activation.active.map((entry) => entry.id);
      const previousIds = new Set(previous?.activeEntryIds ?? binding.lastActiveEntryIds ?? []);
      const currentIds = new Set(activeEntryIds);
      const assemblyId = `${sessionId}:${Date.now()}:${crypto.randomUUID()}`;
      const summary: TavernAssemblySummary = {
        assemblyId,
        presetName: compiled.preset.name,
        activeEntries: compiled.stats.activeWorldbookEntries,
        filteredEntries: compiled.stats.filteredWorldbookEntries,
        depthInjections: compiled.stats.depthInjections,
        messageCount: compiled.stats.messageCount,
        characterCount: compiled.stats.characterCount,
        addedEntryIds: activeEntryIds.filter((id) => !previousIds.has(id)),
        removedEntryIds: [...previousIds].filter((id) => !currentIds.has(id)),
        previousAssemblyId: previous?.assemblyId ?? binding.lastAssemblyId ?? null,
        stage: "request",
      };
      const assemblySeq = upsertTavernAssemblyContext(session, summary, renderTavernContextEnvelope(compiled));
      latestAssemblies.set(sessionId, { assemblyId, activeEntryIds, compiled });
      pendingAssemblies.set(sessionId, { summary, assemblySeq, compiled, activation: plotActivation, updateCompiled, ejsDiagnostics });
      if (updateCompiled !== undefined) {
        binding.splitMvu = {
          enabled: true,
          provider: binding.provider,
          model: binding.model,
          status: "ready",
          updatedAt: new Date().toISOString(),
        };
      }
      binding.lastAssemblyId = assemblyId;
      binding.lastActiveEntryIds = activeEntryIds;
      await bindings.put(sessionId, binding as unknown as RecordValue);
      return {
        kind: "enter",
        messages: (Array.isArray(messages) ? messages : []).filter((message: any) => message?.source?.kind !== "plugin"),
      };
    });
    agentCtx.on("agent/request", async (_payload: any, next: () => Promise<any>) => {
      const config = await next();
      const pending = pendingAssemblies.get(sessionId);
      if (pending === undefined) return { ...config, tools: [] };
      return {
        ...config,
        system: compiledTavernSystemPrompt(pending.compiled) || `你正在扮演 ${card.title}。`,
        tools: [],
        temperature: pending.compiled.settings.temperature,
        maxTokens: pending.compiled.settings.maxReplyTokens,
      };
    });
    agentCtx.on("agent/turn-stopping", async () => {
      await variableReplyGate.commit(sessionId, async (body) => {
        const inline = await updateVariablesFromReply(sessionId, body);
        const updateCompiled = pendingAssemblies.get(sessionId)?.updateCompiled;
        const settings = mvuSettingsFor(binding, card);
        if (inline?.status !== "ignored" || updateCompiled === undefined || !settings.automaticRequest) return;
        try {
          await runSplitMvuUpdate(sessionId, binding, card, updateCompiled, body);
        } catch (error) {
          binding.splitMvu = {
            enabled: true,
            provider: binding.provider,
            model: binding.model,
            status: "failed",
            updatedAt: new Date().toISOString(),
            error: error instanceof Error ? error.message : "副模型变量更新失败",
          };
          await bindings.put(sessionId, binding as unknown as RecordValue);
        }
      });
    });
  };

  const restore = async (binding: Binding): Promise<void> => {
    if (ctx.agents.get(binding.sessionId) !== undefined) return;
    const waitForConcurrentPublication = async (): Promise<boolean> => {
      if (ctx.sessions.get(binding.sessionId) === undefined) return false;
      for (let attempt = 0; attempt < 200; attempt += 1) {
        if (ctx.agents.get(binding.sessionId) !== undefined) return true;
        if (ctx.sessions.get(binding.sessionId) === undefined) return false;
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      return ctx.agents.get(binding.sessionId) !== undefined;
    };
    // A reconnecting browser can recreate this binding while plugin startup is
    // restoring persisted bindings. Session publication precedes Agent registry
    // publication by a very small window, so wait for that concurrent owner
    // instead of attempting a second resume for the same durable Session.
    if (await waitForConcurrentPublication()) return;
    const card = cardFor(binding.revisionId);
    if (card === undefined) throw new Error(`会话 ${binding.sessionId} 缺少卡片 revision ${binding.revisionId}`);
    if (variableStates.get(binding.sessionId) === undefined) await initializeVariables(binding.sessionId, card, binding.openingId);
    if (card.frontendDefinition !== undefined && frontendStates.get(binding.sessionId) === undefined) await initializeFrontend(binding.sessionId, card);
    let handle;
    try {
      handle = await ctx.agents.resume({
        resumeSessionId: binding.sessionId,
        agentOptions: { provider: binding.provider, model: binding.model },
        setup: setupAgent(binding.sessionId, card, binding),
      });
    } catch (error) {
      if (await waitForConcurrentPublication()) return;
      throw error;
    }
    handles.set(binding.sessionId, handle);
  };

  const reconcileOpeningIntent = async (binding: Binding): Promise<void> => {
    const intentKey = openingIntentKey(binding.sessionId);
    const intent = frontendReceipts.get(intentKey) as RecordValue | undefined;
    if (intent?.kind !== "opening_selection_intent" || intent.sessionId !== binding.sessionId || typeof intent.openingId !== "string") return;
    const session = ctx.sessions.get(binding.sessionId);
    if (session !== undefined && hasPlayerMessage(session.events)) {
      const card = cardFor(binding.revisionId);
      const variables = variableStates.get(binding.sessionId) as unknown as VariableStateRecord | undefined;
      const opening = card?.openings.find((candidate) => candidate.id === intent.openingId);
      if (card === undefined || variables === undefined || opening === undefined) return;
      const renderedOpening = substituteCardMacros(opening.message, { userName: effectiveUserName(binding), characterName: card.title });
      const initial = variables.initialSnapshots[opening.id];
      if (initial === undefined || initial.status !== "initialized") throw new Error("恢复开场没有可用的初始变量快照");
      const replay = replayMvuReplies(initial.state, assistantVariableReplies(session));
      if (replay.failedReplies > 0) throw new Error(`恢复开场时有 ${replay.failedReplies} 条回复未通过原子校验，原状态未改动`);
      const nextVariables = structuredClone(variables);
      nextVariables.selectedOpeningId = opening.id;
      nextVariables.state = replay.state;
      nextVariables.digest = await variableStateDigest(replay.state);
      nextVariables.updatedAt = new Date().toISOString();
      if (currentOpeningText(session) !== renderedOpening) replaceOpening(session, renderedOpening);
      await variableStates.put(binding.sessionId, nextVariables as unknown as RecordValue);
      binding.openingId = opening.id;
      binding.openingDigest = await sha256(new TextEncoder().encode(renderedOpening));
      await bindings.put(binding.sessionId, binding as unknown as RecordValue);
      await ctx.sessions.flush(session);
      await putOpeningReceipt(binding.sessionId, intent.operationId, openingState(binding, card, session));
      await frontendReceipts.delete(intentKey);
      return;
    }
    const state = await commitSessionOpening(binding.sessionId, intent.openingId);
    await putOpeningReceipt(binding.sessionId, intent.operationId, state);
    await frontendReceipts.delete(intentKey);
  };

  for (const binding of allBindings()) {
    await restore(binding);
    await reconcileOpeningIntent(binding);
  }

  disposers.push(ctx.on("llm/stream", (options: any, next: () => AsyncIterable<any>) => {
    if (splitMvuRequestGuards.has(options)) return next();
    const sessionId = typeof options.sessionId === "string" ? options.sessionId : "";
    const binding = bindings.get(sessionId) as unknown as Binding | undefined;
    if (binding === undefined || options.purpose !== undefined) return next();
    const card = cardFor(binding.revisionId);
    const session = ctx.sessions.get(sessionId);
    const pending = pendingAssemblies.get(sessionId);
    if (card === undefined || session === undefined || pending === undefined) return next();
    const { summary, assemblySeq, compiled, activation, ejsDiagnostics } = pending;
    if (!compiledRequestReentryGuards.has(options)) {
      const directOptions = { ...options, messages: [], tools: [] };
      applyCompiledPromptToRequest(directOptions, compiled);
      compiledRequestReentryGuards.add(directOptions);
      return ctx.llm.stream(directOptions);
    }
    const assemblyId = summary.assemblyId;
    const requestText = JSON.stringify({ system: options.system ?? "", messages: options.messages ?? [] });
    const modelVisibleText = `${options.system ?? ""}\n${(options.messages ?? []).map(messageText).join("\n")}`;
    if (/<%|%>/u.test(modelVisibleText)) throw Object.assign(new Error("实际模型请求仍含 EJS 源码，已阻止发送"), { code: "ejs_unresolved" });
    const providerStream = (): AsyncIterable<any> => {
      const stream = next();
      return stream;
    };
    const stream = hostGlobal.process.env.DSH_RE3_RP_VERIFY === "1"
      ? (async function* (): AsyncIterable<any> {
          const text = card.frontendDefinition?.caseId === "opening-inline-action"
            ? "警铃穿过潮雾。<MixedWatchPanel phase=\"turn-1\"/>守望员登记了这次正式行动。"
            : card.frontendDefinition?.caseId === "generated-multi-fragment"
              ? "潮汐哨兵回报：<HarborSignal>白砾号已确认</HarborSignal>，随后更新值守板。<TideStatusPanel phase=\"turn-1\"/>潮位记录已归档。"
              : "固定验收回复：正式玩家行动已经进入 DSH Session。";
          yield { type: "block-start", index: 0, blockType: "text" };
          yield { type: "text-delta", index: 0, text };
          yield { type: "block-end", index: 0, block: { type: "text", text } };
          yield { type: "finish", reason: { kind: "stop" } };
        })()
      : providerStream();
    return (async function* (): AsyncIterable<any> {
      {
        const worldbookSnapshotCount = (options.messages ?? []).filter((message: any) => messageText(message).startsWith(TAVERN_WORLD_CONTEXT_MARKER)).length;
        const activatedEntries = await Promise.all(activation.active.map(async (entry) => {
          const projected = compiled.placement.entries.find((candidate) => candidate.id === entry.id)?.content ?? entry.content;
          return {
            id: entry.id,
            order: entry.order,
            position: entry.position,
            contentDigest: await sha256(new TextEncoder().encode(entry.content)),
            projectedContentDigest: await sha256(new TextEncoder().encode(projected)),
            presentInActualRequest: modelVisibleText.includes(projected),
          };
        }));
        const unresolvedMacroKinds = [...new Set(Array.from(modelVisibleText.matchAll(/\{\{\s*([a-z_][a-z0-9_-]*)\b[^{}]*\}\}/giu), (match) => match[1].toLocaleLowerCase()))].sort();
        const variableState = variableStates.get(sessionId) as unknown as VariableStateRecord | undefined;
        await traces.put(assemblyId, {
          traceId: assemblyId,
          assemblyId,
          assemblySeq,
          sessionId,
          revisionId: binding.revisionId,
          openingId: binding.openingId,
          normalizedIndexVersion: binding.normalizedIndexVersion,
          capturedAt: new Date().toISOString(),
          provider: options.provider,
          model: options.model,
          requestDigest: await sha256(new TextEncoder().encode(requestText)),
          systemLength: typeof options.system === "string" ? options.system.length : 0,
          containsHarnessIdentity: /AI agent powered by DeepSeek Harness|DeepSeek Harness implementation checkout|DSH itself/iu.test(options.system ?? ""),
          toolCount: Array.isArray(options.tools) ? options.tools.length : 0,
          variableStateDigest: variableState?.digest ?? null,
          unresolvedMacroKinds,
          ejsDiagnostics,
          worldbookContextRevision: worldbookContextRevision(ctx.sessions.get(sessionId)),
          worldbookSurfaceSeq: currentWorldbookSurfaceSeq(ctx.sessions.get(sessionId)) ?? null,
          worldbookSnapshotCount,
          messageRoles: (options.messages ?? []).map((message: any) => message.role),
          messageLengths: (options.messages ?? []).map((message: any) => messageText(message).length),
          generation: {
            temperature: options.temperature ?? null,
            maxTokens: options.maxTokens ?? null,
            stream: true,
            contextTokens: compiled.settings.contextTokens,
            estimatedPromptTokens: compiled.stats.estimatedTokens,
            prunedChatMessages: compiled.stats.prunedChatMessages,
            prunedExampleMessages: compiled.stats.prunedExampleMessages,
            providerNeutralUnsupported: {
              topP: compiled.settings.topP,
              frequencyPenalty: compiled.settings.frequencyPenalty,
              presencePenalty: compiled.settings.presencePenalty,
            },
          },
          activatedEntries,
          activationPasses: activation.passes,
          assembly: {
            summary,
            preset: compiled.preset,
            stats: compiled.stats,
            blocks: compiled.blocks,
            placements: compiled.placement.entries.map(({ content: _content, ...entry }) => entry),
            activation: compiled.activation.trace,
            messages: compiled.messages,
            actualRequest: {
              system: typeof options.system === "string" ? options.system : "",
              messages: (options.messages ?? []).map((message: any) => ({ role: message.role, content: messageText(message) })),
              toolCount: Array.isArray(options.tools) ? options.tools.length : 0,
              generation: {
                temperature: options.temperature ?? null,
                maxTokens: options.maxTokens ?? null,
                stream: true,
              },
            },
          },
        });
        await bindings.put(sessionId, binding as unknown as RecordValue);
        await ctx.sessions.flush(session);
      }
      let assistantBody = "";
      for await (const chunk of stream) {
        if (chunk?.type === "text-delta" && typeof chunk.text === "string") assistantBody += chunk.text;
        yield chunk;
      }
      variableReplyGate.capture(sessionId, assistantBody);
    })();
  }, { global: true }));

  disposers.push(ctx.webServer.register({ kind: "exact", path: "/dsh-re3-rp/cards", handler: async (req: any, res: any) => {
    const cardRecords = (): CardLibraryRecord[] => Array.from(cards.entries(), ([, card]: [string, RecordValue]) => card as CardLibraryRecord);
    const value = (): RecordValue => ({ cards: orderVisibleCards(cardRecords()).map((card) => publicCard(card as unknown as NormalizedCard, allBindings(), (sessionId) => ctx.sessions.get(sessionId))) });
    if (req.method === "GET" || req.method === "HEAD") {
      if (req.method === "HEAD") { res.writeHead(200, { "Cache-Control": "no-store" }); res.end(); return; }
      jsonBody(res, 200, value());
      return;
    }
    try {
      if (req.method === "PATCH") {
        const input = await readJson(req);
        const revisionIds = Array.isArray(input.revisionIds) ? input.revisionIds.filter((item): item is string => typeof item === "string") : [];
        const reordered = reorderVisibleCards(cardRecords(), revisionIds);
        for (const card of reordered) await cards.put(card.revisionId, card as RecordValue);
        jsonBody(res, 200, { ok: true, ...value() });
        return;
      }
      if (req.method === "DELETE") {
        const input = await readJson(req);
        const revisionId = typeof input.revisionId === "string" ? input.revisionId : "";
        const card = cards.get(revisionId) as CardLibraryRecord | undefined;
        if (card === undefined || card.libraryHidden === true) throw new Error("找不到要从卡库删除的酒馆卡");
        await cards.put(revisionId, hideCardFromLibrary(card) as RecordValue);
        jsonBody(res, 200, { ok: true, preservedSessions: allBindings().filter((binding) => binding.revisionId === revisionId).length, ...value() });
        return;
      }
      res.writeHead(405, { Allow: "GET, HEAD, PATCH, DELETE" }); res.end();
    } catch (error) {
      jsonBody(res, 400, { ok: false, error: error instanceof Error ? error.message : "酒馆卡库操作失败" });
    }
  }}));

  disposers.push(ctx.webServer.register({ kind: "exact", path: "/dsh-re3-rp/import", handler: async (req: any, res: any) => {
    if (req.method !== "POST") { res.writeHead(405, { Allow: "POST" }); res.end(); return; }
    try {
      const encodedName = typeof req.headers["x-dsh-re3-rp-filename"] === "string" ? req.headers["x-dsh-re3-rp-filename"] : "card.json";
      const sourceName = decodeURIComponent(encodedName).replace(/[\\/]/gu, "_");
      const bytes = await readBody(req);
      const parsedCard = await parseCard(bytes, sourceName, (input) => new Uint8Array(zlib.inflateSync(input)));
      const storedCard = cardFor(parsedCard.revisionId);
      const card = storedCard?.normalizedIndexVersion === NORMALIZED_CARD_INDEX_VERSION ? storedCard : parsedCard;
      const blobPath = path.join(blobRoot, card.revisionId);
      if (!fs.existsSync(blobPath)) {
        const temporary = path.join(blobRoot, `.${card.revisionId}.${crypto.randomUUID()}.tmp`);
        fs.writeFileSync(temporary, bytes, { flag: "wx" });
        try { fs.renameSync(temporary, blobPath); } finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
      }
      const restored = restoreCardToLibrary(card as unknown as CardLibraryRecord, storedCard as unknown as CardLibraryRecord | undefined);
      await cards.put(card.revisionId, restored as RecordValue);
      jsonBody(res, 201, { ok: true, card: publicCard(restored as unknown as NormalizedCard, allBindings()) });
    } catch (error) {
      jsonBody(res, 400, { ok: false, error: error instanceof Error ? error.message : "无法导入角色卡" });
    }
  }}));

  disposers.push(ctx.webServer.register({ kind: "exact", path: "/dsh-re3-rp/original", handler: (req: any, res: any) => {
    if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405, { Allow: "GET, HEAD" }); res.end(); return; }
    const revisionId = new URL(req.url, "http://127.0.0.1").searchParams.get("revision") ?? "";
    const card = cardFor(revisionId);
    const blobPath = path.join(blobRoot, revisionId);
    if (card === undefined || !fs.existsSync(blobPath)) { jsonBody(res, 404, { ok: false, error: "原件不存在" }); return; }
    const body = fs.readFileSync(blobPath);
    res.writeHead(200, { "Content-Type": card.sourceName.toLocaleLowerCase().endsWith(".png") ? "image/png" : "application/json", "Content-Length": body.byteLength, "Cache-Control": "private, max-age=60", "ETag": `\"${revisionId}\"` });
    res.end(req.method === "HEAD" ? undefined : body);
  }}));

  disposers.push(ctx.webServer.register({ kind: "exact", path: "/dsh-re3-rp/persona-avatar", handler: (req: any, res: any) => {
    if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405, { Allow: "GET, HEAD" }); res.end(); return; }
    const avatar = new URL(req.url, "http://127.0.0.1").searchParams.get("avatar") ?? "";
    const avatars: Record<string, { background: string; label: string }> = {
      default: { background: "#475569", label: "默" },
      traveler: { background: "#0f766e", label: "旅" },
      "northern-ranger": { background: "#1d4ed8", label: "北" },
      "jianghu-wanderer": { background: "#9a3412", label: "侠" },
    };
    const selected = avatars[avatar];
    if (selected === undefined) { jsonBody(res, 404, { ok: false, error: "找不到这个 Persona 头像" }); return; }
    const body = new TextEncoder().encode(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="24" fill="${selected.background}"/><text x="48" y="61" text-anchor="middle" font-family="system-ui,sans-serif" font-size="42" fill="#fff">${selected.label}</text></svg>`);
    res.writeHead(200, { "Content-Type": "image/svg+xml; charset=utf-8", "Content-Length": body.byteLength, "Cache-Control": "public, max-age=31536000, immutable" });
    res.end(req.method === "HEAD" ? undefined : body);
  }}));

  disposers.push(ctx.webServer.register({ kind: "exact", path: "/dsh-re3-rp/personas", handler: async (req: any, res: any) => {
    if (req.method !== "GET" && req.method !== "POST") { res.writeHead(405, { Allow: "GET, POST" }); res.end(); return; }
    try {
      const input = req.method === "POST" ? await readJson(req) : {};
      const url = new URL(req.url, "http://127.0.0.1");
      const sessionId = req.method === "POST"
        ? (typeof input.sessionId === "string" ? input.sessionId : "")
        : url.searchParams.get("sessionId") ?? "";
      const sessionBinding = sessionId.length === 0 ? undefined : bindings.get(sessionId) as unknown as Binding | undefined;
      if (sessionId.length > 0 && sessionBinding === undefined) { jsonBody(res, 404, { ok: false, error: "没有找到这个酒馆 Session" }); return; }
      const requestedRevision = req.method === "POST"
        ? (typeof input.revisionId === "string" ? input.revisionId : "")
        : url.searchParams.get("revision") ?? "";
      const revisionId = sessionBinding?.revisionId ?? requestedRevision;
      const context = { revisionId, sessionId };
      if (req.method === "GET") { jsonBody(res, 200, personaLibraryState(context)); return; }

      const action = typeof input.action === "string" ? input.action : "";
      let createdPersonaId: string | null = null;
      if (action === "create") {
        const draft = validatePersonaDraft({
          displayName: typeof input.displayName === "string" ? input.displayName : "未命名 Persona",
          content: typeof input.content === "string" ? input.content : "",
          avatar: input.avatar,
        }, "default");
        const now = new Date().toISOString();
        createdPersonaId = crypto.randomUUID();
        const record: PersonaRecord = { id: createdPersonaId, ...draft, createdAt: now, updatedAt: now };
        await personas.put(record.id, record as unknown as RecordValue);
      } else if (action === "update") {
        const personaId = typeof input.personaId === "string" ? input.personaId : "";
        const existing = personas.get(personaId) as unknown as PersonaRecord | undefined;
        if (existing === undefined) throw new Error("找不到这个 Persona");
        const draft = validatePersonaDraft(input, existing.avatar);
        await personas.put(personaId, { ...existing, ...draft, updatedAt: new Date().toISOString() } as unknown as RecordValue);
      } else if (action === "bind") {
        const personaId = typeof input.personaId === "string" ? input.personaId : "";
        if (personas.get(personaId) === undefined) throw new Error("找不到要绑定的 Persona");
        const scope = input.scope;
        if (scope !== "global" && scope !== "card" && scope !== "session") throw new Error("Persona 绑定范围无效");
        if (scope === "card" && (revisionId.length === 0 || cardFor(revisionId) === undefined)) throw new Error("当前没有可绑定的酒馆卡");
        if (scope === "session" && sessionBinding === undefined) throw new Error("当前没有可绑定的 Session");
        const targetId = scope === "global" ? "default" : scope === "card" ? revisionId : sessionId;
        const record: PersonaBindingRecord = { scope, targetId, personaId, updatedAt: new Date().toISOString() };
        await personaBindings.put(personaBindingKey(scope, targetId), record as unknown as RecordValue);
        for (const bindingKey of personaBindingKeysToClearForSelection(scope, context)) await personaBindings.delete(bindingKey);
      } else if (action === "clear") {
        const scope = input.scope;
        if (scope !== "global" && scope !== "card" && scope !== "session") throw new Error("Persona 绑定范围无效");
        const targetId = scope === "global" ? "default" : scope === "card" ? revisionId : sessionId;
        await personaBindings.delete(personaBindingKey(scope, targetId));
      } else throw new Error("不支持这个 Persona 操作");

      jsonBody(res, action === "create" ? 201 : 200, { ...personaLibraryState(context), createdPersonaId });
    } catch (error) {
      jsonBody(res, 400, { ok: false, error: error instanceof Error ? error.message : "Persona 操作失败" });
    }
  }}));

  disposers.push(ctx.webServer.register({ kind: "exact", path: "/dsh-re3-rp/opening", handler: async (req: any, res: any) => {
    if (req.method !== "GET" && req.method !== "POST") { res.writeHead(405, { Allow: "GET, POST" }); res.end(); return; }
    try {
      const input = req.method === "POST" ? await readJson(req) : {};
      const requestUrl = new URL(req.url, "http://127.0.0.1");
      const sessionId = req.method === "POST"
        ? (typeof input.sessionId === "string" ? input.sessionId : "")
        : requestUrl.searchParams.get("sessionId") ?? "";
      const binding = bindings.get(sessionId) as unknown as Binding | undefined;
      const session = ctx.sessions.get(sessionId);
      const card = binding === undefined ? undefined : cardFor(binding.revisionId);
      if (binding === undefined || session === undefined || card === undefined) {
        if (req.method === "GET" && requestUrl.searchParams.get("optional") === "1") { res.writeHead(204); res.end(); return; }
        jsonBody(res, 404, { ok: false, error: "这不是可切换开场的酒馆会话" }); return;
      }
      if (req.method === "GET") { jsonBody(res, 200, openingState(binding, card, session)); return; }
      const openingId = typeof input.openingId === "string" ? input.openingId : "";
      jsonBody(res, 200, await selectSessionOpening(sessionId, openingId));
    } catch (error) {
      const failure = error as BridgeFailure;
      jsonBody(res, failure.code === "opening_locked" ? 409 : failure.code === "bridge_unavailable" ? 404 : 400, { ok: false, error: failure.message ?? "无法切换开场" });
    }
  }}));

  disposers.push(ctx.webServer.register({ kind: "exact", path: "/dsh-re3-rp/presets", handler: async (req: any, res: any) => {
    const url = new URL(req.url, "http://127.0.0.1");
    if (req.method === "GET" && url.searchParams.has("download")) {
      const presetId = url.searchParams.get("download") ?? "";
      const preset = presetFor(presetId);
      if (preset.id !== presetId) { jsonBody(res, 404, { ok: false, error: "找不到这个预设" }); return; }
      const body = JSON.stringify(exportSillyTavernPreset(preset), null, 2);
      const filename = `${preset.name.replace(/[\\/:*?"<>|]/gu, "_") || "preset"}.json`;
      res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "no-store",
        "Content-Length": new TextEncoder().encode(body).byteLength,
      });
      res.end(body);
      return;
    }
    if (req.method === "GET") {
      jsonBody(res, 200, presetState(url.searchParams.get("sessionId") ?? ""));
      return;
    }
    if (req.method !== "POST") { res.writeHead(405, { Allow: "GET, POST" }); res.end(); return; }
    try {
      const input = await readJson(req, 8 * 1024 * 1024);
      const action = typeof input.action === "string" ? input.action : "";
      const now = new Date().toISOString();
      if (action === "import") {
        if (typeof input.preset !== "object" || input.preset === null || Array.isArray(input.preset)) throw new Error("导入内容不是酒馆 Chat Completion preset JSON");
        const requestedName = typeof input.name === "string" ? input.name.replace(/\.json$/iu, "") : "Imported preset";
        const id = crypto.randomUUID();
        const preset = normalizeTavernPreset(input.preset, { id, name: uniquePresetName(requestedName), source: "imported", now });
        await storedPresets.put(id, preset as unknown as RecordValue);
        await presetSettings.put("active", { presetId: id, updatedAt: now });
        const sessionId = typeof input.sessionId === "string" ? input.sessionId : "";
        const binding = bindings.get(sessionId) as unknown as Binding | undefined;
        if (binding !== undefined) { binding.presetId = id; await bindings.put(sessionId, binding as unknown as RecordValue); }
        jsonBody(res, 201, { ...presetState(sessionId), importedPresetId: id });
        return;
      }
      if (action === "create") {
        const base = presetFor(typeof input.basePresetId === "string" ? input.basePresetId : activePresetId());
        const id = crypto.randomUUID();
        const requestedName = typeof input.name === "string" ? input.name : `${base.name} 副本`;
        const preset = normalizeTavernPreset({ ...base, revision: 1, createdAt: now, updatedAt: now }, { id, name: uniquePresetName(requestedName), source: "created", now });
        await storedPresets.put(id, preset as unknown as RecordValue);
        await presetSettings.put("active", { presetId: id, updatedAt: now });
        const sessionId = typeof input.sessionId === "string" ? input.sessionId : "";
        const binding = bindings.get(sessionId) as unknown as Binding | undefined;
        if (binding !== undefined) { binding.presetId = id; await bindings.put(sessionId, binding as unknown as RecordValue); }
        jsonBody(res, 201, { ...presetState(sessionId), createdPresetId: id });
        return;
      }
      if (action === "save") {
        const requested = input.preset;
        if (typeof requested !== "object" || requested === null || Array.isArray(requested)) throw new Error("缺少要保存的预设");
        let id = typeof (requested as RecordValue).id === "string" ? (requested as RecordValue).id as string : "";
        if (id.length === 0) throw new Error("缺少要保存的预设 id");
        if (id === DEFAULT_TAVERN_PRESET.id) {
          id = crypto.randomUUID();
          const requestedName = typeof (requested as RecordValue).name === "string" ? (requested as RecordValue).name as string : DEFAULT_TAVERN_PRESET.name;
          const preset = normalizeTavernPreset({ ...(requested as RecordValue), revision: 1, createdAt: now, updatedAt: now }, { id, name: uniquePresetName(`${requestedName} 副本`), source: "created", now });
          await storedPresets.put(id, preset as unknown as RecordValue);
          await presetSettings.put("active", { presetId: id, updatedAt: now });
          const sessionId = typeof input.sessionId === "string" ? input.sessionId : "";
          const binding = bindings.get(sessionId) as unknown as Binding | undefined;
          if (binding !== undefined) { binding.presetId = id; await bindings.put(sessionId, binding as unknown as RecordValue); }
          jsonBody(res, 201, { ...presetState(sessionId), savedPresetId: id });
          return;
        }
        const existingValue = storedPresets.get(id) as RecordValue | undefined;
        if (existingValue === undefined) throw new Error("要保存的预设已经不存在");
        const existing = presetFor(id);
        const requestedName = typeof (requested as RecordValue).name === "string" ? (requested as RecordValue).name as string : existing.name;
        const preset = normalizeTavernPreset({ ...(requested as RecordValue), revision: existing.revision + 1, createdAt: existing.createdAt, updatedAt: now }, { id, name: uniquePresetName(requestedName, id), source: existing.source, now });
        await storedPresets.put(id, preset as unknown as RecordValue);
        jsonBody(res, 200, { ...presetState(typeof input.sessionId === "string" ? input.sessionId : ""), savedPresetId: id });
        return;
      }
      if (action === "activate" || action === "bind") {
        const preset = presetFor(typeof input.presetId === "string" ? input.presetId : "");
        if (typeof input.presetId !== "string" || preset.id !== input.presetId) throw new Error("找不到要启用的预设");
        await presetSettings.put("active", { presetId: preset.id, updatedAt: now });
        if (action === "bind") {
          const sessionId = typeof input.sessionId === "string" ? input.sessionId : "";
          const binding = bindings.get(sessionId) as unknown as Binding | undefined;
          if (binding === undefined) throw new Error("当前页面没有可绑定预设的酒馆 Session");
          binding.presetId = preset.id;
          await bindings.put(sessionId, binding as unknown as RecordValue);
        }
        jsonBody(res, 200, presetState(typeof input.sessionId === "string" ? input.sessionId : ""));
        return;
      }
      if (action === "delete") {
        const presetId = typeof input.presetId === "string" ? input.presetId : "";
        if (presetId === DEFAULT_TAVERN_PRESET.id) throw new Error("内置 Default 不可删除");
        if (storedPresets.get(presetId) === undefined) throw new Error("要删除的预设已经不存在");
        const usedBy = allBindings().filter((binding) => binding.presetId === presetId);
        if (usedBy.length > 0) {
          jsonBody(res, 409, { ok: false, error: `还有 ${usedBy.length} 个 Session 正在使用这个预设，请先切换这些 Session` });
          return;
        }
        const wasActive = activePresetId() === presetId;
        await storedPresets.delete(presetId);
        if (wasActive) await presetSettings.put("active", { presetId: DEFAULT_TAVERN_PRESET.id, updatedAt: now });
        jsonBody(res, 200, presetState(typeof input.sessionId === "string" ? input.sessionId : ""));
        return;
      }
      throw new Error("未知的预设操作");
    } catch (error) {
      jsonBody(res, 400, { ok: false, error: error instanceof Error ? error.message : "预设操作失败" });
    }
  }}));

  disposers.push(ctx.webServer.register({ kind: "exact", path: "/dsh-re3-rp/sessions", handler: async (req: any, res: any) => {
    if (req.method === "DELETE" && hostGlobal.process.env.DSH_RE3_RP_VERIFY === "1") {
      const input = await readJson(req);
      const sessionId = typeof input.sessionId === "string" ? input.sessionId : "";
      const handle = handles.get(sessionId);
      if (handle !== undefined) {
        handles.delete(sessionId);
        await handle.dispose();
      }
      await bindings.delete(sessionId);
      await personaBindings.delete(personaBindingKey("session", sessionId));
      variableReplyGate.discard(sessionId);
      await variableStates.delete(sessionId);
      for (const [key, value] of variableEvents.entries() as IterableIterator<[string, RecordValue]>) if (value.sessionId === sessionId) await variableEvents.delete(key);
      await frontendStates.delete(sessionId);
      for (const [key, value] of frontendEvents.entries() as IterableIterator<[string, RecordValue]>) if (value.sessionId === sessionId) await frontendEvents.delete(key);
      for (const [key, value] of frontendReceipts.entries() as IterableIterator<[string, RecordValue]>) if (value.sessionId === sessionId) await frontendReceipts.delete(key);
      for (const [key, value] of frontendAssets.entries() as IterableIterator<[string, RecordValue]>) if (value.sessionId === sessionId) await frontendAssets.delete(key);
      jsonBody(res, 200, { ok: true, sessionId });
      return;
    }
    if (req.method !== "POST") { res.writeHead(405, { Allow: "POST" }); res.end(); return; }
    let sessionId = "";
    try {
      const input = await readJson(req);
      const revisionId = typeof input.revisionId === "string" ? input.revisionId : "";
      const openingId = typeof input.openingId === "string" ? input.openingId : "";
      const userName = typeof input.userName === "string" ? input.userName.trim() : "";
      const card = cardFor(revisionId);
      const opening = card?.openings.find((candidate) => candidate.id === openingId);
      if (card === undefined || opening === undefined || userName.length === 0) throw new Error("缺少卡片 revision、开场选择或玩家名字");
      if (card.playability === "blocked") throw new Error(card.statusDetail);
      const runtimeMissing = missingRuntimeCriticalApis(card);
      if (runtimeMissing.length > 0) throw new Error(`当前 Host 运行时缺少卡内启动关键接口：${runtimeMissing.join("、")}`);
      sessionId = crypto.randomUUID();
      const selection = ctx.agentDefaultModel.currentSelection();
      const inheritedPersona = resolvedPersona({ revisionId })?.persona;
      const selectedPreset = presetFor(typeof input.presetId === "string" ? input.presetId : activePresetId());
      const renderedOpening = substituteCardMacros(opening.message, { userName: inheritedPersona?.displayName ?? userName, characterName: card.title });
      const binding: Binding = {
        sessionId, revisionId, openingId, userName,
        openingDigest: await sha256(new TextEncoder().encode(renderedOpening)),
        provider: selection.provider, model: selection.model, presetId: selectedPreset.id,
        createdAt: new Date().toISOString(), normalizedIndexVersion: NORMALIZED_CARD_INDEX_VERSION,
        lastAssemblyId: `${sessionId}:prepared`,
        lastActiveEntryIds: [],
        mvuSettings: defaultMvuSessionSettings({ provider: selection.provider, model: selection.model, supportsExtraModel: supportsExtraModel(card) }),
      };
      await bindings.put(sessionId, binding as unknown as RecordValue);
      await initializeVariables(sessionId, card, openingId);
      await initializeFrontend(sessionId, card);
      const handle = await ctx.agents.create({
        sessionId,
        seed: createTavernSessionSeed(renderedOpening, [], Date.now(), {
          assemblyId: `${sessionId}:prepared`,
          presetName: selectedPreset.name,
          activeEntries: 0,
          filteredEntries: card.worldbook.length,
          depthInjections: 0,
          messageCount: 0,
          characterCount: 0,
          addedEntryIds: [],
          removedEntryIds: [],
          previousAssemblyId: null,
          stage: "prepared",
        }),
        meta: { cwd: hostGlobal.process.cwd() },
        agentOptions: { provider: binding.provider, model: binding.model },
        setup: setupAgent(sessionId, card, binding),
      });
      handles.set(sessionId, handle);
      await ctx.sessions.flush(handle.agent.session);
      jsonBody(res, 201, { ok: true, sessionId, revisionId, openingId, openingDigest: binding.openingDigest });
    } catch (error) {
      if (sessionId.length > 0) {
        const handle = handles.get(sessionId);
        if (handle !== undefined) {
          handles.delete(sessionId);
          await handle.dispose();
        }
        await bindings.delete(sessionId);
        await personaBindings.delete(personaBindingKey("session", sessionId));
        variableReplyGate.discard(sessionId);
        await variableStates.delete(sessionId);
        for (const [key, value] of variableEvents.entries() as IterableIterator<[string, RecordValue]>) if (value.sessionId === sessionId) await variableEvents.delete(key);
        await frontendStates.delete(sessionId);
        for (const [key, value] of frontendEvents.entries() as IterableIterator<[string, RecordValue]>) if (value.sessionId === sessionId) await frontendEvents.delete(key);
        for (const [key, value] of frontendReceipts.entries() as IterableIterator<[string, RecordValue]>) if (value.sessionId === sessionId) await frontendReceipts.delete(key);
        for (const [key, value] of frontendAssets.entries() as IterableIterator<[string, RecordValue]>) if (value.sessionId === sessionId) await frontendAssets.delete(key);
      }
      jsonBody(res, 400, { ok: false, error: error instanceof Error ? error.message : "无法创建卡片会话" });
    }
  }}));

  disposers.push(ctx.webServer.register({ kind: "exact", path: "/dsh-re3-rp/session-proof", handler: async (req: any, res: any) => {
    if (req.method !== "GET") { res.writeHead(405, { Allow: "GET" }); res.end(); return; }
    const sessionId = new URL(req.url, "http://127.0.0.1").searchParams.get("sessionId") ?? "";
    const binding = bindings.get(sessionId) as unknown as Binding | undefined;
    const session = ctx.sessions.get(sessionId);
    if (binding === undefined || session === undefined) { jsonBody(res, 404, { ok: false, error: "找不到卡片会话" }); return; }
    const openingSeq = currentOpeningSurfaceSeq(session);
    const firstAssistant = openingSeq === undefined ? undefined : session.events[openingSeq];
    const firstText = messageText(firstAssistant?.data?.message ?? firstAssistant?.data);
    const actualOpeningDigest = await sha256(new TextEncoder().encode(firstText));
    const variableState = variableStates.get(sessionId) as unknown as VariableStateRecord | undefined;
    jsonBody(res, 200, {
      ok: true,
      sessionId,
      revisionId: binding.revisionId,
      openingId: binding.openingId,
      normalizedIndexVersion: binding.normalizedIndexVersion,
      firstAssistantEvent: firstAssistant?.type ?? null,
      firstAssistantLength: firstText.length,
      actualOpeningDigest,
      expectedOpeningDigest: binding.openingDigest,
      openingMatches: actualOpeningDigest === binding.openingDigest,
      variableStateDigest: variableState?.digest ?? null,
      variableOpeningId: variableState?.selectedOpeningId ?? null,
    });
  }}));

  disposers.push(ctx.webServer.register({ kind: "exact", path: "/dsh-re3-rp/mvu-control", handler: async (req: any, res: any) => {
    if (req.method !== "POST") { res.writeHead(405, { Allow: "POST" }); res.end(); return; }
    try {
      const input = await readJson(req);
      const sessionId = typeof input.sessionId === "string" ? input.sessionId : "";
      const action = typeof input.action === "string" ? input.action : "";
      const binding = bindings.get(sessionId) as unknown as Binding | undefined;
      const card = binding === undefined ? undefined : cardFor(binding.revisionId);
      if (binding === undefined || card === undefined) throw new Error("找不到酒馆 Session");
      let result: unknown;
      if (action === "updateSettings") {
        binding.mvuSettings = normalizeMvuSessionSettings(input.settings, {
          provider: binding.provider,
          model: binding.model,
          supportsExtraModel: supportsExtraModel(card),
        });
        await bindings.put(sessionId, binding as unknown as RecordValue);
        result = binding.mvuSettings;
      } else if (action === "reprocessVariables") {
        result = await reprocessVariables(sessionId);
      } else if (action === "reloadInitialVariables") {
        result = await reloadInitialVariables(sessionId, card);
      } else if (action === "retryExtraModelParsing") {
        const settings = mvuSettingsFor(binding, card);
        if (settings.updateMethod !== "额外模型解析") throw new Error("变量更新方式不是“额外模型解析”");
        const narrative = assistantVariableReplies(ctx.sessions.get(sessionId)).at(-1);
        if (narrative === undefined) throw new Error("当前 Session 还没有可重试的剧情回复");
        const compiled = pendingAssemblies.get(sessionId)?.updateCompiled
          ?? [
            "你只负责根据已经完成的剧情更新 MVU 变量，不得续写剧情。",
            ...card.worldbook.filter((entry) => /\[mvu_update\]/iu.test(entry.comment)).map((entry) => entry.content),
            `当前变量状态：\n${JSON.stringify((variableStates.get(sessionId) as unknown as VariableStateRecord | undefined)?.state ?? {}, null, 2)}`,
          ].join("\n\n");
        result = await runSplitMvuUpdate(sessionId, binding, card, compiled, narrative);
      } else {
        throw new Error("未知的 MVU 控制动作");
      }
      jsonBody(res, 200, { ok: true, action, result });
    } catch (error) {
      jsonBody(res, 400, { ok: false, error: error instanceof Error ? error.message : "MVU 操作失败" });
    }
  }}));

  disposers.push(ctx.webServer.register({ kind: "exact", path: "/dsh-re3-rp/capability-snapshot", handler: (req: any, res: any) => {
    if (req.method !== "GET") { res.writeHead(405, { Allow: "GET" }); res.end(); return; }
    const url = new URL(req.url, "http://127.0.0.1");
    const requestedSessionId = url.searchParams.get("sessionId") ?? "";
    const requestedRevisionId = url.searchParams.get("revision") ?? "";
    const binding = requestedSessionId.length === 0 ? undefined : bindings.get(requestedSessionId) as unknown as Binding | undefined;
    const revisionId = binding?.revisionId ?? requestedRevisionId;
    const card = cardFor(revisionId);
    if (card === undefined) { jsonBody(res, 404, { ok: false, error: "没有找到这张酒馆卡" }); return; }
    if (requestedSessionId.length > 0 && binding === undefined) { jsonBody(res, 404, { ok: false, error: "没有找到这个酒馆 Session" }); return; }

    const session = binding === undefined ? undefined : ctx.sessions.get(binding.sessionId);
    const trace = binding?.lastAssemblyId === undefined ? undefined : traces.get(binding.lastAssemblyId) as RecordValue | undefined;
    const variableRecord = binding === undefined ? undefined : variableStates.get(binding.sessionId) as unknown as VariableStateRecord | undefined;
    const variableEventRows = binding === undefined ? [] : Array.from(variableEvents.entries() as IterableIterator<[string, RecordValue]>)
      .flatMap(([, event]) => event.sessionId === binding.sessionId ? [event] : [])
      .sort((left, right) => Number(left.sequence) - Number(right.sequence));
    const frontendRecord = binding === undefined ? undefined : frontendStates.get(binding.sessionId) as unknown as FrontendStateRecord | undefined;
    const frontendEventRows = binding === undefined ? [] : frontendEventsAfter(binding.sessionId, -1);
    const compatibilityCallRows = frontendEventRows.filter((event) => event.type === "compatibility_call_observed");
    const frontendReceiptCount = binding === undefined ? 0 : Array.from(frontendReceipts.entries() as IterableIterator<[string, RecordValue]>)
      .filter(([key]) => key.startsWith(`${binding.sessionId}:`)).length;
    const macroValues = binding === undefined ? undefined : {
      userName: effectiveUserName(binding),
      characterName: card.title,
      messageVariables: variableRecord?.state,
      macroSeed: binding.sessionId,
    };
    const projectedMessages = binding === undefined || session === undefined
      ? []
      : groupFrontendMessagesForNativeFlow(projectFrontendMessages(session, card.messageRegexScripts, macroValues));
    const regexMatches = projectedMessages.flatMap((message) => message.rawText === undefined ? [] : [{
      seq: message.seq,
      role: message.role,
      before: message.rawText,
      after: message.text,
    }]);
    const assembly = typeof trace?.assembly === "object" && trace.assembly !== null ? trace.assembly : null;
    const selectedPreset = binding === undefined ? DEFAULT_TAVERN_PRESET : bindingPreset(binding);
    const preset = { id: selectedPreset.id, name: selectedPreset.name, source: selectedPreset.source, revision: selectedPreset.revision };
    jsonBody(res, 200, {
      ok: true,
      card: publicCardDetail(card, allBindings(), binding?.worldbookEnabledOverrides),
      session: binding === undefined ? null : {
        id: binding.sessionId,
        revisionId: binding.revisionId,
        openingId: binding.openingId,
        userName: effectiveUserName(binding),
        provider: binding.provider,
        model: binding.model,
        createdAt: binding.createdAt,
        preset,
        splitMvu: binding.splitMvu ?? null,
        supportsExtraModel: supportsExtraModel(card),
        mvuSettings: mvuSettingsFor(binding, card),
      },
      context: binding === undefined || trace === undefined ? null : {
        assemblyId: binding.lastAssemblyId,
        capturedAt: trace.capturedAt ?? null,
        provider: trace.provider ?? binding.provider,
        model: trace.model ?? binding.model,
        requestDigest: trace.requestDigest ?? null,
        ejsDiagnostics: trace.ejsDiagnostics ?? [],
        assembly,
      },
      regex: {
        scripts: card.messageRegexScripts,
        matches: regexMatches,
      },
      frontend: {
        definition: card.frontendDefinition ?? null,
        companionScripts: card.tavernHelperScripts,
        state: frontendRecord?.state ?? null,
        stateDigest: frontendRecord?.stateDigest ?? null,
        updatedAt: frontendRecord?.updatedAt ?? null,
        events: frontendEventRows,
        receiptCount: frontendReceiptCount,
        capabilities: card.frontendDefinition === undefined ? [] : bridgeCapabilities(card.frontendDefinition),
        variables: variableRecord === undefined ? null : {
          selectedOpeningId: variableRecord.selectedOpeningId,
          state: variableRecord.state,
          digest: variableRecord.digest,
          updatedAt: variableRecord.updatedAt,
          initializationStatus: variableRecord.initialSnapshots[variableRecord.selectedOpeningId]?.status ?? "failed",
          events: variableEventRows,
        },
        compatibilityCatalog: compatibilityCallCatalog(),
        compatibilityCalls: compatibilityCallRows,
      },
      persona: {
        displayName: (binding === undefined ? resolvedPersona({ revisionId }) : activePersona(binding))?.persona.displayName ?? binding?.userName ?? "",
        content: (binding === undefined ? resolvedPersona({ revisionId }) : activePersona(binding))?.persona.content ?? null,
        avatar: (binding === undefined ? resolvedPersona({ revisionId }) : activePersona(binding))?.persona.avatar ?? null,
        lorebook: null,
        bindingScope: (binding === undefined ? resolvedPersona({ revisionId }) : activePersona(binding))?.binding.scope ?? null,
        backendAvailable: true,
        libraryCount: Array.from(personas.entries()).length,
      },
    });
  }}));

  disposers.push(ctx.webServer.register({ kind: "exact", path: "/dsh-re3-rp/variables", handler: (req: any, res: any) => {
    if (req.method !== "GET") { res.writeHead(405, { Allow: "GET" }); res.end(); return; }
    const sessionId = new URL(req.url, "http://127.0.0.1").searchParams.get("sessionId") ?? "";
    const record = variableStates.get(sessionId) as unknown as VariableStateRecord | undefined;
    if (record === undefined) { jsonBody(res, 404, { ok: false, error: "找不到酒馆变量状态" }); return; }
    const events = Array.from(variableEvents.entries() as IterableIterator<[string, RecordValue]>).flatMap(([, event]) => event.sessionId === sessionId ? [event] : []);
    jsonBody(res, 200, { ok: true, sessionId, revisionId: record.revisionId, selectedOpeningId: record.selectedOpeningId, state: record.state, digest: record.digest, events });
  }}));

  // Expose a read-only message projection for the native DSH conversation.
  // The DSH Session remains authoritative.
  disposers.push(ctx.webServer.register({ kind: "exact", path: "/dsh-re3-rp/conversation-projection", handler: (req: any, res: any) => {
    if (req.method !== "GET") { res.writeHead(405, { Allow: "GET" }); res.end(); return; }
    const url = new URL(req.url, "http://127.0.0.1");
    const sessionId = url.searchParams.get("sessionId") ?? "";
    const binding = bindings.get(sessionId) as unknown as Binding | undefined;
    const session = ctx.sessions.get(sessionId);
    const card = binding === undefined ? undefined : cardFor(binding.revisionId);
    if (binding === undefined || session === undefined || card === undefined) {
      if (url.searchParams.get("optional") === "1") { res.writeHead(204); res.end(); return; }
      jsonBody(res, 404, { ok: false, error: "找不到酒馆 Session" }); return;
    }
    const frontend = frontendStates.get(sessionId) as unknown as FrontendStateRecord | undefined;
    const variableState = variableStates.get(sessionId) as unknown as VariableStateRecord | undefined;
    jsonBody(res, 200, {
      ok: true,
      sessionId,
      title: card.title,
      revisionId: card.revisionId,
      messages: groupFrontendMessagesForNativeFlow(projectFrontendMessages(session, card.messageRegexScripts, { userName: effectiveUserName(binding), characterName: card.title, messageVariables: variableState?.state, macroSeed: sessionId })),
      variableState: variableState?.state ?? {},
      frontendStorage: binding.frontendStorage ?? {},
      companionScripts: card.tavernHelperScripts ?? [],
      frontend: frontend === undefined || card.frontendDefinition === undefined ? null : {
        cardId: frontend.cardId,
        caseId: frontend.caseId,
        container: card.frontendDefinition.container,
        state: frontend.state,
        stateDigest: frontend.stateDigest,
        ...(hostedFrontendEntry(sessionId, card.frontendDefinition) === undefined ? {} : { entryUrl: hostedFrontendEntry(sessionId, card.frontendDefinition) }),
      },
    });
  }}));

  disposers.push(ctx.webServer.register({ kind: "exact", path: "/dsh-re3-rp/frontend", handler: (req: any, res: any) => {
    if (req.method !== "GET") { res.writeHead(405, { Allow: "GET" }); res.end(); return; }
    try {
      const sessionId = new URL(req.url, "http://127.0.0.1").searchParams.get("sessionId") ?? "";
      const { binding, card, definition, record } = frontendContext(sessionId);
      const opening = card.openings.find((candidate) => candidate.id === binding.openingId);
      if (opening === undefined) throw bridgeFailure("bridge_unavailable", "卡内前端找不到绑定开场");
      const renderedOpening = substituteCardMacros(opening.message, { userName: effectiveUserName(binding), characterName: card.title });
      jsonBody(res, 200, {
        ok: true,
        sessionId,
        cardId: definition.cardId,
        contentDigest: card.revisionId,
        caseId: definition.caseId,
        runtimeClass: definition.runtimeClass,
        container: definition.container,
        capabilities: bridgeCapabilities(definition),
        stateDigest: record.stateDigest,
        ...(definition.container === "message-html" || definition.container === "message-iframe"
          ? { srcDoc: adaptOpeningFrontendHtml(renderedOpening, sessionId, definition) }
          : { entryUrl: hostedFrontendEntry(sessionId, definition) }),
      });
    } catch (error) {
      const failure = error as BridgeFailure;
      jsonBody(res, failure.code === "bridge_unavailable" ? 404 : 400, { ok: false, error: { code: failure.code ?? "bridge_unavailable", message: failure.message ?? "无法读取卡内前端" } });
    }
  }}));

  disposers.push(ctx.webServer.register({ kind: "exact", path: "/dsh-re3-rp/bridge", handler: async (req: any, res: any) => {
    if (req.method !== "POST") { res.writeHead(405, { Allow: "POST" }); res.end(); return; }
    try {
      const input = await readJson(req);
      const sessionId = typeof input.sessionId === "string" ? input.sessionId : "";
      const method = typeof input.method === "string" ? input.method : "";
      const payload = typeof input.payload === "object" && input.payload !== null && !Array.isArray(input.payload) ? input.payload as RecordValue : {};
      const operationId = input.operationId ?? payload.operationId;
      let result: unknown;
      if (method === "reportCompatibilityCall") result = await appendCompatibilityCall(sessionId, operationId, payload);
      else if (method === "generate") result = await generateAuxiliaryText(sessionId, operationId, payload);
      else if (method === "cancelGenerate") result = cancelAuxiliaryGeneration(sessionId, operationId);
      else if (method === "getCardState") result = cardStateProjection(sessionId);
      else if (method === "replaceCardState") result = await replaceCardState(sessionId, operationId, payload);
      else if (method === "replaceCardStorage") result = await replaceCardStorage(sessionId, payload);
      else if (method === "getWorldbook") result = compatibleWorldbook(sessionId);
      else if (method === "updateWorldbook") result = await updateCardWorldbook(sessionId, operationId, payload);
      else if (method === "selectOpening") result = await selectOpeningFromChatMessages(sessionId, operationId, payload);
      else if (method === "submitTurn") {
        const binding = bindings.get(sessionId) as unknown as Binding | undefined;
        const card = binding === undefined ? undefined : cardFor(binding.revisionId);
        result = card?.frontendDefinition === undefined
          ? await submitCardTurn(sessionId, operationId, payload)
          : await submitFrontendTurn(sessionId, operationId, payload);
      } else {
        const { definition, record } = frontendContext(sessionId);
        if (method === "connect") result = { sessionId, cardId: record.cardId, contentDigest: record.contentDigest, protocolVersion: "dsh-re3-rp-v1", capabilities: bridgeCapabilities(definition) };
        else if (method === "getProjection") result = frontendProjection(sessionId);
        else if (method === "getEvents") result = { events: frontendEventsAfter(sessionId, typeof payload.after === "number" ? payload.after : -1) };
        else if (method === "submitStateAction") result = await submitFrontendStateAction(sessionId, operationId, payload);
        else if (method === "resolveAsset") result = await resolveFrontendAsset(sessionId, payload);
        else throw bridgeFailure("capability_denied", `Bridge 不支持 ${method || "空方法"}`);
      }
      jsonBody(res, 200, { ok: true, result });
    } catch (error) {
      const failure = error as BridgeFailure;
      const code = failure.code ?? "bridge_unavailable";
      const status = code === "capability_denied" ? 403 : code === "invalid_action" ? 400 : code === "asset_unavailable" ? 404 : code === "opening_locked" || code === "asset_digest_mismatch" || code === "state_commit_failed" ? 409 : 500;
      jsonBody(res, status, { ok: false, error: { code, message: failure.message ?? "Bridge 调用失败" } });
    }
  }}));

  disposers.push(ctx.webServer.register({ kind: "exact", path: "/dsh-re3-rp/asset", handler: (req: any, res: any) => {
    if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405, { Allow: "GET, HEAD" }); res.end(); return; }
    const token = new URL(req.url, "http://127.0.0.1").searchParams.get("token") ?? "";
    const asset = frontendAssets.get(token) as RecordValue | undefined;
    if (asset === undefined || typeof asset.path !== "string" || !fs.existsSync(asset.path)) { jsonBody(res, 404, { ok: false, error: { code: "asset_unavailable", message: "固化资源不存在" } }); return; }
    textBody(res, 200, typeof asset.contentType === "string" ? asset.contentType : "application/octet-stream", new Uint8Array(fs.readFileSync(asset.path)), req.method);
  }}));

  const appSessionId = (req: any): string => new URL(req.url, "http://127.0.0.1").searchParams.get("sessionId") ?? "";
  disposers.push(ctx.webServer.register({ kind: "exact", path: "/dsh-re3-rp/frontend-standalone/index.html", handler: (req: any, res: any) => {
    if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405, { Allow: "GET, HEAD" }); res.end(); return; }
    const sessionId = appSessionId(req);
    textBody(res, 200, "text/html; charset=utf-8", standaloneIndex.replace('src="./main.js"', `src="./main.js?sessionId=${encodeURIComponent(sessionId)}"`), req.method);
  }}));
  disposers.push(ctx.webServer.register({ kind: "exact", path: "/dsh-re3-rp/frontend-standalone/core.js", handler: (req: any, res: any) => {
    if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405, { Allow: "GET, HEAD" }); res.end(); return; }
    textBody(res, 200, "text/javascript; charset=utf-8", standaloneCore, req.method);
  }}));
  disposers.push(ctx.webServer.register({ kind: "exact", path: "/dsh-re3-rp/frontend-standalone/style.css", handler: (req: any, res: any) => {
    if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405, { Allow: "GET, HEAD" }); res.end(); return; }
    textBody(res, 200, "text/css; charset=utf-8", standaloneStyle, req.method);
  }}));
  disposers.push(ctx.webServer.register({ kind: "exact", path: "/dsh-re3-rp/frontend-standalone/main.js", handler: (req: any, res: any) => {
    if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405, { Allow: "GET, HEAD" }); res.end(); return; }
    textBody(res, 200, "text/javascript; charset=utf-8", standaloneMain(appSessionId(req)), req.method);
  }}));
  disposers.push(ctx.webServer.register({ kind: "exact", path: "/dsh-re3-rp/frontend-required/index.html", handler: (req: any, res: any) => {
    if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405, { Allow: "GET, HEAD" }); res.end(); return; }
    const sessionId = appSessionId(req);
    textBody(res, 200, "text/html; charset=utf-8", requiredAssetIndex.replace('src="./main.js"', `src="./main.js?sessionId=${encodeURIComponent(sessionId)}"`), req.method);
  }}));
  disposers.push(ctx.webServer.register({ kind: "exact", path: "/dsh-re3-rp/frontend-required/main.js", handler: (req: any, res: any) => {
    if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405, { Allow: "GET, HEAD" }); res.end(); return; }
    textBody(res, 200, "text/javascript; charset=utf-8", requiredAssetMain(appSessionId(req)), req.method);
  }}));

  disposers.push(ctx.webServer.register({ kind: "exact", path: "/dsh-re3-rp/surface-audit", handler: (req: any, res: any) => {
    if (req.method !== "GET") { res.writeHead(405, { Allow: "GET" }); res.end(); return; }
    const url = new URL(req.url, "http://127.0.0.1");
    const sessionId = url.searchParams.get("sessionId") ?? "";
    const binding = bindings.get(sessionId) as unknown as Binding | undefined;
    const session = ctx.sessions.get(sessionId);
    if (binding === undefined || session === undefined) {
      if (url.searchParams.get("optional") === "1") { res.writeHead(204); res.end(); return; }
      jsonBody(res, 404, { ok: false, error: "找不到卡片会话" }); return;
    }
    jsonBody(res, 200, {
      ok: true,
      sessionId,
      currentSurface: Array.isArray(session.surface?.nodes) ? session.surface.nodes : [],
      operations: tavernSurfaceAudit(session),
    });
  }}));

  disposers.push(ctx.webServer.register({ kind: "exact", path: "/dsh-re3-rp/surface-event", handler: (req: any, res: any) => {
    if (req.method !== "GET") { res.writeHead(405, { Allow: "GET" }); res.end(); return; }
    const url = new URL(req.url, "http://127.0.0.1");
    const sessionId = url.searchParams.get("sessionId") ?? "";
    const seq = Number(url.searchParams.get("seq"));
    const binding = bindings.get(sessionId) as unknown as Binding | undefined;
    const session = ctx.sessions.get(sessionId);
    if (binding === undefined || session === undefined) { jsonBody(res, 404, { ok: false, error: "找不到卡片会话" }); return; }
    const detail = Number.isInteger(seq) ? tavernSurfaceEventDetail(session, seq) : undefined;
    if (detail === undefined) { jsonBody(res, 404, { ok: false, error: "找不到这个 Surface 事件" }); return; }
    const trace = detail.assembly?.assemblyId ? traces.get(detail.assembly.assemblyId) : undefined;
    jsonBody(res, 200, {
      ok: true,
      sessionId,
      event: detail,
      assembly: trace?.assembly ?? null,
      runtime: trace === undefined ? null : { provider: trace.provider ?? "", model: trace.model ?? "" },
    });
  }}));

  if (hostGlobal.process.env.DSH_RE3_RP_VERIFY === "1") {
    disposers.push(ctx.webServer.register({ kind: "exact", path: "/dsh-re3-rp/verify/runtime", handler: async (req: any, res: any) => {
      if (req.method !== "GET") { res.writeHead(405, { Allow: "GET" }); res.end(); return; }
      jsonBody(res, 200, { instanceId: verificationInstanceId });
    }}));

    disposers.push(ctx.webServer.register({ kind: "exact", path: "/dsh-re3-rp/verify/settings", handler: async (req: any, res: any) => {
      if (req.method !== "POST") { res.writeHead(405, { Allow: "POST" }); res.end(); return; }
      try {
        const input = await readJson(req);
        const sessionId = typeof input.sessionId === "string" ? input.sessionId : "";
        const binding = bindings.get(sessionId) as unknown as Binding | undefined;
        const value = input.worldInfoMaxRecursionSteps;
        if (binding === undefined) throw new Error("找不到可配置的卡片会话");
        if (typeof value !== "number" || !Number.isInteger(value) || value < 0) throw new Error("worldInfoMaxRecursionSteps 必须是非负整数");
        binding.worldInfoMaxRecursionSteps = value;
        await bindings.put(sessionId, binding as unknown as RecordValue);
        jsonBody(res, 200, { ok: true, sessionId, worldInfoMaxRecursionSteps: value });
      } catch (error) {
        jsonBody(res, 400, { ok: false, error: error instanceof Error ? error.message : "无法设置验证参数" });
      }
    }}));

    disposers.push(ctx.webServer.register({ kind: "exact", path: "/dsh-re3-rp/verify/variables", handler: async (req: any, res: any) => {
      if (req.method !== "POST") { res.writeHead(405, { Allow: "POST" }); res.end(); return; }
      try {
        const input = await readJson(req);
        const sessionId = typeof input.sessionId === "string" ? input.sessionId : "";
        const body = typeof input.body === "string" ? input.body : "";
        if (variableStates.get(sessionId) === undefined || body.length === 0) throw new Error("缺少酒馆会话或固定回复正文");
        const result = await updateVariablesFromReply(sessionId, body);
        const record = variableStates.get(sessionId) as unknown as VariableStateRecord;
        jsonBody(res, 200, { ok: true, sessionId, status: result?.status ?? "ignored", diagnostics: result?.diagnostics ?? [], state: record.state, digest: record.digest });
      } catch (error) {
        jsonBody(res, 400, { ok: false, error: error instanceof Error ? error.message : "变量验证失败" });
      }
    }}));

    disposers.push(ctx.webServer.register({ kind: "exact", path: "/dsh-re3-rp/verify/assistant", handler: async (req: any, res: any) => {
      if (req.method !== "POST") { res.writeHead(405, { Allow: "POST" }); res.end(); return; }
      try {
        const input = await readJson(req);
        const sessionId = typeof input.sessionId === "string" ? input.sessionId : "";
        const body = typeof input.body === "string" ? input.body : "";
        const session = ctx.sessions.get(sessionId);
        if (session === undefined || variableStates.get(sessionId) === undefined || body.length === 0) throw new Error("缺少酒馆会话或固定 Oracle 回复正文");
        const message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: [{ type: "text", text: body }],
          source: { kind: "model", provider: "dsh-re3-rp-verification", model: "fixed-real-card-oracle" },
        };
        const turn = Math.max(1, Math.ceil((projectFrontendMessages(session).length + 1) / 2));
        session.append("assistant/message", { turn, step: 1, message }, { surfaceOp: "append" });
        const result = await updateVariablesFromReply(sessionId, body);
        await ctx.sessions.flush(session);
        const record = variableStates.get(sessionId) as unknown as VariableStateRecord;
        jsonBody(res, 200, { ok: true, sessionId, status: result?.status ?? "ignored", diagnostics: result?.diagnostics ?? [], digest: record.digest, messageId: message.id });
      } catch (error) {
        jsonBody(res, 400, { ok: false, error: error instanceof Error ? error.message : "固定 Oracle 回复验证失败" });
      }
    }}));

    disposers.push(ctx.webServer.register({ kind: "exact", path: "/dsh-re3-rp/verify/fork", handler: async (req: any, res: any) => {
      if (req.method !== "POST") { res.writeHead(405, { Allow: "POST" }); res.end(); return; }
      let childSessionId = "";
      let childHandle: any;
      try {
        const input = await readJson(req);
        const sourceSessionId = typeof input.sessionId === "string" ? input.sessionId : "";
        const sourceBinding = bindings.get(sourceSessionId) as unknown as Binding | undefined;
        const source = ctx.sessions.get(sourceSessionId);
        if (sourceBinding === undefined || source === undefined) throw new Error("找不到可 Fork 的酒馆 Session");
        childSessionId = crypto.randomUUID();
        const childBinding: Binding = { ...sourceBinding, sessionId: childSessionId, createdAt: new Date().toISOString() };
        await bindings.put(childSessionId, childBinding as unknown as RecordValue);
        const sourcePersonaBinding = personaBindings.get(personaBindingKey("session", sourceSessionId)) as unknown as PersonaBindingRecord | undefined;
        if (sourcePersonaBinding !== undefined) {
          const childPersonaBinding: PersonaBindingRecord = { ...sourcePersonaBinding, targetId: childSessionId, updatedAt: new Date().toISOString() };
          await personaBindings.put(personaBindingKey("session", childSessionId), childPersonaBinding as unknown as RecordValue);
        }
        const sourceVariables = variableStates.get(sourceSessionId) as unknown as VariableStateRecord | undefined;
        if (sourceVariables !== undefined) {
          const childVariables = JSON.parse(JSON.stringify({ ...sourceVariables, sessionId: childSessionId, updatedAt: new Date().toISOString() })) as VariableStateRecord;
          await variableStates.put(childSessionId, childVariables as unknown as RecordValue);
        }
        const sourceFrontend = frontendStates.get(sourceSessionId) as unknown as FrontendStateRecord | undefined;
        if (sourceFrontend !== undefined) {
          const childFrontend = JSON.parse(JSON.stringify({ ...sourceFrontend, sessionId: childSessionId, updatedAt: new Date().toISOString() })) as FrontendStateRecord;
          await frontendStates.put(childSessionId, childFrontend as unknown as RecordValue);
        }
        childHandle = await ctx.agents.create({
          sessionId: childSessionId,
          seed: Array.from(source.events),
          meta: { cwd: hostGlobal.process.cwd(), parentSession: sourceSessionId, seedLength: source.events.length },
          agentOptions: { provider: childBinding.provider, model: childBinding.model },
          setup: setupAgent(childSessionId, cardFor(childBinding.revisionId)!, childBinding),
        });
        handles.set(childSessionId, childHandle);
        const child = childHandle.agent.session;
        await ctx.sessions.flush(child);
        jsonBody(res, 201, {
          ok: true,
          sourceSessionId,
          childSessionId,
          parentSession: child.header?.parentSession ?? null,
          seedLength: child.header?.seedLength ?? null,
          parentVariableDigest: sourceVariables?.digest ?? null,
          childVariableDigest: (variableStates.get(childSessionId) as unknown as VariableStateRecord | undefined)?.digest ?? null,
          parentFrontendDigest: sourceFrontend?.stateDigest ?? null,
          childFrontendDigest: (frontendStates.get(childSessionId) as unknown as FrontendStateRecord | undefined)?.stateDigest ?? null,
        });
      } catch (error) {
        if (childSessionId.length > 0) {
          if (childHandle !== undefined) await childHandle.dispose();
          handles.delete(childSessionId);
          await bindings.delete(childSessionId);
          await personaBindings.delete(personaBindingKey("session", childSessionId));
          variableReplyGate.discard(childSessionId);
          await variableStates.delete(childSessionId);
          await frontendStates.delete(childSessionId);
        }
        jsonBody(res, 400, { ok: false, error: error instanceof Error ? error.message : "DSH Fork 验证失败" });
      }
    }}));

    disposers.push(ctx.webServer.register({ kind: "exact", path: "/dsh-re3-rp/verify/prompt", handler: async (req: any, res: any) => {
      if (req.method !== "POST") { res.writeHead(405, { Allow: "POST" }); res.end(); return; }
      try {
        const input = await readJson(req);
        const sessionId = typeof input.sessionId === "string" ? input.sessionId : "";
        const prompt = typeof input.prompt === "string" ? input.prompt : "";
        const agent = ctx.agents.get(sessionId);
        if (agent === undefined || prompt.length === 0) throw new Error("缺少可验证的卡片会话或玩家输入");
        agent.followup({ id: crypto.randomUUID(), role: "user", content: [{ type: "text", text: prompt }], source: { kind: "user" } });
        await agent.whenIdle();
        const traceCount = Array.from(traces.entries() as IterableIterator<[string, RecordValue]>).filter(([, trace]) => trace.sessionId === sessionId).length;
        jsonBody(res, 200, { ok: true, sessionId, agentStatus: agent.status, traceCount });
      } catch (error) {
        jsonBody(res, 400, { ok: false, error: error instanceof Error ? error.message : "验证输入失败" });
      }
    }}));
  }

  disposers.push(ctx.webServer.register({ kind: "exact", path: "/dsh-re3-rp/evidence", handler: (req: any, res: any) => {
    if (req.method !== "GET") { res.writeHead(405, { Allow: "GET" }); res.end(); return; }
    const sessionId = new URL(req.url, "http://127.0.0.1").searchParams.get("sessionId") ?? "";
    const binding = bindings.get(sessionId);
    if (binding === undefined) { jsonBody(res, 404, { ok: false, error: "找不到卡片会话" }); return; }
    const session = ctx.sessions.get(sessionId);
    const sessionTraces: RecordValue[] = [];
    for (const [, trace] of traces.entries() as IterableIterator<[string, RecordValue]>) {
      if (trace.sessionId === sessionId) sessionTraces.push(trace);
    }
    jsonBody(res, 200, {
      worldbookContextRevision: worldbookContextRevision(session),
      worldbookSurfaceSeq: currentWorldbookSurfaceSeq(session) ?? null,
      binding: {
      sessionId: binding.sessionId,
      revisionId: binding.revisionId,
      openingId: binding.openingId,
      openingDigest: binding.openingDigest,
      normalizedIndexVersion: binding.normalizedIndexVersion,
      createdAt: binding.createdAt,
      splitMvu: binding.splitMvu ?? null,
    }, traces: sessionTraces });
  }}));

  return async () => {
    for (const dispose of disposers.reverse()) dispose();
    for (const binding of allBindings()) variableReplyGate.discard(binding.sessionId);
    for (const handle of Array.from(handles.values()).reverse()) await handle.dispose();
    await ejsRuntime.dispose();
    await domain.close();
    await variableDomain.close();
    await frontendDomain.close();
    await personaDomain.close();
  };
  } catch (error) {
    await ejsRuntime.dispose();
    throw error;
  }
}

function textBody(res: any, status: number, contentType: string, value: string | Uint8Array, method = "GET"): void {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  res.writeHead(status, {
    "Content-Type": contentType,
    "Cache-Control": "no-store",
    "Content-Length": bytes.byteLength,
    "X-Content-Type-Options": "nosniff",
  });
  res.end(method === "HEAD" ? undefined : bytes);
}

function bridgeFailure(code: string, message: string): BridgeFailure {
  return Object.assign(new Error(message), { code });
}

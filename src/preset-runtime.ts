import type { WorldbookRole } from "./worldbook.js";

export type TavernPromptMarker =
  | "main-prompt"
  | "world-info-before"
  | "persona-description"
  | "character-description"
  | "character-personality"
  | "scenario"
  | "world-info-after"
  | "example-messages"
  | "authors-note"
  | "chat-history"
  | "post-history-instructions";

export type TavernGenerationSettings = {
  contextTokens: number;
  maxReplyTokens: number;
  stream: boolean;
  temperature: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  maxContextUnlocked: boolean;
};

export type TavernPromptDefinition = {
  identifier: string;
  name: string;
  role: WorldbookRole;
  content: string;
  marker?: TavernPromptMarker;
  systemPrompt: boolean;
  injectionPosition: "relative" | "in-chat";
  injectionDepth: number;
  injectionOrder: number;
  extra: Record<string, unknown>;
};

export type TavernPromptOrderItem = { identifier: string; enabled: boolean };

export type TavernPromptPreset = {
  id: string;
  name: string;
  source: "builtin" | "created" | "imported";
  revision: number;
  createdAt: string;
  updatedAt: string;
  worldInfoFormat: string;
  settings: TavernGenerationSettings;
  prompts: TavernPromptDefinition[];
  promptOrder: TavernPromptOrderItem[];
  extra: Record<string, unknown>;
};

const MARKER_BY_IDENTIFIER: Readonly<Record<string, TavernPromptMarker>> = Object.freeze({
  main: "main-prompt",
  worldInfoBefore: "world-info-before",
  personaDescription: "persona-description",
  charDescription: "character-description",
  charPersonality: "character-personality",
  scenario: "scenario",
  worldInfoAfter: "world-info-after",
  dialogueExamples: "example-messages",
  authorsNote: "authors-note",
  chatHistory: "chat-history",
  jailbreak: "post-history-instructions",
});

const IDENTIFIER_BY_MARKER = new Map<TavernPromptMarker, string>(
  Object.entries(MARKER_BY_IDENTIFIER).map(([identifier, marker]) => [marker, identifier]),
);
const VALID_MARKERS = new Set<TavernPromptMarker>(Object.values(MARKER_BY_IDENTIFIER));

const PINNED_PROMPTS: ReadonlyArray<Omit<TavernPromptDefinition, "extra">> = Object.freeze([
  { identifier: "main", name: "Main Prompt", role: "system", content: "Write {{char}}'s next reply in a fictional chat between {{char}} and {{user}}.", marker: "main-prompt", systemPrompt: true, injectionPosition: "relative", injectionDepth: 4, injectionOrder: 100 },
  { identifier: "worldInfoBefore", name: "World Info (before)", role: "system", content: "", marker: "world-info-before", systemPrompt: true, injectionPosition: "relative", injectionDepth: 4, injectionOrder: 100 },
  { identifier: "personaDescription", name: "Persona Description", role: "system", content: "", marker: "persona-description", systemPrompt: true, injectionPosition: "relative", injectionDepth: 4, injectionOrder: 100 },
  { identifier: "charDescription", name: "Char Description", role: "system", content: "", marker: "character-description", systemPrompt: true, injectionPosition: "relative", injectionDepth: 4, injectionOrder: 100 },
  { identifier: "charPersonality", name: "Char Personality", role: "system", content: "", marker: "character-personality", systemPrompt: true, injectionPosition: "relative", injectionDepth: 4, injectionOrder: 100 },
  { identifier: "scenario", name: "Scenario", role: "system", content: "", marker: "scenario", systemPrompt: true, injectionPosition: "relative", injectionDepth: 4, injectionOrder: 100 },
  { identifier: "enhanceDefinitions", name: "Enhance Definitions", role: "system", content: "If you have more knowledge of {{char}}, add to the character's lore and personality to enhance them but keep the Character Sheet's definitions absolute.", systemPrompt: true, injectionPosition: "relative", injectionDepth: 4, injectionOrder: 100 },
  { identifier: "nsfw", name: "Auxiliary Prompt", role: "system", content: "", systemPrompt: true, injectionPosition: "relative", injectionDepth: 4, injectionOrder: 100 },
  { identifier: "worldInfoAfter", name: "World Info (after)", role: "system", content: "", marker: "world-info-after", systemPrompt: true, injectionPosition: "relative", injectionDepth: 4, injectionOrder: 100 },
  { identifier: "dialogueExamples", name: "Chat Examples", role: "system", content: "", marker: "example-messages", systemPrompt: true, injectionPosition: "relative", injectionDepth: 4, injectionOrder: 100 },
  { identifier: "chatHistory", name: "Chat History", role: "system", content: "", marker: "chat-history", systemPrompt: true, injectionPosition: "relative", injectionDepth: 4, injectionOrder: 100 },
  { identifier: "jailbreak", name: "Post-History Instructions", role: "system", content: "", marker: "post-history-instructions", systemPrompt: true, injectionPosition: "relative", injectionDepth: 4, injectionOrder: 100 },
]);

const DEFAULT_ORDER: ReadonlyArray<TavernPromptOrderItem> = Object.freeze([
  { identifier: "main", enabled: true },
  { identifier: "worldInfoBefore", enabled: true },
  { identifier: "personaDescription", enabled: true },
  { identifier: "charDescription", enabled: true },
  { identifier: "charPersonality", enabled: true },
  { identifier: "scenario", enabled: true },
  { identifier: "enhanceDefinitions", enabled: false },
  { identifier: "nsfw", enabled: true },
  { identifier: "worldInfoAfter", enabled: true },
  { identifier: "dialogueExamples", enabled: true },
  { identifier: "chatHistory", enabled: true },
  { identifier: "jailbreak", enabled: true },
]);

const TOP_LEVEL_KEYS = new Set([
  "temperature", "frequency_penalty", "presence_penalty", "top_p", "openai_max_context", "openai_max_tokens",
  "max_context_unlocked", "wi_format", "worldInfoFormat", "stream_openai", "prompts", "prompt_order", "promptOrder", "settings", "extra", "name", "id", "source", "revision", "createdAt", "updatedAt",
]);
const PROMPT_KEYS = new Set(["identifier", "name", "role", "content", "marker", "system_prompt", "systemPrompt", "injection_position", "injectionPosition", "injection_depth", "injectionDepth", "injection_order", "injectionOrder", "position", "extra"]);

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function finite(value: unknown, fallback: number): number {
  const candidate = typeof value === "number" ? value : Number(value);
  return Number.isFinite(candidate) ? candidate : fallback;
}

function integer(value: unknown, fallback: number, minimum: number, maximum = Number.MAX_SAFE_INTEGER): number {
  return Math.min(maximum, Math.max(minimum, Math.round(finite(value, fallback))));
}

function role(value: unknown): WorldbookRole {
  return value === "user" ? "user" : value === "assistant" || value === "model" ? "assistant" : "system";
}

function extraFields(value: Record<string, unknown>, known: ReadonlySet<string>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !known.has(key)));
}

function promptFrom(value: unknown, fallback?: Omit<TavernPromptDefinition, "extra">): TavernPromptDefinition | undefined {
  const input = record(value);
  const identifier = typeof input.identifier === "string" && input.identifier.trim().length > 0 ? input.identifier.trim() : fallback?.identifier;
  if (identifier === undefined) return;
  const explicitMarker = typeof input.marker === "string" && VALID_MARKERS.has(input.marker as TavernPromptMarker)
    ? input.marker as TavernPromptMarker
    : input.marker === true ? MARKER_BY_IDENTIFIER[identifier] : undefined;
  const marker = fallback?.marker ?? explicitMarker;
  return {
    identifier,
    name: typeof input.name === "string" && input.name.trim().length > 0 ? input.name.trim() : fallback?.name ?? identifier,
    role: role(input.role ?? fallback?.role),
    content: typeof input.content === "string" ? input.content : fallback?.content ?? "",
    ...(marker === undefined ? {} : { marker }),
    systemPrompt: typeof input.system_prompt === "boolean" ? input.system_prompt : typeof input.systemPrompt === "boolean" ? input.systemPrompt : fallback?.systemPrompt ?? false,
    injectionPosition: input.injection_position === 1 || input.injectionPosition === "in-chat" || input.position === "in_chat" || input.position === "in-chat" ? "in-chat" : fallback?.injectionPosition ?? "relative",
    injectionDepth: integer(input.injection_depth ?? input.injectionDepth, fallback?.injectionDepth ?? 4, 0, 10_000),
    injectionOrder: integer(input.injection_order ?? input.injectionOrder, fallback?.injectionOrder ?? 100, -1_000_000, 1_000_000),
    extra: { ...extraFields(input, PROMPT_KEYS), ...record(input.extra) },
  };
}

function normalizePromptLibrary(value: unknown): TavernPromptDefinition[] {
  const candidates = Array.isArray(value) ? value : [];
  const byId = new Map<string, TavernPromptDefinition>();
  for (const candidate of candidates) {
    const parsed = promptFrom(candidate);
    if (parsed !== undefined && !byId.has(parsed.identifier)) byId.set(parsed.identifier, parsed);
  }
  for (const pinned of PINNED_PROMPTS) {
    const existing = byId.get(pinned.identifier);
    byId.set(pinned.identifier, existing === undefined ? { ...pinned, extra: {} } : { ...existing, marker: pinned.marker });
  }
  return [...byId.values()];
}

function normalizePromptOrder(value: unknown, prompts: readonly TavernPromptDefinition[]): TavernPromptOrderItem[] {
  const groups = Array.isArray(value) ? value.map(record) : [];
  const personaGroup = groups.find((group) => Number(group.character_id) === 100001);
  const selected = personaGroup ?? groups[0];
  const rawOrder = Array.isArray(selected?.order) ? selected.order : Array.isArray(value) && value.every((item) => "identifier" in record(item)) ? value : [];
  const promptIds = new Set(prompts.map((prompt) => prompt.identifier));
  const seen = new Set<string>();
  const order = rawOrder.flatMap((item): TavernPromptOrderItem[] => {
    const candidate = record(item);
    const identifier = typeof candidate.identifier === "string" ? candidate.identifier.trim() : "";
    if (identifier.length === 0 || seen.has(identifier) || !promptIds.has(identifier)) return [];
    seen.add(identifier);
    return [{ identifier, enabled: candidate.enabled !== false }];
  });
  if (order.length === 0) {
    for (const item of DEFAULT_ORDER) {
      if (promptIds.has(item.identifier)) { order.push({ ...item }); seen.add(item.identifier); }
    }
  }
  return order;
}

function iso(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) ? new Date(milliseconds).toISOString() : fallback;
}

export function normalizeTavernPreset(value: unknown, options: { id?: string; name?: string; source?: TavernPromptPreset["source"]; now?: string } = {}): TavernPromptPreset {
  const input = record(value);
  const now = options.now ?? new Date().toISOString();
  const prompts = normalizePromptLibrary(input.prompts);
  const name = options.name?.trim() || (typeof input.name === "string" ? input.name.trim() : "") || "Imported preset";
  return {
    id: options.id?.trim() || (typeof input.id === "string" ? input.id.trim() : "") || crypto.randomUUID(),
    name,
    source: options.source ?? (input.source === "builtin" || input.source === "created" || input.source === "imported" ? input.source : "imported"),
    revision: integer(input.revision, 1, 1),
    createdAt: iso(input.createdAt, now),
    updatedAt: iso(input.updatedAt, now),
    worldInfoFormat: typeof input.wi_format === "string" ? input.wi_format : typeof input.worldInfoFormat === "string" ? input.worldInfoFormat : "{0}",
    settings: {
      contextTokens: integer(input.openai_max_context ?? record(input.settings).contextTokens, 4095, 256),
      maxReplyTokens: integer(input.openai_max_tokens ?? record(input.settings).maxReplyTokens, 300, 1),
      stream: typeof input.stream_openai === "boolean" ? input.stream_openai : typeof record(input.settings).stream === "boolean" ? record(input.settings).stream as boolean : true,
      temperature: Math.min(5, Math.max(0, finite(input.temperature ?? record(input.settings).temperature, 1))),
      topP: Math.min(1, Math.max(0, finite(input.top_p ?? record(input.settings).topP, 1))),
      frequencyPenalty: Math.min(2, Math.max(-2, finite(input.frequency_penalty ?? record(input.settings).frequencyPenalty, 0))),
      presencePenalty: Math.min(2, Math.max(-2, finite(input.presence_penalty ?? record(input.settings).presencePenalty, 0))),
      maxContextUnlocked: input.max_context_unlocked === true || record(input.settings).maxContextUnlocked === true,
    },
    prompts,
    promptOrder: normalizePromptOrder(input.prompt_order ?? input.promptOrder, prompts),
    extra: { ...extraFields(input, TOP_LEVEL_KEYS), ...record(input.extra) },
  };
}

export function createDefaultTavernPreset(now = "2026-08-26T00:00:00.000Z"): TavernPromptPreset {
  return normalizeTavernPreset({
    name: "SillyTavern Default",
    temperature: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
    top_p: 1,
    openai_max_context: 4095,
    openai_max_tokens: 300,
    max_context_unlocked: false,
    wi_format: "{0}",
    stream_openai: true,
    prompts: PINNED_PROMPTS.map((prompt) => ({
      identifier: prompt.identifier,
      name: prompt.name,
      role: prompt.role,
      content: prompt.content,
      system_prompt: prompt.systemPrompt,
      ...(prompt.marker === undefined ? {} : { marker: true }),
    })),
    prompt_order: [{ character_id: 100001, order: DEFAULT_ORDER }],
    chat_completion_source: "openai",
  }, { id: "sillytavern-default-1.18", source: "builtin", now });
}

export const DEFAULT_TAVERN_PRESET = createDefaultTavernPreset();

export function exportSillyTavernPreset(preset: TavernPromptPreset): Record<string, unknown> {
  return {
    ...preset.extra,
    chat_completion_source: typeof preset.extra.chat_completion_source === "string" ? preset.extra.chat_completion_source : "openai",
    temperature: preset.settings.temperature,
    frequency_penalty: preset.settings.frequencyPenalty,
    presence_penalty: preset.settings.presencePenalty,
    top_p: preset.settings.topP,
    openai_max_context: preset.settings.contextTokens,
    openai_max_tokens: preset.settings.maxReplyTokens,
    max_context_unlocked: preset.settings.maxContextUnlocked,
    wi_format: preset.worldInfoFormat,
    stream_openai: preset.settings.stream,
    prompts: preset.prompts.map((prompt) => ({
      ...prompt.extra,
      identifier: prompt.identifier,
      name: prompt.name,
      role: prompt.role,
      content: prompt.content,
      system_prompt: prompt.systemPrompt,
      ...(prompt.marker === undefined ? { marker: false } : { marker: true }),
      injection_position: prompt.injectionPosition === "in-chat" ? 1 : 0,
      injection_depth: prompt.injectionDepth,
      injection_order: prompt.injectionOrder,
    })),
    prompt_order: [100000, 100001].map((character_id) => ({ character_id, order: preset.promptOrder.map((item) => ({ ...item })) })),
  };
}

export function isPinnedPrompt(identifier: string): boolean {
  return MARKER_BY_IDENTIFIER[identifier] !== undefined || identifier === "enhanceDefinitions" || identifier === "nsfw";
}

export function promptIdentifierForMarker(marker: TavernPromptMarker): string {
  return IDENTIFIER_BY_MARKER.get(marker) ?? marker;
}

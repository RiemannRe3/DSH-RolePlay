import { DEFAULT_TAVERN_PRESET, type TavernGenerationSettings, type TavernPromptDefinition, type TavernPromptMarker, type TavernPromptPreset } from "./preset-runtime.js";
import { placeWorldbook, substituteCardMacros, type WorldbookActivation, type WorldbookEntry, type WorldbookPlacement, type WorldbookRole } from "./worldbook.js";
import { renderPersonaPrompt } from "./persona-runtime.js";

export { DEFAULT_TAVERN_PRESET } from "./preset-runtime.js";
export type { TavernPromptPreset } from "./preset-runtime.js";
export type TavernPromptBlockId = TavernPromptMarker;
/** @deprecated Presets now retain SillyTavern prompt definitions and prompt_order directly. */
export type TavernPromptPresetBlock = { id: TavernPromptBlockId; label: string; enabled: boolean; role: WorldbookRole };
export type TavernCardPromptSource = { title: string; description: string; personality: string; scenario: string; messageExample: string; systemPrompt: string; postHistoryInstructions: string; worldbook: WorldbookEntry[] };
export type TavernChatMessage = { role: "user" | "assistant"; content: string; sourceIndex: number };
export type CompiledTavernMessage = {
  role: WorldbookRole;
  content: string;
  source: {
    kind: "preset" | "worldbook" | "chat" | "example";
    blockId?: string;
    promptIdentifier?: string;
    marker?: TavernPromptMarker;
    entryIds?: string[];
    position?: string;
    depth?: number;
    sourceIndex?: number;
  };
};
export type CompiledTavernBlock = {
  id: string;
  promptIdentifier: string;
  marker?: TavernPromptMarker;
  label: string;
  enabled: boolean;
  role: WorldbookRole;
  injectionPosition: "relative" | "in-chat";
  injectionDepth: number;
  characterCount: number;
  entryIds: string[];
  messageIndexes: number[];
  preview: string;
};
export type CompiledTavernPrompt = {
  preset: { id: string; name: string; source: TavernPromptPreset["source"]; revision: number };
  settings: TavernGenerationSettings;
  messages: CompiledTavernMessage[];
  blocks: CompiledTavernBlock[];
  placement: WorldbookPlacement;
  activation: WorldbookActivation;
  stats: {
    messageCount: number;
    characterCount: number;
    estimatedTokens: number;
    contextTokens: number | null;
    prunedChatMessages: number;
    prunedExampleMessages: number;
    contextExceeded: boolean;
    activeWorldbookEntries: number;
    filteredWorldbookEntries: number;
    depthInjections: number;
  };
};

type MacroValues = { userName: string; characterName: string; messageVariables?: Record<string, unknown>; localVariables: Record<string, string>; macroSeed?: string };

function clean(text: string): string { return text.trim(); }
function formatWorldInfo(template: string, content: string): string { return content.length === 0 ? "" : template.includes("{0}") ? template.replaceAll("{0}", content) : content; }
function resolveOutlets(text: string, outlets: Readonly<Record<string, string>>): string { return text.replace(/\{\{outlet::([^{}]+)\}\}/gu, (_match, name: string) => outlets[name.trim()] ?? ""); }
function estimateMessageTokens(message: CompiledTavernMessage): number { return Math.ceil(message.content.length / 4) + 4; }

function sourceFor(definition: TavernPromptDefinition, kind: CompiledTavernMessage["source"]["kind"], extra: Partial<CompiledTavernMessage["source"]> = {}): CompiledTavernMessage["source"] {
  return {
    kind,
    blockId: definition.marker ?? definition.identifier,
    promptIdentifier: definition.identifier,
    ...(definition.marker === undefined ? {} : { marker: definition.marker }),
    ...extra,
  };
}

function parseExamples(text: string, values: { userName: string; characterName: string }, definition: TavernPromptDefinition): CompiledTavernMessage[] {
  const substituted = clean(substituteCardMacros(text, values));
  if (substituted.length === 0) return [];
  const messages: CompiledTavernMessage[] = [];
  let current: CompiledTavernMessage | undefined;
  for (const rawLine of substituted.replaceAll("<START>", "").split(/\r?\n/gu)) {
    const line = rawLine.trim();
    if (line.length === 0) continue;
    const match = line.match(/^([^:：]{1,80})[:：]\s*(.*)$/u);
    if (match !== null) {
      const speaker = (match[1] ?? "").trim();
      const resolvedRole: WorldbookRole | undefined = speaker === values.userName || /^user$/iu.test(speaker) ? "user" : speaker === values.characterName || /^char(?:acter)?$/iu.test(speaker) ? "assistant" : undefined;
      if (resolvedRole !== undefined) {
        current = { role: resolvedRole, content: match[2] ?? "", source: sourceFor(definition, "example") };
        messages.push(current);
        continue;
      }
    }
    if (current === undefined) {
      current = { role: "system", content: line, source: sourceFor(definition, "example") };
      messages.push(current);
    } else current.content += `\n${line}`;
  }
  return messages;
}

function depthMessages(placement: WorldbookPlacement, chatDefinition: TavernPromptDefinition): CompiledTavernMessage[] {
  const grouped = new Map<string, typeof placement.entries>();
  for (const entry of placement.entries.filter((candidate) => candidate.position === "at_depth")) {
    const key = `${entry.depth}:${entry.role}`;
    grouped.set(key, [...(grouped.get(key) ?? []), entry]);
  }
  return [...grouped.values()].map((entries) => ({
    role: entries[0]!.role,
    content: entries.map((entry) => entry.content).join("\n\n"),
    source: sourceFor(chatDefinition, "worldbook", { entryIds: entries.map((entry) => entry.id), position: "at-depth", depth: entries[0]!.depth }),
  })).sort((left, right) => (right.source.depth ?? 0) - (left.source.depth ?? 0) || ["system", "user", "assistant"].indexOf(left.role) - ["system", "user", "assistant"].indexOf(right.role));
}

function insertAtDepth(messages: CompiledTavernMessage[], injections: readonly { message: CompiledTavernMessage; depth: number; order: number }[]): void {
  const roleOrder: Record<WorldbookRole, number> = { user: 0, assistant: 1, system: 2 };
  const grouped = new Map<number, Array<{ message: CompiledTavernMessage; depth: number; order: number }>>();
  for (const injection of injections) {
    const index = Math.max(0, messages.length - Math.min(messages.length, injection.depth));
    grouped.set(index, [...(grouped.get(index) ?? []), injection]);
  }
  for (const [index, rows] of [...grouped.entries()].sort((left, right) => right[0] - left[0])) {
    rows.sort((left, right) => left.order - right.order || roleOrder[left.message.role] - roleOrder[right.message.role]);
    messages.splice(index, 0, ...rows.map((row) => row.message));
  }
}

function compileChatHistory(chat: readonly TavernChatMessage[], placement: WorldbookPlacement, definition: TavernPromptDefinition, inChatPrompts: readonly TavernPromptDefinition[], values: MacroValues): CompiledTavernMessage[] {
  const result: CompiledTavernMessage[] = chat.map((message) => ({
    role: message.role,
    content: message.content,
    source: sourceFor(definition, "chat", { sourceIndex: message.sourceIndex }),
  }));
  insertAtDepth(result, [
    ...depthMessages(placement, definition).map((message) => ({ message, depth: message.source.depth ?? 0, order: 100 })),
    ...inChatPrompts.flatMap((prompt) => {
      const content = clean(resolveOutlets(substituteCardMacros(prompt.content, values), placement.outlets));
      return content.length === 0 ? [] : [{ message: { role: prompt.role, content, source: sourceFor(prompt, "preset", { position: "in-chat", depth: prompt.injectionDepth }) }, depth: prompt.injectionDepth, order: prompt.injectionOrder }];
    }),
  ]);
  return result;
}

export function normalizeTavernChatMessages(messages: readonly any[]): TavernChatMessage[] {
  return messages.flatMap((message: any, sourceIndex: number): TavernChatMessage[] => {
    if (message?.role !== "user" && message?.role !== "assistant") return [];
    if (message?.source?.kind === "plugin" && message.source.plugin !== "compact") return [];
    const content = typeof message.content === "string" ? message.content : Array.isArray(message.content) ? message.content.filter((part: any) => part?.type === "text" && typeof part.text === "string").map((part: any) => part.text).join("\n") : "";
    if (content.trim().length === 0 || /^\[DSH_RE3_RP_(?:WORLD_CONTEXT|ASSEMBLY)\]/u.test(content)) return [];
    return [{ role: message.role, content, sourceIndex }];
  });
}


function markerMessages(input: {
  definition: TavernPromptDefinition;
  card: TavernCardPromptSource;
  personaDescription?: string;
  placement: WorldbookPlacement;
  chat: readonly TavernChatMessage[];
  inChatPrompts: readonly TavernPromptDefinition[];
  values: MacroValues;
  worldInfoFormat: string;
}): CompiledTavernMessage[] {
  const { definition, card, placement, values } = input;
  switch (definition.marker) {
    case "main-prompt": {
      const text = clean(substituteCardMacros(card.systemPrompt, values)) || clean(substituteCardMacros(definition.content, values)) || `你正在扮演 ${card.title}。请始终以角色身份自然地延续当前对话。`;
      return [{ role: definition.role, content: text, source: sourceFor(definition, "preset") }];
    }
    case "world-info-before": {
      const text = formatWorldInfo(input.worldInfoFormat, placement.beforeCharacter);
      return text.length === 0 ? [] : [{ role: definition.role, content: text, source: sourceFor(definition, "worldbook", { entryIds: placement.entries.filter((entry) => entry.position === "before_char").map((entry) => entry.id), position: "before-char" }) }];
    }
    case "persona-description": {
      const text = clean(substituteCardMacros(renderPersonaPrompt(values.userName, input.personaDescription ?? ""), values));
      return text.length === 0 ? [] : [{ role: definition.role, content: text, source: sourceFor(definition, "preset") }];
    }
    case "character-description": {
      const text = clean(substituteCardMacros(card.description, values));
      return text.length === 0 ? [] : [{ role: definition.role, content: text, source: sourceFor(definition, "preset") }];
    }
    case "character-personality": {
      const text = clean(substituteCardMacros(card.personality, values));
      return text.length === 0 ? [] : [{ role: definition.role, content: text, source: sourceFor(definition, "preset") }];
    }
    case "scenario": {
      const text = clean(substituteCardMacros(card.scenario, values));
      return text.length === 0 ? [] : [{ role: definition.role, content: text, source: sourceFor(definition, "preset") }];
    }
    case "world-info-after": {
      const text = formatWorldInfo(input.worldInfoFormat, placement.afterCharacter);
      return text.length === 0 ? [] : [{ role: definition.role, content: text, source: sourceFor(definition, "worldbook", { entryIds: placement.entries.filter((entry) => entry.position === "after_char").map((entry) => entry.id), position: "after-char" }) }];
    }
    case "example-messages": {
      const messages: CompiledTavernMessage[] = [];
      if (placement.beforeExamples.length > 0) messages.push({ role: definition.role, content: placement.beforeExamples, source: sourceFor(definition, "worldbook", { entryIds: placement.entries.filter((entry) => entry.position === "before_examples").map((entry) => entry.id), position: "before-examples" }) });
      messages.push(...parseExamples(card.messageExample, values, definition));
      if (placement.afterExamples.length > 0) messages.push({ role: definition.role, content: placement.afterExamples, source: sourceFor(definition, "worldbook", { entryIds: placement.entries.filter((entry) => entry.position === "after_examples").map((entry) => entry.id), position: "after-examples" }) });
      return messages;
    }
    case "authors-note": {
      const text = [placement.authorNoteTop, placement.authorNoteBottom].filter(Boolean).join("\n\n");
      return text.length === 0 ? [] : [{ role: definition.role, content: text, source: sourceFor(definition, "worldbook", { entryIds: placement.entries.filter((entry) => entry.position === "an_top" || entry.position === "an_bottom").map((entry) => entry.id), position: "authors-note" }) }];
    }
    case "chat-history": return compileChatHistory(input.chat, placement, definition, input.inChatPrompts, values);
    case "post-history-instructions": {
      const text = clean(substituteCardMacros(card.postHistoryInstructions, values)) || clean(substituteCardMacros(definition.content, values));
      return text.length === 0 ? [] : [{ role: definition.role, content: text, source: sourceFor(definition, "preset") }];
    }
    default: return [];
  }
}

function trimToContext(messages: CompiledTavernMessage[], contextTokens: number | null): { messages: CompiledTavernMessage[]; prunedChatMessages: number; prunedExampleMessages: number; estimatedTokens: number; contextExceeded: boolean } {
  let current = messages;
  let estimatedTokens = current.reduce((sum, message) => sum + estimateMessageTokens(message), 0);
  let prunedChatMessages = 0;
  let prunedExampleMessages = 0;
  if (contextTokens === null) return { messages: current, prunedChatMessages, prunedExampleMessages, estimatedTokens, contextExceeded: false };
  if (estimatedTokens > contextTokens) {
    const latestChatIndex = current.reduce((last, message, index) => message.source.kind === "chat" ? index : last, -1);
    const removable = current.flatMap((message, index) => message.source.kind === "chat" && index !== latestChatIndex ? [index] : []);
    const removed = new Set<number>();
    for (const index of removable) {
      if (estimatedTokens <= contextTokens) break;
      estimatedTokens -= estimateMessageTokens(current[index]!);
      removed.add(index);
      prunedChatMessages += 1;
    }
    current = current.filter((_message, index) => !removed.has(index));
  }
  if (estimatedTokens > contextTokens) {
    const removed = new Set<number>();
    for (let index = 0; index < current.length; index += 1) {
      if (estimatedTokens <= contextTokens) break;
      if (current[index]!.source.kind !== "example") continue;
      estimatedTokens -= estimateMessageTokens(current[index]!);
      removed.add(index);
      prunedExampleMessages += 1;
    }
    current = current.filter((_message, index) => !removed.has(index));
  }
  return { messages: current, prunedChatMessages, prunedExampleMessages, estimatedTokens, contextExceeded: estimatedTokens > contextTokens };
}

export function compileTavernPrompt(input: { card: TavernCardPromptSource; userName: string; personaDescription?: string; chat: readonly TavernChatMessage[]; activation: WorldbookActivation; messageVariables?: Record<string, unknown>; macroSeed?: string; preset?: TavernPromptPreset }): CompiledTavernPrompt {
  const preset = input.preset ?? DEFAULT_TAVERN_PRESET;
  const values: MacroValues = { userName: input.userName, characterName: input.card.title, messageVariables: input.messageVariables, localVariables: {}, macroSeed: input.macroSeed };
  const placement = placeWorldbook(input.activation.active, values);

  const definitions = new Map(preset.prompts.map((prompt) => [prompt.identifier, prompt]));
  const enabled = new Map(preset.promptOrder.map((item) => [item.identifier, item.enabled]));
  const inChatPrompts = preset.prompts.filter((prompt) => prompt.marker === undefined && prompt.injectionPosition === "in-chat" && enabled.get(prompt.identifier) === true);
  const assembled: CompiledTavernMessage[] = [];

  for (const item of preset.promptOrder) {
    if (!item.enabled) continue;
    const definition = definitions.get(item.identifier);
    if (definition === undefined || definition.injectionPosition === "in-chat" && definition.marker === undefined) continue;
    if (definition.marker !== undefined) assembled.push(...markerMessages({ definition, card: input.card, personaDescription: input.personaDescription, placement, chat: input.chat, inChatPrompts, values, worldInfoFormat: preset.worldInfoFormat }));
    else {
      const content = clean(resolveOutlets(substituteCardMacros(definition.content, values), placement.outlets));
      if (content.length > 0) assembled.push({ role: definition.role, content, source: sourceFor(definition, "preset") });
    }
  }

  const trimmed = trimToContext(assembled, preset.settings.contextTokens);
  const messages = trimmed.messages;
  const blocks: CompiledTavernBlock[] = preset.promptOrder.map((item) => {
    const definition = definitions.get(item.identifier) ?? { identifier: item.identifier, name: item.identifier, role: "system" as const, content: "", systemPrompt: false, injectionPosition: "relative" as const, injectionDepth: 4, injectionOrder: 100, extra: {} };
    const indexes = messages.flatMap((message, index) => message.source.promptIdentifier === item.identifier ? [index] : []);
    const text = indexes.map((index) => messages[index]!.content).join("\n");
    return {
      id: definition.marker ?? definition.identifier,
      promptIdentifier: definition.identifier,
      ...(definition.marker === undefined ? {} : { marker: definition.marker }),
      label: definition.name,
      enabled: item.enabled,
      role: definition.role,
      injectionPosition: definition.injectionPosition,
      injectionDepth: definition.injectionDepth,
      characterCount: text.length,
      entryIds: [...new Set(indexes.flatMap((index) => messages[index]!.source.entryIds ?? []))],
      messageIndexes: indexes,
      preview: text.replace(/\s+/gu, " ").trim().slice(0, 180),
    };
  });
  return {
    preset: { id: preset.id, name: preset.name, source: preset.source, revision: preset.revision },
    settings: { ...preset.settings },
    messages,
    blocks,
    placement,
    activation: input.activation,
    stats: {
      messageCount: messages.length,
      characterCount: messages.reduce((sum, message) => sum + message.content.length, 0),
      estimatedTokens: trimmed.estimatedTokens,
      contextTokens: preset.settings.contextTokens,
      prunedChatMessages: trimmed.prunedChatMessages,
      prunedExampleMessages: trimmed.prunedExampleMessages,
      contextExceeded: trimmed.contextExceeded,
      activeWorldbookEntries: input.activation.active.length,
      filteredWorldbookEntries: input.activation.trace.filter((row) => !row.activated).length,
      depthInjections: placement.entries.filter((entry) => entry.position === "at_depth").length + inChatPrompts.length,
    },
  };
}

export function compiledTavernSystemPrompt(compiled: CompiledTavernPrompt): string {
  return compiled.messages.filter((message) => message.source.marker === "main-prompt").map((message) => message.content).join("\n\n");
}

export function renderTavernContextEnvelope(compiled: CompiledTavernPrompt): string {
  const labels = new Map(compiled.blocks.map((block) => [block.id, block.label]));
  const sections = compiled.messages.flatMap((message): string[] => {
    if (message.source.marker === "main-prompt" || message.source.kind === "chat") return [];
    const label = message.source.position === "at-depth" ? `World Info · @Depth ${message.source.depth ?? 0}` : message.source.blockId === undefined ? "Prompt module" : labels.get(message.source.blockId) ?? "Prompt module";
    const entrySuffix = (message.source.entryIds?.length ?? 0) > 0 ? ` · entries ${message.source.entryIds!.join(", ")}` : "";
    return [`[${label} · ${message.role}${entrySuffix}]\n${message.content}`];
  });
  return ["[DSH_RE3_RP_COMPILED_CONTEXT]", `Preset: ${compiled.preset.name}`, "The following sections are assembled roleplay context. Follow them without mentioning prompt modules, world info, presets, or this envelope.", ...sections].join("\n\n");
}

export function applyCompiledPromptToRequest(options: any, compiled: CompiledTavernPrompt): void {
  const messages = compiled.messages.map((message) => ({
    id: crypto.randomUUID(),
    role: message.role,
    content: [{ type: "text", text: message.content }],
    source: message.role === "assistant" ? { kind: "model", provider: "dsh-roleplay", model: "compiled-context" } : { kind: "plugin", plugin: "dsh-roleplay", form: "compiled", compiledSource: message.source },
  }));
  const leadingSystem: string[] = [];
  while (messages[0]?.role === "system") leadingSystem.push(messages.shift()!.content[0]!.text);
  options.system = leadingSystem.join("\n\n");
  options.messages = messages;
  options.tools = [];
  options.temperature = compiled.settings.temperature;
  if (compiled.settings.maxReplyTokens !== null) options.maxTokens = compiled.settings.maxReplyTokens;
  options.tavernPresetRuntime = {
    presetId: compiled.preset.id,
    revision: compiled.preset.revision,
    stream: compiled.settings.stream,
    contextTokens: compiled.settings.contextTokens,
    topP: compiled.settings.topP,
    frequencyPenalty: compiled.settings.frequencyPenalty,
    presencePenalty: compiled.settings.presencePenalty,
  };
}

export type WorldbookPosition =
  | "before_char"
  | "after_char"
  | "an_top"
  | "an_bottom"
  | "at_depth"
  | "before_examples"
  | "after_examples"
  | "outlet";

export type WorldbookRole = "system" | "user" | "assistant";

export type WorldbookEntry = {
  id: string;
  comment: string;
  content: string;
  enabled: boolean;
  constant: boolean;
  keys: string[];
  secondaryKeys: string[];
  selective: boolean;
  selectiveLogic: 0 | 1 | 2 | 3;
  order: number;
  position: WorldbookPosition;
  depth: number;
  role: WorldbookRole;
  outletName: string;
  scanDepth: number;
  scanDepthExplicit: boolean;
  useRegex: boolean;
  caseSensitive: boolean;
  matchWholeWords: boolean;
  probability: number;
  group: string;
  groupOverride: boolean;
  groupWeight: number;
  sticky: number;
  cooldown: number;
  delay: number;
  preventRecursion: boolean;
  excludeRecursion: boolean;
  delayUntilRecursion: boolean;
};

export type ActivationTraceRow = {
  id: string;
  label: string;
  activated: boolean;
  pass: number;
  reason: string;
  matchedPrimaryKeys: string[];
  matchedSecondaryKeys: string[];
  recursiveParents: string[];
  position: WorldbookPosition;
  depth: number;
  role: WorldbookRole;
  order: number;
};

export type WorldbookTimedEffect = { stickyUntil?: number; cooldownUntil?: number };
export type WorldbookRuntimeState = { messageCount: number; effects: Record<string, WorldbookTimedEffect> };
export type WorldbookActivationOptions = {
  messageCount?: number;
  runtimeState?: WorldbookRuntimeState;
  globalScanDepth?: number;
  maxRecursionSteps?: number;
};

export type WorldbookActivation = {
  active: WorldbookEntry[];
  trace: ActivationTraceRow[];
  passes: number;
  runtimeState: WorldbookRuntimeState;
};

export type RenderedWorldbookActivation = {
  activation: WorldbookActivation;
  renderedEntryIds: string[];
  failedEntryIds: string[];
};

export function withoutWorldbookRuntimeEffects(state: WorldbookRuntimeState, entryIds: Iterable<string>): WorldbookRuntimeState {
  const effects = Object.fromEntries(Object.entries(state.effects).map(([id, effect]) => [id, { ...effect }]));
  for (const id of entryIds) delete effects[id];
  return { messageCount: state.messageCount, effects };
}

export type PlacedWorldbookEntry = {
  id: string;
  label: string;
  content: string;
  order: number;
  position: WorldbookPosition;
  depth: number;
  role: WorldbookRole;
  outletName: string;
};

export type WorldbookPlacement = {
  beforeCharacter: string;
  afterCharacter: string;
  atDepth: string;
  beforeExamples: string;
  afterExamples: string;
  authorNoteTop: string;
  authorNoteBottom: string;
  outlets: Record<string, string>;
  entries: PlacedWorldbookEntry[];
};

type JsonObject = Record<string, unknown>;
function isObject(value: unknown): value is JsonObject { return typeof value === "object" && value !== null && !Array.isArray(value); }
function strings(value: unknown): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.length > 0) : []; }
function numberValue(value: unknown, fallback: number): number { return typeof value === "number" && Number.isFinite(value) ? value : fallback; }
function booleanValue(value: unknown, fallback: boolean): boolean { return typeof value === "boolean" ? value : fallback; }
function stringValue(value: unknown, fallback = ""): string { return typeof value === "string" ? value : fallback; }

function normalizePosition(value: unknown, extensionValue: unknown): WorldbookPosition {
  const candidate = extensionValue ?? value;
  if (candidate === "before_char" || candidate === 0) return "before_char";
  if (candidate === "an_top" || candidate === 2) return "an_top";
  if (candidate === "an_bottom" || candidate === 3) return "an_bottom";
  if (candidate === "at_depth" || candidate === 4) return "at_depth";
  if (candidate === "before_examples" || candidate === 5) return "before_examples";
  if (candidate === "after_examples" || candidate === 6) return "after_examples";
  if (candidate === "outlet" || candidate === 7) return "outlet";
  return "after_char";
}

function normalizeRole(value: unknown): WorldbookRole {
  if (value === "user" || value === 1) return "user";
  if (value === "assistant" || value === 2) return "assistant";
  return "system";
}

export function normalizeWorldbookEntry(value: unknown, index: number): WorldbookEntry {
  if (!isObject(value)) throw new Error(`世界书第 ${index + 1} 项不是对象`);
  const extensions = isObject(value.extensions) ? value.extensions : {};
  const rawLogic = numberValue(value.selectiveLogic ?? extensions.selectiveLogic, 0);
  const selectiveLogic = ([0, 1, 2, 3] as const).includes(rawLogic as 0 | 1 | 2 | 3) ? rawLogic as 0 | 1 | 2 | 3 : 0;
  const probabilityEnabled = booleanValue(extensions.use_probability ?? extensions.useProbability, true);
  const probability = probabilityEnabled ? Math.max(0, Math.min(100, numberValue(extensions.probability ?? value.probability, 100))) : 100;
  const scanDepthExplicit = booleanValue(value.scanDepthExplicit, Object.prototype.hasOwnProperty.call(value, "scan_depth") || Object.prototype.hasOwnProperty.call(extensions, "scan_depth"));
  return {
    id: String(value.id ?? value.uid ?? index),
    comment: stringValue(value.comment ?? value.memo),
    content: stringValue(value.content),
    enabled: booleanValue(value.enabled, true),
    constant: booleanValue(value.constant, false),
    keys: strings(value.keys ?? value.key),
    secondaryKeys: strings(value.secondaryKeys ?? value.secondary_keys ?? value.keysecondary),
    selective: booleanValue(value.selective, false),
    selectiveLogic,
    order: numberValue(value.insertion_order ?? value.order, 0),
    position: normalizePosition(value.position, extensions.position),
    depth: Math.max(0, Math.trunc(numberValue(extensions.depth ?? value.depth, 4))),
    role: normalizeRole(extensions.role ?? value.role),
    outletName: stringValue(extensions.outlet_name ?? value.outletName).trim(),
    scanDepth: Math.max(0, Math.trunc(numberValue(value.scanDepth ?? extensions.scan_depth ?? value.scan_depth, 0))),
    scanDepthExplicit,
    useRegex: booleanValue(value.useRegex ?? value.use_regex ?? extensions.use_regex, false),
    caseSensitive: booleanValue(value.caseSensitive ?? extensions.case_sensitive, false),
    matchWholeWords: booleanValue(value.matchWholeWords ?? extensions.match_whole_words, false),
    probability,
    group: stringValue(extensions.group ?? value.group).trim(),
    groupOverride: booleanValue(extensions.group_override ?? value.groupOverride, false),
    groupWeight: Math.max(0, numberValue(extensions.group_weight ?? value.groupWeight, 100)),
    sticky: Math.max(0, Math.trunc(numberValue(extensions.sticky ?? value.sticky, 0))),
    cooldown: Math.max(0, Math.trunc(numberValue(extensions.cooldown ?? value.cooldown, 0))),
    delay: Math.max(0, Math.trunc(numberValue(extensions.delay ?? value.delay, 0))),
    preventRecursion: booleanValue(value.preventRecursion ?? extensions.prevent_recursion, false),
    excludeRecursion: booleanValue(value.excludeRecursion ?? extensions.exclude_recursion, false),
    delayUntilRecursion: booleanValue(value.delayUntilRecursion ?? extensions.delay_until_recursion, false),
  };
}

function parseRegexKey(key: string, entry: WorldbookEntry): RegExp | undefined {
  const slash = key.match(/^\/(.*)\/([dgimsuvy]*)$/u);
  try {
    if (slash !== null) return new RegExp(slash[1] ?? "", slash[2] ?? "");
    if (entry.useRegex) return new RegExp(key, entry.caseSensitive ? "u" : "iu");
  } catch { return undefined; }
  return undefined;
}

function literalMatch(haystack: string, needle: string, entry: WorldbookEntry): boolean {
  const source = entry.caseSensitive ? haystack : haystack.toLocaleLowerCase();
  const target = entry.caseSensitive ? needle : needle.toLocaleLowerCase();
  if (!entry.matchWholeWords) return source.includes(target);
  const escaped = target.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  try { return new RegExp(`(?:^|[^\\p{L}\\p{N}_])${escaped}(?:$|[^\\p{L}\\p{N}_])`, "u").test(source); }
  catch { return source.includes(target); }
}

function keyMatches(haystack: string, key: string, entry: WorldbookEntry): boolean {
  const regex = parseRegexKey(key, entry);
  if (regex !== undefined) return regex.test(haystack);
  if (entry.useRegex || /^\/.+\/[dgimsuvy]*$/u.test(key)) return false;
  return literalMatch(haystack, key, entry);
}

function matchedKeys(haystack: string, keys: readonly string[], entry: WorldbookEntry): string[] { return keys.filter((key) => keyMatches(haystack, key, entry)); }
function secondaryPass(matches: boolean[], logic: 0 | 1 | 2 | 3): boolean {
  if (matches.length === 0) return true;
  if (logic === 1) return !matches.every(Boolean);
  if (logic === 2) return !matches.some(Boolean);
  if (logic === 3) return matches.every(Boolean);
  return matches.some(Boolean);
}

function deterministicPercent(seed: string): number {
  let hash = 2166136261;
  for (const character of seed) { hash ^= character.codePointAt(0) ?? 0; hash = Math.imul(hash, 16777619); }
  return (hash >>> 0) % 100;
}

function traceRow(entry: WorldbookEntry, activated: boolean, pass: number, reason: string, primary: string[] = [], secondary: string[] = [], parents: string[] = []): ActivationTraceRow {
  return { id: entry.id, label: entry.comment.trim() || `条目 ${entry.id}`, activated, pass, reason, matchedPrimaryKeys: primary, matchedSecondaryKeys: secondary, recursiveParents: parents, position: entry.position, depth: entry.depth, role: entry.role, order: entry.order };
}

function chooseGroupWinner(group: readonly WorldbookEntry[], seed: string): WorldbookEntry {
  if (group.some((entry) => entry.groupOverride)) return [...group].sort((left, right) => right.order - left.order || left.id.localeCompare(right.id))[0]!;
  const total = group.reduce((sum, entry) => sum + entry.groupWeight, 0);
  if (total <= 0) return [...group].sort((left, right) => right.order - left.order || left.id.localeCompare(right.id))[0]!;
  let target = deterministicPercent(seed) / 100 * total;
  for (const entry of group) { target -= entry.groupWeight; if (target < 0) return entry; }
  return group[group.length - 1]!;
}

export function activateWorldbook(entries: readonly WorldbookEntry[], scanTexts: readonly string[], seed = "default", options: WorldbookActivationOptions = {}): WorldbookActivation {
  const ordered = [...entries].sort((left, right) => right.order - left.order || left.id.localeCompare(right.id));
  const messageCount = options.messageCount ?? scanTexts.length;
  const runtimeState = options.runtimeState ?? { messageCount, effects: {} };
  runtimeState.messageCount = messageCount;
  const activeIds = new Set<string>();
  const trace = new Map<string, ActivationTraceRow>();
  const recursiveTexts: Array<{ id: string; text: string }> = [];
  let pass = 0;
  let passesRun = 0;
  const maximumPasses = Math.max(0, Math.trunc(options.maxRecursionSteps ?? 0));
  while (pass <= entries.length && (maximumPasses === 0 || pass < maximumPasses)) {
    passesRun += 1;
    const recursive = pass > 0;
    const newlyActive: WorldbookEntry[] = [];
    for (const entry of ordered) {
      if (activeIds.has(entry.id)) continue;
      if (!entry.enabled || entry.content.length === 0) { if (pass === 0) trace.set(entry.id, traceRow(entry, false, pass, !entry.enabled ? "disabled" : "empty-content")); continue; }
      if (entry.delay > messageCount) { if (pass === 0) trace.set(entry.id, traceRow(entry, false, pass, "delay")); continue; }
      const effect = runtimeState.effects[entry.id] ?? {};
      const sticky = (effect.stickyUntil ?? -1) >= messageCount;
      if (!sticky && (effect.cooldownUntil ?? -1) >= messageCount) { if (pass === 0) trace.set(entry.id, traceRow(entry, false, pass, "cooldown")); continue; }
      if (!recursive && entry.delayUntilRecursion && !sticky) continue;
      if (recursive && entry.excludeRecursion && !sticky) continue;
      const scanDepth = entry.scanDepthExplicit ? entry.scanDepth : Math.max(0, Math.trunc(options.globalScanDepth ?? 2));
      const baseTexts = scanDepth > 0 ? scanTexts.slice(-scanDepth) : [];
      const baseHaystack = baseTexts.join("\n");
      const recursiveHaystack = recursiveTexts.map((item) => item.text).join("\n");
      const haystack = [baseHaystack, recursiveHaystack].filter(Boolean).join("\n");
      const primaryMatches = matchedKeys(haystack, entry.keys, entry);
      const secondaryMatches = matchedKeys(haystack, entry.secondaryKeys, entry);
      const primary = sticky || entry.constant || primaryMatches.length > 0;
      const secondary = !entry.selective || secondaryPass(entry.secondaryKeys.map((key) => secondaryMatches.includes(key)), entry.selectiveLogic);
      const probability = sticky || entry.probability >= 100 || deterministicPercent(`${seed}:${messageCount}:${entry.id}`) < entry.probability;
      if (primary && secondary && probability) {
        activeIds.add(entry.id);
        newlyActive.push(entry);
        const parents = recursiveTexts.filter((item) => entry.keys.some((key) => keyMatches(item.text, key, entry))).map((item) => item.id);
        const reason = sticky ? "sticky" : entry.constant ? "constant" : recursive && parents.length > 0 ? "recursive-keyword" : "keyword";
        trace.set(entry.id, traceRow(entry, true, pass, reason, primaryMatches, secondaryMatches, parents));
      } else if (pass === 0 && !entry.delayUntilRecursion) trace.set(entry.id, traceRow(entry, false, pass, !primary ? "primary-miss" : !secondary ? "secondary-miss" : "probability-miss", primaryMatches, secondaryMatches));
    }
    if (newlyActive.length === 0) break;
    const recursiveContent = newlyActive.filter((entry) => !entry.preventRecursion).map((entry) => ({ id: entry.id, text: entry.content }));
    if (recursiveContent.length === 0) break;
    recursiveTexts.push(...recursiveContent);
    pass += 1;
  }
  const active = ordered.filter((entry) => activeIds.has(entry.id));
  const grouped = new Map<string, WorldbookEntry[]>();
  for (const entry of active) if (entry.group.length > 0) grouped.set(entry.group, [...(grouped.get(entry.group) ?? []), entry]);
  for (const [groupName, groupEntries] of grouped) {
    if (groupEntries.length < 2) continue;
    const winner = chooseGroupWinner(groupEntries, `${seed}:${messageCount}:group:${groupName}`);
    for (const entry of groupEntries) {
      if (entry.id === winner.id) continue;
      activeIds.delete(entry.id);
      const previous = trace.get(entry.id);
      trace.set(entry.id, traceRow(entry, false, previous?.pass ?? 0, `group-loser:${winner.id}`, previous?.matchedPrimaryKeys, previous?.matchedSecondaryKeys, previous?.recursiveParents));
    }
  }
  const finalActive = ordered.filter((entry) => activeIds.has(entry.id));
  for (const entry of finalActive) {
    if (entry.sticky <= 0 && entry.cooldown <= 0) continue;
    if (runtimeState.effects[entry.id] !== undefined) continue;
    runtimeState.effects[entry.id] = { ...(entry.sticky > 0 ? { stickyUntil: messageCount + entry.sticky } : {}), ...(entry.cooldown > 0 ? { cooldownUntil: messageCount + entry.sticky + entry.cooldown } : {}) };
  }
  for (const [id, effect] of Object.entries(runtimeState.effects)) if ((effect.stickyUntil ?? -1) < messageCount && (effect.cooldownUntil ?? -1) < messageCount) delete runtimeState.effects[id];
  return { active: finalActive, trace: ordered.map((entry) => trace.get(entry.id) ?? traceRow(entry, false, 0, "not-eligible")), passes: passesRun, runtimeState };
}

// Template-backed World Info cannot be activated safely from its raw source:
// raw EJS may create false recursion matches, win an exclusion group and write
// sticky/cooldown effects before rendering later fails. Resolve only the
// currently selected candidates, then restart activation from the same clean
// state until the rendered graph reaches a fixed point.
export async function activateWorldbookWithRenderer(
  entries: readonly WorldbookEntry[],
  scanTexts: readonly string[],
  seed: string,
  options: WorldbookActivationOptions,
  needsRender: (entry: WorldbookEntry) => boolean,
  render: (entry: WorldbookEntry) => Promise<string | undefined>,
): Promise<RenderedWorldbookActivation> {
  const sourceById = new Map(entries.map((entry) => [entry.id, entry]));
  const templateIds = new Set(entries.filter(needsRender).map((entry) => entry.id));
  const rendered = new Map<string, string>();
  const failed = new Set<string>();
  const effectExclusions = (): Set<string> => new Set([
    ...failed,
    ...[...rendered].filter(([, content]) => content.length === 0).map(([id]) => id),
  ]);

  for (let iteration = 0; iteration <= templateIds.size; iteration += 1) {
    const exclusions = effectExclusions();
    const projectedEntries = entries.map((entry): WorldbookEntry => {
      if (failed.has(entry.id)) return { ...entry, enabled: false };
      if (!templateIds.has(entry.id)) return entry;
      if (rendered.has(entry.id)) return { ...entry, content: rendered.get(entry.id)! };
      // The placeholder keeps direct/constant/sticky candidacy intact, while
      // preventRecursion guarantees raw template source never becomes a scan
      // surface for another entry.
      return { ...entry, content: "\u0000dsh-pending-template\u0000", preventRecursion: true };
    });
    const baseRuntimeState = options.runtimeState === undefined
      ? undefined
      : withoutWorldbookRuntimeEffects(options.runtimeState, exclusions);
    const activation = activateWorldbook(projectedEntries, scanTexts, seed, { ...options, runtimeState: baseRuntimeState });
    const pending = activation.active.filter((entry) => templateIds.has(entry.id) && !rendered.has(entry.id) && !failed.has(entry.id));
    if (pending.length === 0) {
      return {
        activation: { ...activation, runtimeState: withoutWorldbookRuntimeEffects(activation.runtimeState, exclusions) },
        renderedEntryIds: [...rendered.keys()],
        failedEntryIds: [...failed],
      };
    }
    for (const candidate of pending) {
      const source = sourceById.get(candidate.id)!;
      const output = await render(source);
      if (output === undefined) failed.add(candidate.id);
      else rendered.set(candidate.id, output);
    }
  }
  throw new Error("世界书模板激活未在有限迭代内收敛");
}

export type CardMacroValues = {
  userName: string;
  characterName: string;
  messageVariables?: Record<string, unknown>;
  localVariables?: Record<string, string>;
  macroSeed?: string;
};

function stableMacroNumber(seed: string): number {
  let hash = 2166136261;
  for (const character of seed) { hash ^= character.codePointAt(0) ?? 0; hash = Math.imul(hash, 16777619); }
  return hash >>> 0;
}

function messageVariable(values: CardMacroValues, rawPath: string): unknown {
  const segments = rawPath.trim().split(".").filter(Boolean);
  if (segments[0]?.toLocaleLowerCase() === "stat_data") segments.shift();
  let current: unknown = values.messageVariables ?? {};
  for (const segment of segments) {
    if (typeof current !== "object" || current === null || Array.isArray(current)) return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function displayMacroValue(value: unknown, pretty = false): string {
  if (value === undefined || value === null) return value === null ? "null" : "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try { return JSON.stringify(value, null, pretty ? 2 : undefined); }
  catch { return ""; }
}

export function substituteCardMacros(text: string, values: CardMacroValues): string {
  const locals = values.localVariables ??= {};
  return text
    .replace(/\{\{setvar::([^{}:]+)::([^{}]*)\}\}/giu, (_match, name: string, value: string) => { locals[name.trim()] = value.trim(); return ""; })
    .replace(/\{\{getvar::([^{}:]+)\}\}/giu, (_match, name: string) => locals[name.trim()] ?? "")
    .replace(/\{\{get_message_variable::([^{}]+)\}\}/giu, (_match, path: string) => displayMacroValue(messageVariable(values, path)))
    .replace(/\{\{format_message_variable::stat_data\}\}/giu, () => displayMacroValue(values.messageVariables ?? {}, true))
    .replace(/\{\{random::([^{}]+)\}\}/giu, (macro: string, rawOptions: string) => {
      const options = rawOptions.split("::");
      return options[stableMacroNumber(`${values.macroSeed ?? "card"}:${macro}`) % options.length] ?? "";
    })
    .replace(/\{\{roll(?::(\d+)d(\d+)(?:\+(\d+))?)?\}\}/giu, (macro: string, countText?: string, sidesText?: string, bonusText?: string) => {
      const count = countText === undefined ? 1 : Math.max(1, Math.min(100, Number(countText)));
      const sides = sidesText === undefined ? 100 : Math.max(1, Math.min(10000, Number(sidesText)));
      const bonus = bonusText === undefined ? 0 : Number(bonusText);
      let total = bonus;
      for (let index = 0; index < count; index += 1) total += 1 + (stableMacroNumber(`${values.macroSeed ?? "card"}:${macro}:${index}`) % sides);
      return String(total);
    })
    .replace(/\{\{user\}\}/giu, values.userName)
    .replace(/\{\{char\}\}/giu, values.characterName);
}

export function placeWorldbook(entries: readonly WorldbookEntry[], values: CardMacroValues): WorldbookPlacement {
  const placed = [...entries].sort((left, right) => left.order - right.order || left.id.localeCompare(right.id)).map((entry): PlacedWorldbookEntry => ({ id: entry.id, label: entry.comment.trim() || `条目 ${entry.id}`, content: substituteCardMacros(entry.content, values), order: entry.order, position: entry.position, depth: entry.depth, role: entry.role, outletName: entry.outletName }));
  const join = (position: WorldbookPosition): string => placed.filter((entry) => entry.position === position).map((entry) => entry.content).join("\n\n");
  const outlets: Record<string, string> = {};
  for (const entry of placed.filter((candidate) => candidate.position === "outlet" && candidate.outletName.length > 0)) outlets[entry.outletName] = [outlets[entry.outletName], entry.content].filter(Boolean).join("\n\n");
  return { beforeCharacter: join("before_char"), afterCharacter: join("after_char"), atDepth: join("at_depth"), beforeExamples: join("before_examples"), afterExamples: join("after_examples"), authorNoteTop: join("an_top"), authorNoteBottom: join("an_bottom"), outlets, entries: placed };
}

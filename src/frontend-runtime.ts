export type FrontendRuntimeClass =
  | "message_html_css"
  | "message_iframe"
  | "background_script_and_message_iframe"
  | "standalone_app"
  | "cross_origin_required_asset"
  | "formal_message_mixed_projection"
  | "generated_multi_fragment_projection";

export type FrontendContainer = "message-html" | "message-iframe" | "standalone" | "required-asset";

export type FrontendDefinition = {
  suiteId: string;
  caseId: string;
  cardId: string;
  runtimeClass: FrontendRuntimeClass;
  container: FrontendContainer;
  requiredCapabilities: string[];
  frontendEntry?: string;
};

export type MessageRegexScript = {
  id: string;
  name: string;
  pattern: string;
  flags: string;
  replacement: string;
  placements: number[];
  minDepth: number | null;
  maxDepth: number | null;
  runOnEdit: boolean;
  promptOnly: boolean;
};

export type FrontendProjectionMessage = { seq: number; role: "user" | "assistant"; text: string; rawText?: string };
export type FrontendProjection = {
  sessionId: string;
  messages: FrontendProjectionMessage[];
  state: Record<string, unknown>;
  stateDigest: string;
  eventSequence: number;
};

const CASE_CONTAINERS: Record<string, { runtimeClass: FrontendRuntimeClass; container: FrontendContainer }> = {
  "html-css-display": { runtimeClass: "message_html_css", container: "message-html" },
  "message-action": { runtimeClass: "message_iframe", container: "message-iframe" },
  "background-state-panel": { runtimeClass: "background_script_and_message_iframe", container: "message-iframe" },
  "standalone-host-bridge": { runtimeClass: "standalone_app", container: "standalone" },
  "required-remote-asset": { runtimeClass: "cross_origin_required_asset", container: "required-asset" },
};

const MIXED_MESSAGE_CASES: Record<string, { runtimeClass: string; capabilities: string[] }> = {
  "opening-inline-action": { runtimeClass: "formal_message_mixed_projection", capabilities: ["submit_turn"] },
  "generated-multi-fragment": { runtimeClass: "generated_multi_fragment_projection", capabilities: [] },
};

function object(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function regexDepth(value: unknown, minimum: number): number | null {
  return typeof value === "number" && Number.isFinite(value) && Number.isInteger(value) && value >= minimum ? value : null;
}

export function frontendDefinitionFromExtensions(value: unknown): FrontendDefinition | undefined {
  const extensions = object(value);
  const suiteId = typeof extensions?.suite_id === "string" ? extensions.suite_id : "";
  const caseId = typeof extensions?.suite_case_id === "string" ? extensions.suite_case_id : "";
  const cardId = typeof extensions?.card_id === "string" ? extensions.card_id : "";
  const fixed = CASE_CONTAINERS[caseId];
  const mixed = MIXED_MESSAGE_CASES[caseId];
  if (cardId.length === 0) return undefined;
  const declaredRuntime = typeof extensions?.runtime_class === "string" ? extensions.runtime_class : "";
  if (suiteId === "tavern-mixed-message" && mixed !== undefined && declaredRuntime === mixed.runtimeClass) {
    return {
      suiteId,
      caseId,
      cardId,
      runtimeClass: mixed.runtimeClass as FrontendRuntimeClass,
      container: "message-iframe",
      requiredCapabilities: mixed.capabilities,
    };
  }
  if (suiteId !== "frontend-runtime" || fixed === undefined || declaredRuntime !== fixed.runtimeClass) return undefined;
  return {
    suiteId,
    caseId,
    cardId,
    runtimeClass: fixed.runtimeClass,
    container: fixed.container,
    requiredCapabilities: stringArray(extensions?.required_capabilities),
    ...(typeof extensions?.frontend_entry === "string" ? { frontendEntry: extensions.frontend_entry } : {}),
  };
}

export function bridgeCapabilities(definition: FrontendDefinition): string[] {
  const common = ["connect", "projection.read", "events.read"];
  if (definition.caseId === "message-action" || (definition.suiteId === "tavern-mixed-message" && definition.caseId === "opening-inline-action")) return [...common, "turn.submit"];
  if (definition.caseId === "background-state-panel") return [...common, "state.submit", "state.subscribe"];
  if (definition.caseId === "standalone-host-bridge") return [...common, "turn.submit", "events.subscribe"];
  if (definition.caseId === "required-remote-asset") return [...common, "asset.resolve"];
  return common;
}

function parseRegexLiteral(value: string): { pattern: string; flags: string } | undefined {
  if (!value.startsWith("/")) return value.length === 0 ? undefined : { pattern: value, flags: "g" };
  let closing = -1;
  for (let index = value.length - 1; index > 0; index -= 1) {
    if (value[index] !== "/") continue;
    let escapes = 0;
    for (let cursor = index - 1; cursor >= 0 && value[cursor] === "\\"; cursor -= 1) escapes += 1;
    if (escapes % 2 === 0) { closing = index; break; }
  }
  if (closing < 1) return undefined;
  const flags = value.slice(closing + 1);
  if (!/^[dgimsuvy]*$/u.test(flags)) return undefined;
  return { pattern: value.slice(1, closing), flags };
}

export function messageRegexScriptsFromExtensions(value: unknown): MessageRegexScript[] {
  const extensions = object(value);
  const values = Array.isArray(extensions?.regex_scripts) ? extensions.regex_scripts : Array.isArray(extensions?.regex) ? extensions.regex : [];
  return values.flatMap((entry, index): MessageRegexScript[] => {
    const script = object(entry);
    // SillyTavern runs a rule in the Markdown/display pass whenever
    // markdownOnly is true, even if promptOnly is also true. Empty replacement
    // strings are meaningful hide rules and must not be discarded.
    if (script === undefined || script.disabled === true || script.markdownOnly !== true) return [];
    const placements = Array.isArray(script.placement) ? script.placement.filter((item): item is number => Number.isInteger(item)) : [];
    if (!placements.includes(2)) return [];
    const source = typeof script.findRegex === "string" ? script.findRegex : typeof script.find_regex === "string" ? script.find_regex : "";
    const parsed = parseRegexLiteral(source);
    const replacement = typeof script.replaceString === "string" ? script.replaceString : typeof script.replace_string === "string" ? script.replace_string : "";
    if (parsed === undefined) return [];
    try { new RegExp(parsed.pattern, parsed.flags); } catch { return []; }
    return [{
      id: typeof script.id === "string" ? script.id : `regex-${index}`,
      name: typeof script.scriptName === "string" && script.scriptName.trim().length > 0 ? script.scriptName.trim() : `正则规则 ${index + 1}`,
      pattern: parsed.pattern,
      flags: parsed.flags,
      replacement,
      placements,
      minDepth: regexDepth(script.minDepth, -1),
      maxDepth: regexDepth(script.maxDepth, 0),
      runOnEdit: script.runOnEdit !== false,
      promptOnly: script.promptOnly === true,
    }];
  });
}

export function projectMessageRegex(text: string, scripts: readonly MessageRegexScript[], macroValues?: CardMacroValues, depth?: number): string {
  const projected = scripts.reduce((value, script) => {
    if (typeof depth === "number" && script.minDepth !== null && depth < script.minDepth) return value;
    if (typeof depth === "number" && script.maxDepth !== null && depth > script.maxDepth) return value;
    return value.replace(new RegExp(script.pattern, script.flags), (match, ...args: unknown[]) => {
    const groups = typeof args.at(-1) === "object" ? args.at(-1) as Record<string, string> : undefined;
    const captures = args.slice(0, groups === undefined ? -2 : -3);
    // SillyTavern's Regex extension intentionally supports only $0/$1... and
    // named $<group> references. Treating JavaScript's wider $&/$$/$`/$'
    // replacement vocabulary as tokens corrupts bundled card scripts.
    const replacement = script.replacement.replace(/\{\{match\}\}/giu, "$0");
    const replaced = replacement.replace(/\$(\d+)|\$<([^>]+)>/gu, (_token, numeric: string | undefined, named: string | undefined) => {
      const capture = numeric === undefined ? groups?.[named ?? ""] : Number(numeric) === 0 ? match : captures[Number(numeric) - 1];
      return typeof capture === "string" ? capture : "";
    });
    if (replaced.length === 0) return "";
    const trimmed = replaced.trim();
    const existingFence = /^```(?:html|text)?[ \t]*\r?\n([\s\S]*?)\r?\n```$/iu.exec(trimmed);
    const candidate = existingFence?.[1] ?? replaced;
    return /<(?:!doctype|html|head|body|style|script|div|section|details|button|[a-z][\w:-]*\b)/iu.test(candidate)
      ? `\n\n\`\`\`html\n${candidate}\n\`\`\`\n\n`
      : replaced;
    });
  }, text);
  return macroValues === undefined ? projected : substituteCardMacros(projected, macroValues);
}

export function stripInitvarForDisplay(text: string): string {
  return text
    .replace(/<initvar\b[^>]*>[\s\S]*?<\/initvar>/giu, "")
    .replace(/^(?:[ \t]*\r?\n)+/u, "")
    .trimEnd();
}

// Card control protocols belong to the variable/runtime plane, not the
// player-visible conversation. Card Regex gets first refusal so an author can
// deliberately render a status panel; only residue that no card projection
// consumed is removed here.
export function stripAssistantControlForDisplay(text: string): string {
  const withoutReasoning = text.replace(/<(?:think|reasoning)\b[^>]*>[\s\S]*?<\/(?:think|reasoning)>/giu, "");
  const withoutStandaloneAnalysis = withoutReasoning.replace(/<Analysis\b[^>]*>[\s\S]*?<\/Analysis>/giu, "");
  const withoutUpdates = withoutStandaloneAnalysis.replace(/<UpdateVariable\b[^>]*>[\s\S]*?<\/UpdateVariable>/giu, "");
  const opening = /^\s*\[开局\]([\s\S]*?)\[\/开局\]\s*$/u.exec(withoutUpdates);
  const visible = opening === null ? withoutUpdates : opening[1] ?? "";
  return visible.replace(/^(?:[ \t]*\r?\n)+/u, "").trimEnd();
}

export function stripHtmlFence(value: string): string {
  const trimmed = value.trim();
  const fenced = /^```html\s*\n([\s\S]*?)\n```$/iu.exec(trimmed);
  return fenced?.[1] ?? trimmed;
}

function bridgeBootstrap(sessionId: string): string {
  const encodedSession = JSON.stringify(sessionId).replace(/<\//gu, "<\\/");
  return `<script>
(() => {
  const sessionId = ${encodedSession};
  const listeners = new Set();
  const failure = (body, fallback) => Object.assign(new Error(body?.error?.message || body?.error || fallback), { code: body?.error?.code || fallback });
  async function call(method, payload = {}) {
    const response = await fetch('/dsh-re3-rp/bridge', {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ sessionId, method, payload, operationId: payload.operationId })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.ok !== true) throw failure(body, 'bridge_unavailable');
    return body.result;
  }
  window.__dshTavernSubmitHost = Object.freeze({
    bridgeVersion: 'dsh-re3-rp-v1',
    submitTurn: payload => call('submitTurn', payload)
  });
  window.__dshTavernStateHost = Object.freeze({
    bridgeVersion: 'dsh-re3-rp-v1',
    async getProjection() {
      const projection = await call('getProjection');
      return { ...projection.state, state_digest: projection.stateDigest };
    },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    async submitStateAction(payload) {
      const result = await call('submitStateAction', payload);
      const projection = { ...result.projection.state, state_digest: result.projection.stateDigest };
      const event = { type: 'state_committed', operationId: payload.operationId, projection };
      for (const listener of listeners) listener(event);
      return event;
    }
  });
})();
</script>`;
}

export function adaptOpeningFrontendHtml(opening: string, sessionId: string, definition: FrontendDefinition): string {
  let body = stripHtmlFence(opening);
  if (definition.caseId === "message-action") body = body.replaceAll("window.parent.frontendTestHost", "window.__dshTavernSubmitHost");
  if (definition.caseId === "background-state-panel") body = body.replaceAll("window.parent.frontendTestStateHost", "window.__dshTavernStateHost");
  const bootstrap = definition.container === "message-iframe" ? bridgeBootstrap(sessionId) : "";
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>${bootstrap}${body}</body></html>`;
}

function messageText(message: any): string {
  if (typeof message?.content === "string") return message.content;
  if (!Array.isArray(message?.content)) return "";
  return message.content.filter((part: any) => part?.type === "text" && typeof part.text === "string").map((part: any) => part.text).join("\n");
}

const CONVENTIONAL_STATUS_SLOT = "<StatusPlaceHolderImpl/>";

function isConventionalStatusFrontendScript(script: MessageRegexScript): boolean {
  if (!script.pattern.includes("StatusPlaceHolderImpl")) return false;
  if (!/<(?:!doctype|html|head|body|style|script|div|section|details|button|[a-z][\w:-]*\b)/iu.test(script.replacement)) return false;
  try { return new RegExp(script.pattern, script.flags).test(CONVENTIONAL_STATUS_SLOT); } catch { return false; }
}

function hasConventionalStatusFrontend(scripts: readonly MessageRegexScript[]): boolean {
  return scripts.some(isConventionalStatusFrontendScript);
}

function assistantDisplayProjection(text: string, scripts: readonly MessageRegexScript[], afterPlayerTurn: boolean): {
  source: string;
  scripts: readonly MessageRegexScript[];
} {
  // TavernHelper cards use the same display slot for both inline MVU replies
  // and split-step MVU replies whose secondary updater runs outside the prose
  // response. For a DSH-synthesized slot, keep the rich status renderer while
  // excluding validation/cleanup Regex that treat a missing inline block as an
  // error. The formal Session reply remains byte-for-byte unchanged.
  const hasVariableUpdate = /<UpdateVariable\b[^>]*>[\s\S]*?<\/UpdateVariable>/iu.test(text);
  if (!afterPlayerTurn || text.includes(CONVENTIONAL_STATUS_SLOT) || !hasConventionalStatusFrontend(scripts)) {
    return { source: text, scripts };
  }
  return {
    source: `${text}\n\n${CONVENTIONAL_STATUS_SLOT}`,
    scripts: hasVariableUpdate
      ? scripts
      : scripts.filter((script) => !script.pattern.includes("StatusPlaceHolderImpl") || isConventionalStatusFrontendScript(script)),
  };
}

export function projectFrontendMessages(session: any, regexScripts: readonly MessageRegexScript[] = [], macroValues?: CardMacroValues): FrontendProjectionMessage[] {
  const nodes = Array.isArray(session?.surface?.nodes) ? session.surface.nodes : [];
  const formalNodes = nodes.filter((seq: number) => {
    const event = session?.events?.[seq];
    if (event?.type !== "user/message" && event?.type !== "assistant/message") return false;
    const message = event.data?.message ?? event.data;
    return message?.source?.kind !== "plugin" && messageText(message).length > 0;
  });
  return formalNodes.flatMap((seq: number, nodeIndex: number): FrontendProjectionMessage[] => {
    const event = session?.events?.[seq];
    const message = event.data?.message ?? event.data;
    const text = messageText(message);
    const role = event.type === "user/message" ? "user" : "assistant";
    const isCardOpening = message?.source?.provider === "dsh-re3-rp" && message?.source?.model === "character-card-opening";
    const afterPlayerTurn = role === "assistant" && !isCardOpening && formalNodes.slice(0, nodeIndex).some((candidateSeq: number) => session?.events?.[candidateSeq]?.type === "user/message");
    const display = role === "assistant"
      ? assistantDisplayProjection(text, regexScripts, afterPlayerTurn)
      : { source: text, scripts: regexScripts };
    const depth = formalNodes.length - nodeIndex - 1;
    const projected = role === "assistant"
      ? stripAssistantControlForDisplay(projectMessageRegex(stripInitvarForDisplay(display.source), display.scripts, macroValues, depth))
      : text;
    return [{ seq, role, text: projected, ...(projected === text ? {} : { rawText: text }) }];
  });
}

export async function waitForCommittedFrontendTurn(options: {
  afterSeq: number;
  userText: string;
  flush: () => Promise<void>;
  readMessages: () => FrontendProjectionMessage[];
  timeoutMs?: number;
  pollIntervalMs?: number;
}): Promise<{ user: FrontendProjectionMessage; assistant: FrontendProjectionMessage } | undefined> {
  const deadline = Date.now() + (options.timeoutMs ?? 10_000);
  const pollIntervalMs = options.pollIntervalMs ?? 20;
  do {
    const messages = options.readMessages();
    const user = messages.find((message) => message.seq > options.afterSeq && message.role === "user" && message.text === options.userText);
    const assistant = messages.find((message) => message.seq > (user?.seq ?? Number.MAX_SAFE_INTEGER) && message.role === "assistant");
    if (user !== undefined && assistant !== undefined) {
      // Persist only after the complete turn is visible. Repeated flushes while
      // rc.2 is still projecting the turn can contend with the agent's own
      // session commit and delay the projection until this request returns.
      await options.flush();
      const durableMessages = options.readMessages();
      const durableUser = durableMessages.find((message) => message.seq > options.afterSeq && message.role === "user" && message.text === options.userText);
      const durableAssistant = durableMessages.find((message) => message.seq > (durableUser?.seq ?? Number.MAX_SAFE_INTEGER) && message.role === "assistant");
      if (durableUser !== undefined && durableAssistant !== undefined) return { user: durableUser, assistant: durableAssistant };
    }
    if (Date.now() >= deadline) return undefined;
    await new Promise<void>((resolve) => setTimeout(resolve, pollIntervalMs));
  } while (true);
}

// DSH renders adjacent formal assistant messages as one assistant-step. Keep
// the formal Session messages separate everywhere else, but mirror that native
// grouping at the DOM projection seam so one verification/oracle message cannot
// disable rich rendering for the entire conversation.
export function groupFrontendMessagesForNativeFlow(messages: readonly FrontendProjectionMessage[]): FrontendProjectionMessage[] {
  const grouped: FrontendProjectionMessage[] = [];
  for (const message of messages) {
    const previous = grouped.at(-1);
    if (previous === undefined || previous.role !== message.role || message.role !== "assistant") {
      grouped.push({ ...message });
      continue;
    }
    const visible = [previous.text, message.text].filter((value) => value.length > 0).join("\n\n");
    const requiresAdaptation = previous.rawText !== undefined || message.rawText !== undefined;
    const raw = [previous.rawText ?? previous.text, message.rawText ?? message.text].filter((value) => value.length > 0).join("\n\n");
    previous.text = visible;
    if (requiresAdaptation) previous.rawText = raw;
  }
  return grouped;
}

export function applyFrontendStateAction(caseId: string, state: Record<string, unknown>, payload: Record<string, unknown>): Record<string, unknown> {
  if (caseId !== "background-state-panel") throw Object.assign(new Error("当前卡没有确定性状态动作权限"), { code: "capability_denied" });
  if (payload.action !== "select_lamp_group" || (payload.value !== "main" && payload.value !== "backup")) {
    throw Object.assign(new Error("只允许选择 main 或 backup 灯组"), { code: "capability_denied" });
  }
  return { ...state, lamp_group: payload.value };
}

export function frontendStateDigest(caseId: string, state: Record<string, unknown>): string {
  if (caseId === "background-state-panel") return `lamp-group:${state.lamp_group ?? "main"}`;
  return `frontend:${caseId}:empty`;
}

export function initialFrontendState(caseId: string): Record<string, unknown> {
  return caseId === "background-state-panel" ? { lamp_group: "main" } : {};
}
import { substituteCardMacros, type CardMacroValues } from "./worldbook.js";
export { adaptRealCardFrontendHtml } from "./rich-message.js";

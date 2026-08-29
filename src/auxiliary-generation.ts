import type { CompiledTavernPrompt, TavernChatMessage } from "./prompt-compiler.js";

export type TavernHelperGenerateInjection = {
  role: "system" | "user" | "assistant";
  content: string;
  position: "before_prompt" | "in_chat";
  depth: number;
  shouldScan: boolean;
};

export type TavernHelperGenerateConfig = {
  injects: TavernHelperGenerateInjection[];
  shouldStream: boolean;
  timeoutMs: number;
};

function invalid(message: string): Error & { code: string } {
  return Object.assign(new Error(message), { code: "invalid_action" });
}

export function normalizeTavernHelperGenerateConfig(value: unknown): TavernHelperGenerateConfig {
  if (value !== undefined && (typeof value !== "object" || value === null || Array.isArray(value))) throw invalid("TavernHelper.generate 参数必须是对象");
  const input = (value ?? {}) as Record<string, unknown>;
  const rawInjects = input.injects === undefined ? [] : input.injects;
  if (!Array.isArray(rawInjects) || rawInjects.length > 64) throw invalid("TavernHelper.generate injects 必须是不超过 64 项的数组");
  let totalBytes = 0;
  const encoder = new TextEncoder();
  const injects = rawInjects.map((raw, index): TavernHelperGenerateInjection => {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) throw invalid(`TavernHelper.generate injects[${index}] 必须是对象`);
    const item = raw as Record<string, unknown>;
    const role = item.role ?? "user";
    if (role !== "system" && role !== "user" && role !== "assistant") throw invalid(`TavernHelper.generate injects[${index}].role 无效`);
    if (typeof item.content !== "string" || item.content.trim().length === 0) throw invalid(`TavernHelper.generate injects[${index}].content 不能为空`);
    totalBytes += encoder.encode(item.content).byteLength;
    if (totalBytes > 512 * 1024) throw invalid("TavernHelper.generate 注入内容总计不能超过 512 KiB");
    const position = item.position ?? "in_chat";
    if (position !== "before_prompt" && position !== "in_chat") throw invalid(`TavernHelper.generate injects[${index}].position 无效`);
    const rawDepth = item.depth ?? 0;
    if (typeof rawDepth !== "number" || !Number.isFinite(rawDepth) || rawDepth < 0 || rawDepth > 10_000) throw invalid(`TavernHelper.generate injects[${index}].depth 无效`);
    return { role, content: item.content, position, depth: Math.floor(rawDepth), shouldScan: item.should_scan !== false };
  });
  const rawTimeout = input.timeout_ms ?? input.timeout ?? 120_000;
  if (typeof rawTimeout !== "number" || !Number.isFinite(rawTimeout)) throw invalid("TavernHelper.generate timeout 必须是毫秒数");
  return {
    injects,
    shouldStream: input.should_stream === true,
    timeoutMs: Math.max(1_000, Math.min(120_000, Math.floor(rawTimeout))),
  };
}

export function generateScanText(chat: readonly TavernChatMessage[], config: TavernHelperGenerateConfig): string[] {
  return [...chat.map((message) => message.content), ...config.injects.filter((item) => item.shouldScan).map((item) => item.content)];
}

export function applyTavernHelperGenerateInjections(compiled: CompiledTavernPrompt, config: TavernHelperGenerateConfig): CompiledTavernPrompt {
  const messages = compiled.messages.map((message) => ({ ...message, source: { ...message.source } }));
  for (const [order, injection] of config.injects.entries()) {
    const depth = injection.position === "before_prompt" ? 0 : injection.depth;
    const index = Math.max(0, messages.length - Math.min(messages.length, depth));
    messages.splice(index, 0, {
      role: injection.role,
      content: injection.content,
      source: { kind: "preset", blockId: "tavern-helper-generate", promptIdentifier: "tavern-helper-generate", position: injection.position, depth: injection.depth, sourceIndex: order },
    });
  }
  return {
    ...compiled,
    messages,
    stats: {
      ...compiled.stats,
      messageCount: messages.length,
      characterCount: messages.reduce((sum, message) => sum + message.content.length, 0),
      estimatedTokens: messages.reduce((sum, message) => sum + Math.ceil(message.content.length / 4) + 4, 0),
      depthInjections: compiled.stats.depthInjections + config.injects.length,
      contextExceeded: compiled.stats.contextTokens !== null && messages.reduce((sum, message) => sum + Math.ceil(message.content.length / 4) + 4, 0) > compiled.stats.contextTokens,
    },
  };
}

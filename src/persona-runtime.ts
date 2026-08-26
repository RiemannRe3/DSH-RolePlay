export const PERSONA_AVATARS = ["default", "traveler", "northern-ranger", "jianghu-wanderer"] as const;

export type PersonaAvatar = typeof PERSONA_AVATARS[number];
export type PersonaBindingScope = "global" | "card" | "session";

export type PersonaRecord = {
  id: string;
  displayName: string;
  content: string;
  avatar: PersonaAvatar;
  createdAt: string;
  updatedAt: string;
};

export type PersonaBindingRecord = {
  scope: PersonaBindingScope;
  targetId: string;
  personaId: string;
  updatedAt: string;
};

export type ResolvedPersona = {
  persona: PersonaRecord;
  binding: PersonaBindingRecord;
};

export function personaBindingKey(scope: PersonaBindingScope, targetId = ""): string {
  if (scope === "global") return "global:default";
  const normalizedTarget = targetId.trim();
  if (normalizedTarget.length === 0) throw new Error(scope === "card" ? "卡片 Persona 绑定缺少 revision" : "Session Persona 绑定缺少 Session ID");
  return `${scope}:${normalizedTarget}`;
}

export function normalizePersonaAvatar(value: unknown, fallback: PersonaAvatar = "default"): PersonaAvatar {
  return typeof value === "string" && (PERSONA_AVATARS as readonly string[]).includes(value) ? value as PersonaAvatar : fallback;
}

export function validatePersonaDraft(input: { displayName?: unknown; content?: unknown; avatar?: unknown }, fallbackAvatar: PersonaAvatar = "default"): Pick<PersonaRecord, "displayName" | "content" | "avatar"> {
  const displayName = typeof input.displayName === "string" ? input.displayName.trim() : "";
  const content = typeof input.content === "string" ? input.content.trim() : "";
  if (displayName.length === 0) throw new Error("Persona 名称不能为空");
  if (displayName.length > 64) throw new Error("Persona 名称不能超过 64 个字符");
  if (content.length > 12_000) throw new Error("Persona 描述不能超过 12000 个字符");
  return { displayName, content, avatar: normalizePersonaAvatar(input.avatar, fallbackAvatar) };
}

export function personaBindingKeysToClearForSelection(
  scope: PersonaBindingScope,
  context: { revisionId?: string; sessionId?: string },
): string[] {
  if (scope === "session") return [];
  const keys: string[] = [];
  if ((context.sessionId ?? "").length > 0) keys.push(personaBindingKey("session", context.sessionId));
  if (scope === "global" && (context.revisionId ?? "").length > 0) keys.push(personaBindingKey("card", context.revisionId));
  return keys;
}

export function resolvePersona(
  personas: ReadonlyMap<string, PersonaRecord>,
  bindings: ReadonlyMap<string, PersonaBindingRecord>,
  context: { revisionId?: string; sessionId?: string },
): ResolvedPersona | null {
  const keys = [
    context.sessionId === undefined || context.sessionId.length === 0 ? null : personaBindingKey("session", context.sessionId),
    context.revisionId === undefined || context.revisionId.length === 0 ? null : personaBindingKey("card", context.revisionId),
    personaBindingKey("global"),
  ];
  for (const key of keys) {
    if (key === null) continue;
    const binding = bindings.get(key);
    if (binding === undefined) continue;
    const persona = personas.get(binding.personaId);
    if (persona !== undefined) return { persona, binding };
  }
  return null;
}

export function renderPersonaPrompt(displayName: string, content: string): string {
  const name = displayName.trim();
  const detail = content.trim();
  const lines = name.length === 0 ? [] : [`玩家在当前故事中的名字是 ${name}。`];
  if (detail.length > 0) {
    lines.push("玩家主动启用了以下兼容人设。若酒馆卡已经明确规定玩家身份，以卡片设定为准，不要用人设覆盖卡内约束：", detail);
  }
  return lines.join("\n\n");
}

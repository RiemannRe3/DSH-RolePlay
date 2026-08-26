export const TAVERN_CONTEXT_PREFIX = "dsh-re3-rp:";
export const TAVERN_PLUGIN_ID = "dsh-re3-rp";
export const TAVERN_WORLD_CONTEXT_MARKER = "[DSH_RE3_RP_WORLD_CONTEXT]";
export const TAVERN_ASSEMBLY_MARKER = "[DSH_RE3_RP_ASSEMBLY]";

export type TavernWorldbookSection = { name: string; text: string };

export type TavernAssemblySummary = {
  assemblyId: string;
  presetName: string;
  activeEntries: number;
  filteredEntries: number;
  depthInjections: number;
  messageCount: number;
  characterCount: number;
  addedEntryIds: string[];
  removedEntryIds: string[];
  previousAssemblyId: string | null;
  stage?: "prepared" | "request";
};

export type TavernSurfaceAuditEntry = {
  seq: number;
  time: number | null;
  kind: "assembly" | "worldbook" | "opening" | "context" | "user" | "assistant" | "tool";
  label: string;
  operation: "append" | "replace";
  active: boolean;
  replaces: number[];
  replacedBy: number[];
  sourceEventSeqs: number[];
  trajectoryRowKey: string;
  sectionNames: string[];
  characterCount: number;
  assembly?: TavernAssemblySummary;
};

export type TavernSurfaceEventDetail = TavernSurfaceAuditEntry & {
  content: string;
  sections: TavernWorldbookSection[];
};

function tavernAssemblyMessage(summary: TavernAssemblySummary, contextText?: string): any {
  const changeParts = [
    summary.addedEntryIds.length > 0 ? `+${summary.addedEntryIds.length}` : "",
    summary.removedEntryIds.length > 0 ? `−${summary.removedEntryIds.length}` : "",
  ].filter(Boolean);
  const title = summary.stage === "prepared" ? "酒馆预设已准备" : "酒馆上下文已装配";
  const text = contextText ?? `${TAVERN_ASSEMBLY_MARKER}\n${title}\n${summary.activeEntries} 项世界书激活 · ${summary.depthInjections} 项深度插入${changeParts.length > 0 ? ` · ${changeParts.join(" / ")}` : ""}`;
  return {
    id: crypto.randomUUID(),
    role: "user",
    content: [{ type: "text", text }],
    source: {
      kind: "plugin",
      plugin: TAVERN_PLUGIN_ID,
      form: "assembly",
      assemblyId: summary.assemblyId,
      assembly: summary,
    },
  };
}

export function appendTavernAssemblyEvent(session: any, summary: TavernAssemblySummary, contextText?: string): number {
  const event = session.append("user/message", tavernAssemblyMessage(summary, contextText), { surfaceOp: "append" });
  return event.seq;
}

export function currentAssemblySurfaceSeq(session: any): number | undefined {
  return session?.surface?.nodes?.find((seq: number) => {
    const event = session.events?.[seq];
    const message = event?.data?.message ?? event?.data;
    return event?.type === "user/message" && message?.source?.kind === "plugin" && message.source.plugin === TAVERN_PLUGIN_ID && message.source.form === "assembly";
  });
}

export function upsertTavernAssemblyContext(session: any, summary: TavernAssemblySummary, contextText: string): number {
  const previous = currentAssemblySurfaceSeq(session);
  if (previous === undefined) return appendTavernAssemblyEvent(session, summary, contextText);
  const event = session.append("user/message", tavernAssemblyMessage(summary, contextText), {
    surfaceOp: { op: "replace", start: previous, end: previous },
    sourceEventSeqs: [previous],
  });
  return event.seq;
}

export function createTavernSessionSeed(
  openingText: string,
  sections: readonly TavernWorldbookSection[] = [],
  time = Date.now(),
  preparedAssembly?: TavernAssemblySummary,
): any[] {
  const events: any[] = [];
  const append = (type: string, data: any, surfaceOp?: "append"): void => {
    events.push({
      seq: events.length,
      time,
      type,
      data,
      ...(surfaceOp === undefined ? {} : { surfaceOp }),
    });
  };

  if (sections.length > 0) {
    append("user/message", {
      id: crypto.randomUUID(),
      role: "user",
      content: [{ type: "text", text: renderWorldbookSnapshot(sections) }],
      source: {
        kind: "plugin",
        plugin: TAVERN_PLUGIN_ID,
        form: "snapshot",
        sections,
      },
    }, "append");
  }

  if (preparedAssembly !== undefined) append("user/message", tavernAssemblyMessage(preparedAssembly), "append");

  const turn = 1;
  const step = 1;
  append("turn/start", { turn });
  append("step/start", { turn, step });
  append("assistant/message", {
    turn,
    step,
    message: {
      id: crypto.randomUUID(),
      role: "assistant",
      content: [{ type: "text", text: openingText }],
      source: { kind: "model", provider: "dsh-re3-rp", model: "character-card-opening" },
    },
  }, "append");
  append("step/end", { turn, step });
  append("turn/end", { turn, reason: { kind: "completed" } });
  return events;
}

export function isPlayerMessage(event: any): boolean {
  if (event?.type !== "user/message") return false;
  const message = event.data?.message ?? event.data;
  return message?.source?.kind !== "plugin";
}

export function hasPlayerMessage(events: readonly any[]): boolean {
  return events.some(isPlayerMessage);
}

export function currentOpeningSurfaceSeq(session: any): number | undefined {
  return session?.surface?.nodes?.find((seq: number) => session.events?.[seq]?.type === "assistant/message");
}

function messageText(message: any): string {
  if (typeof message?.content === "string") return message.content;
  if (!Array.isArray(message?.content)) return "";
  return message.content
    .filter((part: any) => part?.type === "text" && typeof part.text === "string")
    .map((part: any) => part.text)
    .join("\n");
}

export function currentWorldbookSurfaceSeq(session: any): number | undefined {
  return session?.surface?.nodes?.find((seq: number) => {
    const event = session.events?.[seq];
    if (event?.type !== "user/message") return false;
    const message = event.data?.message ?? event.data;
    return message?.source?.kind === "plugin" && message.source.plugin === TAVERN_PLUGIN_ID && messageText(message).startsWith(TAVERN_WORLD_CONTEXT_MARKER);
  });
}

export function worldbookContextRevision(session: any): number {
  return (session?.events ?? []).filter((event: any) => {
    if (event?.type !== "user/message") return false;
    const message = event.data?.message ?? event.data;
    return message?.source?.kind === "plugin" && message.source.plugin === TAVERN_PLUGIN_ID && messageText(message).startsWith(TAVERN_WORLD_CONTEXT_MARKER);
  }).length;
}

function surfaceEventKind(event: any): TavernSurfaceAuditEntry["kind"] | undefined {
  if (event?.type === "user/message") {
    const message = event.data?.message ?? event.data;
    if (message?.source?.kind === "plugin" && message.source.plugin === TAVERN_PLUGIN_ID && message.source.form === "assembly") return "assembly";
    if (message?.source?.kind === "plugin" && message.source.plugin === TAVERN_PLUGIN_ID && messageText(message).startsWith(TAVERN_WORLD_CONTEXT_MARKER)) return "worldbook";
    if (message?.source?.kind === "plugin") return "context";
    return "user";
  }
  if (event?.type === "assistant/message") {
    const message = event.data?.message ?? event.data;
    if (message?.source?.provider === "dsh-re3-rp" && message.source.model === "character-card-opening") return "opening";
    return "assistant";
  }
  if (event?.type === "tool/result") return "tool";
  return undefined;
}

function surfaceEventText(event: any): string {
  const message = event?.data?.message ?? event?.data;
  const text = messageText(message);
  if (text.length > 0) return text;
  if (event?.type !== "tool/result") return "";
  try { return JSON.stringify(event.data?.result ?? event.data, null, 2); } catch { return ""; }
}

function surfaceEventLabel(kind: TavernSurfaceAuditEntry["kind"], operation: "append" | "replace"): string {
  if (kind === "assembly") return "酒馆上下文已装配";
  const noun = kind === "worldbook" ? "世界书上下文"
    : kind === "opening" ? "开场"
    : kind === "context" ? "上下文"
    : kind === "user" ? "用户消息"
    : kind === "assistant" ? "助手消息"
    : "工具结果";
  return `${noun}${operation === "append" ? "已追加" : "已替换"}`;
}

function surfaceTrajectoryRowKey(event: any, seq: number, kind: TavernSurfaceAuditEntry["kind"]): string {
  if (kind === "assembly" || kind === "worldbook" || kind === "context") return `context\u0000seq\u0000${seq}`;
  if (kind === "assistant" || kind === "opening") {
    const turn = Number(event?.data?.turn);
    const step = Number(event?.data?.step);
    if (Number.isInteger(turn) && Number.isInteger(step)) return `assistant\u0000${turn}\u0000${step}`;
  }
  if (kind === "tool") {
    const turn = Number(event?.data?.turn);
    const step = Number(event?.data?.step);
    if (Number.isInteger(turn) && Number.isInteger(step)) return `tool\u0000${turn}\u0000${step}`;
  }
  return `user\u0000seq\u0000${seq}`;
}

function replacedSeqs(event: any): number[] {
  const operation = event?.surfaceOp;
  if (operation === null || typeof operation !== "object" || operation.op !== "replace") return [];
  const start = Number(operation.start);
  const end = Number(operation.end);
  if (!Number.isInteger(start) || !Number.isInteger(end) || end < start) return [];
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export function tavernSurfaceAudit(session: any): TavernSurfaceAuditEntry[] {
  const active = new Set<number>(Array.isArray(session?.surface?.nodes) ? session.surface.nodes : []);
  const entries: TavernSurfaceAuditEntry[] = (Array.isArray(session?.events) ? session.events : []).flatMap((event: any, index: number): TavernSurfaceAuditEntry[] => {
    const kind = surfaceEventKind(event);
    if (kind === undefined) return [];
    const message = event.data?.message ?? event.data;
    const operation = event.surfaceOp === "append" ? "append" : event.surfaceOp?.op === "replace" ? "replace" : undefined;
    if (operation === undefined) return [];
    const sections = Array.isArray(message?.source?.sections) ? message.source.sections : [];
    const assembly = kind === "assembly" && message?.source?.assembly && typeof message.source.assembly === "object" ? message.source.assembly as TavernAssemblySummary : undefined;
    const seq = Number.isInteger(event.seq) ? event.seq : index;
    const replacement = replacedSeqs(event);
    return [{
      seq,
      time: Number.isFinite(event.time) ? event.time : null,
      kind,
      label: surfaceEventLabel(kind, operation),
      operation,
      active: active.has(seq),
      replaces: replacement,
      replacedBy: [],
      sourceEventSeqs: Array.isArray(event.sourceEventSeqs) ? event.sourceEventSeqs.filter(Number.isInteger) : [],
      trajectoryRowKey: surfaceTrajectoryRowKey(event, seq, kind),
      sectionNames: sections.flatMap((section: any) => typeof section?.name === "string" ? [section.name] : []),
      characterCount: surfaceEventText(event).length,
      ...(assembly === undefined ? {} : { assembly }),
    } satisfies TavernSurfaceAuditEntry];
  });
  const replacedBy = new Map<number, number[]>();
  for (const entry of entries) for (const target of entry.replaces) replacedBy.set(target, [...(replacedBy.get(target) ?? []), entry.seq]);
  return entries.map((entry) => ({
    ...entry,
    replacedBy: replacedBy.get(entry.seq) ?? [],
    trajectoryRowKey: surfaceTrajectoryRowKey(session.events?.[entry.seq], entry.seq, entry.kind),
  }));
}

export function tavernSurfaceEventDetail(session: any, seq: number): TavernSurfaceEventDetail | undefined {
  const audit = tavernSurfaceAudit(session).find((entry) => entry.seq === seq);
  const event = session?.events?.[seq];
  if (audit === undefined || event === undefined) return undefined;
  const message = event.data?.message ?? event.data;
  const sections = Array.isArray(message?.source?.sections)
    ? message.source.sections.flatMap((section: any) => typeof section?.name === "string" && typeof section?.text === "string" ? [{ name: section.name, text: section.text }] : [])
    : [];
  return { ...audit, content: surfaceEventText(event), sections };
}

export function renderWorldbookSnapshot(sections: readonly TavernWorldbookSection[]): string {
  const body = sections.length === 0
    ? "当前没有生效的世界书条目。"
    : sections.map((section) => `[${section.name}]\n${section.text}`).join("\n\n");
  return `${TAVERN_WORLD_CONTEXT_MARKER}\n这是当前对话对应的世界书事实快照。不要向玩家提及世界书、快照或插件。\n\n${body}`;
}

export function upsertWorldbookContext(session: any, sections: readonly TavernWorldbookSection[]): { changed: boolean; seq: number; revision: number } {
  const text = renderWorldbookSnapshot(sections);
  const currentSeq = currentWorldbookSurfaceSeq(session);
  const currentEvent = currentSeq === undefined ? undefined : session.events?.[currentSeq];
  const currentMessage = currentEvent?.data?.message ?? currentEvent?.data;
  const currentText = messageText(currentMessage);
  const currentRevision = worldbookContextRevision(session);
  if (currentSeq !== undefined && currentText === text) return { changed: false, seq: currentSeq, revision: currentRevision };
  const revision = currentRevision + 1;
  const message = {
    id: crypto.randomUUID(),
    role: "user",
    content: [{ type: "text", text }],
    source: {
      kind: "plugin",
      plugin: TAVERN_PLUGIN_ID,
      form: "snapshot",
      sections,
    },
  };
  const event = currentSeq === undefined
    ? session.append("user/message", message, { surfaceOp: "append" })
    : session.append("user/message", message, {
        surfaceOp: { op: "replace", start: currentSeq, end: currentSeq },
        sourceEventSeqs: [currentSeq],
      });
  return { changed: true, seq: event.seq, revision };
}

export function isolateTavernAssembly(assembly: any): any {
  return {
    ...assembly,
    contexts: (assembly.contexts ?? []).filter((context: any) => typeof context?.name === "string" && context.name.startsWith(TAVERN_CONTEXT_PREFIX)),
    tools: [],
  };
}

export function adjacentOpeningId(openings: readonly { id: string }[], currentId: string, offset: number): string | undefined {
  if (openings.length === 0) return undefined;
  const current = Math.max(0, openings.findIndex((opening) => opening.id === currentId));
  return openings[(current + offset % openings.length + openings.length) % openings.length]?.id;
}

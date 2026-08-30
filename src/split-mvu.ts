import type { WorldbookActivation, WorldbookEntry } from "./worldbook.js";
import { applyVariableUpdate, type VariableObject, type VariableUpdateResult } from "./variable-runtime.js";

export type SplitMvuPhase = "plot" | "update";

export function extractSplitMvuUpdateBlocks(body: string): string {
  return Array.from(body.matchAll(/<UpdateVariable\b[^>]*>[\s\S]*?<\/UpdateVariable>/giu), (match) => match[0]).join("\n");
}

export function interleaveSplitMvuReplies(
  formalReplies: readonly { seq: number; text: string }[],
  splitRepliesByAssistantSeq: Readonly<Record<string, string>> = {},
): string[] {
  return formalReplies.flatMap((reply) => {
    const splitReply = splitRepliesByAssistantSeq[String(reply.seq)]?.trim() ?? "";
    return splitReply.length === 0 ? [reply.text] : [reply.text, splitReply];
  });
}

function entryPhase(entry: Pick<WorldbookEntry, "comment">): SplitMvuPhase | undefined {
  if (/\[mvu_plot\]/iu.test(entry.comment)) return "plot";
  if (/\[mvu_update\]/iu.test(entry.comment)) return "update";
  return undefined;
}

export function hasSplitMvuContract(entries: readonly Pick<WorldbookEntry, "comment">[]): boolean {
  let hasPlot = false;
  let hasUpdate = false;
  for (const entry of entries) {
    const phase = entryPhase(entry);
    if (phase === "plot") hasPlot = true;
    if (phase === "update") hasUpdate = true;
  }
  return hasPlot && hasUpdate;
}

export function splitMvuActivationForPhase(activation: WorldbookActivation, phase: SplitMvuPhase): WorldbookActivation {
  return {
    ...activation,
    active: activation.active.filter((entry) => {
      const taggedPhase = entryPhase(entry);
      return taggedPhase === undefined || taggedPhase === phase;
    }),
  };
}

export type SplitMvuPatchCompatibilityResult = {
  body: string;
  result: VariableUpdateResult;
  repairedPaths: string[];
};

/**
 * Tavern MVU prompts commonly emit JSON Patch `replace` for a leaf that has not
 * appeared in the current snapshot yet. Keep the core variable runtime strict,
 * but make that one ecosystem compatibility concession for the isolated
 * secondary MVU phase. Every rewrite is followed by a complete atomic replay;
 * unrelated path/type errors remain failures.
 */
export function applySplitMvuPatchCompatibility(before: VariableObject, body: string): SplitMvuPatchCompatibilityResult {
  type PatchItem = { op?: unknown; path?: unknown; [key: string]: unknown };
  const blocks: Array<{ source: string; items: PatchItem[] }> = [];
  const matcher = /<JSON_?Patch\b[^>]*>([\s\S]*?)<\/JSON_?Patch>/giu;
  for (const match of body.matchAll(matcher)) {
    try {
      const parsed = JSON.parse(match[1].trim()) as unknown;
      if (!Array.isArray(parsed)) return { body, result: applyVariableUpdate(before, body), repairedPaths: [] };
      blocks.push({ source: match[0], items: parsed as PatchItem[] });
    } catch {
      return { body, result: applyVariableUpdate(before, body), repairedPaths: [] };
    }
  }
  if (blocks.length === 0) return { body, result: applyVariableUpdate(before, body), repairedPaths: [] };

  const render = (): string => {
    let rendered = body;
    for (const block of blocks) {
      const tag = /^<JSON_?Patch\b[^>]*>/iu.exec(block.source)?.[0] ?? "<JSONPatch>";
      const close = /<\/JSON_?Patch>$/iu.exec(block.source)?.[0] ?? "</JSONPatch>";
      rendered = rendered.replace(block.source, `${tag}${JSON.stringify(block.items)}${close}`);
    }
    return rendered;
  };

  const repairedPaths: string[] = [];
  let candidate = body;
  let result = applyVariableUpdate(before, candidate);
  for (let repairCount = 0; result.status === "failed" && repairCount < 64; repairCount += 1) {
    const diagnostic = result.diagnostics.find((item) => item.code === "PATH_NOT_FOUND" && item.operation === "replace" && typeof item.path === "string");
    if (diagnostic?.path === undefined) break;
    let repaired = false;
    for (const block of blocks) {
      const item = block.items.find((entry) => String(entry.op).toLocaleLowerCase() === "replace" && entry.path === diagnostic.path);
      if (item === undefined) continue;
      item.op = "insert";
      repairedPaths.push(diagnostic.path);
      repaired = true;
      break;
    }
    if (!repaired) break;
    candidate = render();
    result = applyVariableUpdate(before, candidate);
  }
  return { body: candidate, result, repairedPaths };
}

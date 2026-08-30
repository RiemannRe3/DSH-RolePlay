export type RichBlock = { kind: "prose" | "html"; content: string };

export type RichFrameContentMetrics = {
  bodyScrollHeight: number;
  bodyOffsetHeight: number;
  bodyRectTop: number;
  bodyRectBottom: number;
  // Viewport-coupled layouts may supply the visible scrollable extent that is
  // still clipped by the current probe height. Fixed authored stages omit it.
  nestedScrollableOverflowHeight?: number;
};

export type RichFrameScrollableMetrics = {
  key: string;
  visible: boolean;
  top: number;
  clientHeight: number;
  scrollHeight: number;
  owners?: Array<{
    key: string;
    kind: "fixed" | "clip" | "scroll";
    clientHeight: number;
  }>;
};

export type RichFrameLayoutSnapshot = {
  viewportHeight: number;
  bodyHeight: number;
  contentBottom: number;
  layoutVersion: number;
  scrollables: RichFrameScrollableMetrics[];
};

export type RichFrameVisibilityNode = {
  tagName: string;
  open?: boolean;
  parentElement: RichFrameVisibilityNode | null;
  children?: ArrayLike<RichFrameVisibilityNode>;
  contains?(candidate: RichFrameVisibilityNode): boolean;
};

export type SillyTavernCompatibilityContext = {
  chat: Array<Record<string, never>>;
  chatId: number;
  extensionSettings: {
    EjsTemplate: {
      enabled: boolean;
    };
  };
};

const rawHtmlDocument = /^\s*<(?:!doctype|html|body|style|div|section|details)\b/iu;
const htmlFragment = /^\s*<(?:!doctype|[a-z][\w:-]*)(?:\s|>)[\s\S]*>\s*$/iu;
const fencedHtml = /```html\s*\r?\n([\s\S]*?)\r?\n```/giu;
const fencedUntypedHtmlDocument = /```[ \t]*\r?\n(\s*<(?:!doctype|html)\b[\s\S]*?)\r?\n```/giu;
const htmlTag = /<!--[\s\S]*?-->|<![^>]*>|<\/?([a-z][\w:-]*)\b(?:\s+(?:"[^"]*"|'[^']*'|[^'"<>])*)?\s*\/?>/giu;
const rawTextElement = /<(script|style|template)\b(?:\s+(?:"[^"]*"|'[^']*'|[^'"<>])*)?\s*>[\s\S]*?<\/\1\s*>/giu;
const voidHtmlTags = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
const crossBoundaryContainerTags = new Set(["article", "aside", "body", "details", "dialog", "div", "fieldset", "footer", "form", "header", "html", "main", "nav", "ol", "section", "table", "tbody", "tfoot", "thead", "ul"]);

function leavesOpenHtmlContainer(value: string): boolean {
  const stack: string[] = [];
  const structuralHtml = value.replace(rawTextElement, "");
  for (const match of structuralHtml.matchAll(new RegExp(htmlTag.source, htmlTag.flags))) {
    const token = match[0];
    const tag = match[1]?.toLowerCase();
    if (tag === undefined || token.startsWith("<!--") || token.startsWith("<!")) continue;
    if (token.startsWith("</")) {
      const matchingIndex = stack.lastIndexOf(tag);
      if (matchingIndex >= 0) stack.splice(matchingIndex);
      continue;
    }
    if (token.endsWith("/>") || voidHtmlTags.has(tag)) continue;
    stack.push(tag);
  }
  return stack.some((tag) => crossBoundaryContainerTags.has(tag) || tag.includes("-"));
}

function escapeCrossBoundaryProse(value: string): string {
  // `<content>` is a common card control wrapper, not player prose. In the
  // original shared message DOM the browser consumes it as markup; do the same
  // without allowing arbitrary prose HTML to become executable in the iframe.
  const visible = value
    .replace(/(?:^|\r?\n)[ \t]*<\/?content\b[^>]*>[ \t]*(?=\r?\n|$)/giu, "\n")
    .trim();
  if (visible.length === 0) return "";
  const escaped = visible
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
  return `<div data-dsh-cross-boundary-prose style="white-space: pre-wrap">${escaped}</div>`;
}

function stitchCrossBoundaryWrapper(blocks: readonly RichBlock[]): RichBlock[] {
  const openingIndex = blocks.findIndex((block, index) => block.kind === "html"
    && index < blocks.length - 1
    && leavesOpenHtmlContainer(block.content));
  if (openingIndex < 0) return [...blocks];

  const content = blocks.slice(openingIndex)
    .map((block) => block.kind === "html" ? block.content : escapeCrossBoundaryProse(block.content))
    .filter((value) => value.length > 0)
    .join("\n");
  return [...blocks.slice(0, openingIndex), { kind: "html", content }];
}

// Message iframes are expanded by the Host, so their previous viewport height
// must never participate in the next measurement. In particular,
// documentElement.scrollHeight is pinned to an already-tall iframe and cannot
// shrink after a card switches from a long page to a short page.
export function measureRichFrameContentHeight(metrics: RichFrameContentMetrics): number {
  const finite = (value: number): number => Number.isFinite(value) ? value : 0;
  const bodyTop = Math.min(0, finite(metrics.bodyRectTop));
  const bodyBottom = Math.max(
    finite(metrics.bodyScrollHeight),
    finite(metrics.bodyOffsetHeight),
    finite(metrics.bodyRectBottom) - bodyTop,
  );
  // A confirmed viewport-coupled shell can still clip authored content in a
  // descendant scroller. The caller decides whether that fallback applies.
  const nestedOverflow = Math.max(0, finite(metrics.nestedScrollableOverflowHeight ?? 0));
  return Math.max(72, Math.ceil(bodyBottom + nestedOverflow));
}

// Scrollable descendants can overlap or nest, so their hidden capacity is a
// geometric extent, not an additive quantity. Inactive pages are excluded by
// the visibility bit collected from the live DOM.
export function measureRichFrameScrollableContentBottom(
  bodyHeight: number,
  scrollables: readonly RichFrameScrollableMetrics[],
): number {
  const finite = (value: number): number => Number.isFinite(value) ? value : 0;
  let bottom = Math.max(0, finite(bodyHeight));
  for (const scrollable of scrollables) {
    if (!scrollable.visible) continue;
    const top = Math.max(0, finite(scrollable.top));
    const scrollHeight = Math.max(0, finite(scrollable.scrollHeight));
    bottom = Math.max(bottom, top + scrollHeight);
  }
  return Math.ceil(bottom);
}

// A closed details keeps only its first summary in the rendered layout. Some
// browsers still expose scroll metrics for the details element or descendants
// populated by a late script, so geometry alone cannot classify that hidden
// option page. Exclude that capacity until the author opens the details.
export function isRichFrameNodeHiddenByClosedDetails(
  node: RichFrameVisibilityNode,
  boundary: RichFrameVisibilityNode | null = null,
): boolean {
  for (let ancestor: RichFrameVisibilityNode | null = node; ancestor !== null && ancestor !== boundary; ancestor = ancestor.parentElement) {
    if (ancestor.tagName.toUpperCase() !== "DETAILS" || ancestor.open === true) continue;
    if (ancestor === node) return true;
    const summary = Array.from(ancestor.children ?? []).find((child) => child.tagName.toUpperCase() === "SUMMARY");
    if (summary === undefined || summary.contains?.(node) !== true) return true;
  }
  return false;
}

// Probe the same document at two heights. A top-level body/shell that follows
// a meaningful fraction of the viewport delta is coupled to vh. Fixed pixel
// stages have a zero delta and keep their own internal scrolling.
export function isRichFrameViewportCoupled(
  first: RichFrameLayoutSnapshot,
  second: RichFrameLayoutSnapshot,
): boolean {
  if (first.layoutVersion !== second.layoutVersion) return false;
  const viewportDelta = second.viewportHeight - first.viewportHeight;
  if (!Number.isFinite(viewportDelta) || Math.abs(viewportDelta) < 80) return false;
  const followsViewport = (delta: number): boolean => {
    if (!Number.isFinite(delta) || delta < 24) return false;
    const ratio = delta / viewportDelta;
    return ratio >= 0.35 && ratio <= 1.65;
  };
  return followsViewport(second.bodyHeight - first.bodyHeight);
}

export function findRichFrameViewportScrollKeys(
  first: RichFrameLayoutSnapshot,
  second: RichFrameLayoutSnapshot,
): string[] {
  if (!isRichFrameViewportCoupled(first, second)) return [];
  const viewportDelta = second.viewportHeight - first.viewportHeight;
  const secondByKey = new Map(second.scrollables.map((item) => [item.key, item]));
  const followsViewport = (delta: number, minimum = 0.2): boolean => {
    if (!Number.isFinite(delta) || delta <= 0) return false;
    const ratio = delta / viewportDelta;
    return ratio >= minimum && ratio <= 1.65;
  };
  const released: string[] = [];
  for (const initial of first.scrollables) {
    const expanded = secondByKey.get(initial.key);
    if (expanded === undefined || !initial.visible || !expanded.visible) continue;
    if (!areRichFrameScrollKeysStable([initial.key], first, second)) continue;
    const initialGap = Math.max(0, initial.scrollHeight - initial.clientHeight);
    const expandedGap = Math.max(0, expanded.scrollHeight - expanded.clientHeight);
    if (followsViewport(initialGap - expandedGap)) released.push(initial.key);
  }
  return released;
}

export function areRichFrameScrollKeysStable(
  keys: readonly string[],
  first: RichFrameLayoutSnapshot,
  second: RichFrameLayoutSnapshot,
): boolean {
  if (first.layoutVersion !== second.layoutVersion) return false;
  const viewportDelta = second.viewportHeight - first.viewportHeight;
  if (!Number.isFinite(viewportDelta) || viewportDelta < 80) return false;
  const firstByKey = new Map(first.scrollables.map((item) => [item.key, item]));
  const secondByKey = new Map(second.scrollables.map((item) => [item.key, item]));
  return keys.every((key) => {
    const initial = firstByKey.get(key);
    const expanded = secondByKey.get(key);
    if (initial === undefined || expanded === undefined || !initial.visible || !expanded.visible) return false;
    const initialOwners = initial.owners ?? [];
    const expandedOwnerList = expanded.owners ?? [];
    const expandedOwners = new Map(expandedOwnerList.map((owner) => [owner.key, owner]));
    const ownershipStable = initialOwners.length === expandedOwnerList.length
      && initialOwners.every((owner) => {
        const changed = expandedOwners.get(owner.key);
        if (changed === undefined || changed.kind !== owner.kind || owner.kind === "fixed" || owner.kind === "scroll") return false;
        const ratio = (changed.clientHeight - owner.clientHeight) / viewportDelta;
        return Number.isFinite(ratio) && ratio >= 0.2 && ratio <= 1.65;
      });
    if (!ownershipStable) return false;
    const clientRatio = (expanded.clientHeight - initial.clientHeight) / viewportDelta;
    const followsViewport = Number.isFinite(clientRatio) && clientRatio >= 0.2 && clientRatio <= 1.65;
    const fullyExpanded = initial.scrollHeight <= initial.clientHeight + 2
      && expanded.scrollHeight <= expanded.clientHeight + 2;
    return followsViewport || fullyExpanded;
  });
}

// For a viewport-driven scroller, increasing the iframe closes part of its
// overflow gap. Project that closure rate to the height where the gap reaches
// zero. Fixed scrollers have a zero rate and therefore remain internal.
export function resolveRichFrameProbeHeight(
  first: RichFrameLayoutSnapshot,
  second: RichFrameLayoutSnapshot,
): number {
  if (first.layoutVersion !== second.layoutVersion) {
    return clampRichFrameHeight(first.bodyHeight);
  }
  const viewportDelta = second.viewportHeight - first.viewportHeight;
  let target = Math.max(0, first.bodyHeight);
  if (!Number.isFinite(viewportDelta) || viewportDelta < 80) return clampRichFrameHeight(target);
  const bodyDelta = second.bodyHeight - first.bodyHeight;
  const bodyRatio = bodyDelta / viewportDelta;
  const bodyFollowsViewport = bodyDelta >= 24
    && bodyRatio >= 0.35
    && bodyRatio <= 1.65;
  // A responsive descendant inside a fixed stage is still owned by that
  // stage. Only a top-level body/shell that follows the probe may release its
  // own viewport-driven scroll regions to the outer Conversation.
  if (!bodyFollowsViewport) return clampRichFrameHeight(target);

  const releasedKeys = new Set(findRichFrameViewportScrollKeys(first, second));
  const secondByKey = new Map(second.scrollables.map((item) => [item.key, item]));
  for (const initial of first.scrollables) {
    if (!releasedKeys.has(initial.key)) continue;
    const expanded = secondByKey.get(initial.key);
    if (expanded === undefined || !initial.visible || !expanded.visible) continue;
    const initialGap = Math.max(0, initial.scrollHeight - initial.clientHeight);
    const expandedGap = Math.max(0, expanded.scrollHeight - expanded.clientHeight);
    const closureRate = (initialGap - expandedGap) / viewportDelta;
    if (!Number.isFinite(closureRate) || closureRate < 0.2 || closureRate > 1.65) continue;
    target = Math.max(target, first.viewportHeight + initialGap / closureRate);
  }
  return clampRichFrameHeight(target);
}

export function resolveRichFrameLayoutHeight(
  snapshot: RichFrameLayoutSnapshot,
  viewportCoupled: boolean,
  releasedScrollKeys: readonly string[] = [],
): number {
  const released = new Set(releasedScrollKeys);
  const target = viewportCoupled
    ? measureRichFrameScrollableContentBottom(
      snapshot.bodyHeight,
      snapshot.scrollables.map((item) => ({ ...item, visible: item.visible && released.has(item.key) })),
    )
    : snapshot.bodyHeight;
  return clampRichFrameHeight(target);
}

// Real cards can legitimately be many screens tall, so the Host owns one
// generous outer-scroll surface. Still cap a forged or broken resize receipt
// before it can create a billion-pixel layout in the conversation.
export function clampRichFrameHeight(value: number): number {
  if (!Number.isFinite(value)) return 72;
  return Math.max(72, Math.min(40_000, Math.ceil(value)));
}

// The accepted SillyTavern reference profile exposes EjsTemplate as enabled.
// Real-card environment checks read this exact public context path. Keeping the
// compatibility value in one builder prevents the iframe bootstrap from
// drifting into an incomplete, card-specific mock.
export function buildSillyTavernCompatibilityContext(messageCount: number, currentMessageId: number): SillyTavernCompatibilityContext {
  const safeCount = Number.isFinite(messageCount) ? Math.max(0, Math.trunc(messageCount)) : 0;
  const safeMessageId = Number.isFinite(currentMessageId) ? Math.trunc(currentMessageId) : -1;
  return {
    chat: Array.from({ length: safeCount }, () => ({})),
    chatId: safeMessageId,
    extensionSettings: { EjsTemplate: { enabled: true } },
  };
}

export function alignProjectedRoles(
  flowRoles: readonly ("user" | "assistant")[],
  projectedRoles: readonly ("user" | "assistant")[],
): Array<number | null> | null {
  const aligned = Array.from({ length: flowRoles.length }, () => null as number | null);
  let projectedIndex = 0;
  for (let flowIndex = 0; flowIndex < flowRoles.length && projectedIndex < projectedRoles.length; flowIndex += 1) {
    if (flowRoles[flowIndex] !== projectedRoles[projectedIndex]) continue;
    aligned[flowIndex] = projectedIndex;
    projectedIndex += 1;
  }
  return projectedIndex === projectedRoles.length ? aligned : null;
}

export function splitRichMessage(text: string): RichBlock[] {
  if (rawHtmlDocument.test(text)) return [{ kind: "html", content: text.trim() }];

  // Some real Tavern cards prepend a fenced <style> block to an opening whose
  // document root is a custom element (for example <welcome>). Treat that
  // combination as one frontend document so the style and markup share an
  // iframe instead of leaking hundreds of HTML lines into native prose.
  const fencedDocumentCount = [...text.matchAll(new RegExp(fencedHtml.source, fencedHtml.flags))].length
    + [...text.matchAll(new RegExp(fencedUntypedHtmlDocument.source, fencedUntypedHtmlDocument.flags))].length;
  if (fencedDocumentCount <= 1) {
    const stitched = text
      .replace(fencedHtml, (_match, content: string) => content)
      // SillyTavern cards in the wild also fence complete HTML documents without
      // an `html` language label. Only unwrap documents whose first tag proves
      // their intent; ordinary untyped code fences remain prose/code.
      .replace(fencedUntypedHtmlDocument, (_match, content: string) => content)
      .trim();
    if (htmlFragment.test(stitched)) return [{ kind: "html", content: stitched }];
  }

  const blocks: RichBlock[] = [];
  const expression = new RegExp(fencedHtml.source, fencedHtml.flags);
  let cursor = 0;
  for (const match of text.matchAll(expression)) {
    const index = match.index ?? cursor;
    const before = text.slice(cursor, index).trim();
    if (before.length > 0) blocks.push({ kind: "prose", content: before });
    blocks.push({ kind: "html", content: match[1] ?? "" });
    cursor = index + match[0].length;
  }
  const after = text.slice(cursor).trim();
  if (after.length > 0) blocks.push({ kind: "prose", content: after });
  if (blocks.length === 0) blocks.push({ kind: "prose", content: text });
  // Some Tavern display Regex rules deliberately open a visual wrapper when a
  // control tag starts and rely on the shared SillyTavern message DOM to close
  // it at the end of the message. An iframe boundary would otherwise close the
  // wrapper before the following prose. Compose only that structural case;
  // balanced authored fragments keep the ordinary native prose/iframe flow.
  return stitchCrossBoundaryWrapper(blocks);
}

// The authored documents run in a sandboxed data document with a unique
// origin. Rewrite only the well-known SillyTavern parent-window access points
// used by the accepted real cards; ordinary parent.postMessage remains
// untouched for resize notices.
export function adaptRealCardFrontendHtml(value: string): string {
  return value
    .replaceAll("window.parent.document", "window.__dshCompatDocument")
    .replaceAll("window.top.document", "window.__dshCompatDocument")
    .replaceAll("parent.document", "window.__dshCompatDocument")
    .replaceAll("top.document", "window.__dshCompatDocument")
    .replaceAll("window.parent?.SillyTavern", "window.__dshSillyTavern")
    .replaceAll("window.top?.SillyTavern", "window.__dshSillyTavern")
    .replaceAll("window.parent.SillyTavern", "window.__dshSillyTavern")
    .replaceAll("window.top.SillyTavern", "window.__dshSillyTavern")
    .replaceAll("window.parent?.TavernHelper", "window.__dshTavernHelper")
    .replaceAll("window.top?.TavernHelper", "window.__dshTavernHelper")
    .replaceAll("window.parent.TavernHelper", "window.__dshTavernHelper")
    .replaceAll("window.top.TavernHelper", "window.__dshTavernHelper")
    .replaceAll("window.parent?.Mvu", "window.__dshMvu")
    .replaceAll("window.top?.Mvu", "window.__dshMvu")
    .replaceAll("window.parent.Mvu", "window.__dshMvu")
    .replaceAll("window.top.Mvu", "window.__dshMvu")
    // Bundled card code sometimes aliases the frame first (`const host =
    // window.top`) and only reads SillyTavern APIs afterwards. Keep resize
    // postMessages pointed at the host, then collapse any remaining top/parent
    // aliases to the compatibility globals installed inside the data document.
    .replaceAll("window.parent.postMessage", "parent.postMessage")
    .replace(/window\.(?:parent|top)(?![\w$])/gu, "window");
}

const magVarUpdateLoader = "import 'https://testingcf.jsdelivr.net/gh/MagicalAstrogy/MagVarUpdate/artifact/bundle.js'";

// Community cards commonly carry this one-line loader to publish MagVarUpdate
// into SillyTavern's parent page. DSH already installs a Session-backed Mvu
// facade before companion scripts run, while the upstream bundle expects an
// external `z` global and direct parent-window writes that an isolated iframe
// must not receive. Preserve the authored card source in its revision/detail,
// but adapt this exact, standalone community loader to the native compatibility
// seam at execution time. Do not rewrite pinned variants, mixed scripts, or the
// same URL inside string/template literals: those may rely on upstream side
// effects beyond DSH's deliberately narrow facade. Other scripts remain
// untouched and require consent.
export function adaptTavernHelperScriptSource(value: string): string {
  return value.trim() === magVarUpdateLoader
    ? "void window.waitGlobalInitialized('Mvu');"
    : value;
}

export type RichBlock = { kind: "prose" | "html"; content: string };

export type RichFrameContentMetrics = {
  bodyScrollHeight: number;
  bodyOffsetHeight: number;
  bodyRectTop: number;
  bodyRectBottom: number;
  nestedScrollableOverflowHeight?: number;
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
  // A viewport-relative card can keep body at exactly the current iframe
  // height while moving the rest of its UI into overflow:auto descendants.
  // Add that clipped extent so repeated resize receipts grow the viewport
  // until the outer DSH conversation owns the vertical scroll surface.
  const nestedOverflow = Math.max(0, finite(metrics.nestedScrollableOverflowHeight ?? 0));
  return Math.max(72, Math.ceil(bodyBottom + nestedOverflow));
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

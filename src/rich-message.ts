export type RichBlock = { kind: "prose" | "html"; content: string };

export type RichFrameContentMetrics = {
  bodyScrollHeight: number;
  bodyOffsetHeight: number;
  bodyRectTop: number;
  bodyRectBottom: number;
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
  return Math.max(72, Math.ceil(bodyBottom));
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
  return blocks;
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

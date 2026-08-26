export type Playability = "ready" | "degraded" | "blocked";

export type CompatibilityDisposition = "完整生效" | "等价替代" | "仅保留" | "已禁用" | "已丢失";

export type CompatibilityRow = {
  capability: string;
  disposition: CompatibilityDisposition;
  evidence: string;
};

export type ParsedOpening = {
  label: string;
  message: string;
};

export type ImportedCardDraft = {
  digest: string;
  sourceName: string;
  format: string;
  title: string;
  creator: string;
  summary: string;
  openings: ParsedOpening[];
  unknownFieldCount: number;
  playability: Playability;
  statusText: string;
  statusDetail: string;
  compatibilityRows: CompatibilityRow[];
  coverFile: File | null;
  rawBytes: Uint8Array;
};

export type FileInspection = {
  file: File;
  digest: string;
  rawBytes: Uint8Array;
  role: "character_card" | "cover_or_preview" | "worldbook" | "unknown";
  format: string;
  evidence: string;
  card?: ImportedCardDraft;
};

export type ImportBatch = {
  inspections: FileInspection[];
  cards: ImportedCardDraft[];
  notice: string;
};

type JsonObject = Record<string, unknown>;
type CapabilityFinding = { label: string; evidence: string; inferred: boolean };

const ROOT_KNOWN = new Set(["spec", "spec_version", "data"]);
const DATA_KNOWN = new Set([
  "name", "description", "personality", "scenario", "first_mes", "mes_example", "creator_notes",
  "system_prompt", "post_history_instructions", "alternate_greetings", "tags", "creator",
  "character_version", "extensions", "character_book", "group_only_greetings", "nickname",
  "creator_notes_multilingual", "source", "assets",
]);

const textDecoder = new TextDecoder("utf-8", { fatal: false });

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function objectAt(value: unknown, key: string): JsonObject | undefined {
  if (!isObject(value)) return undefined;
  const child = value[key];
  return isObject(child) ? child : undefined;
}

function arrayAt(value: unknown, key: string): unknown[] {
  if (!isObject(value)) return [];
  const child = value[key];
  return Array.isArray(child) ? child : [];
}

function stringAt(value: unknown, key: string): string {
  if (!isObject(value)) return "";
  const child = value[key];
  return typeof child === "string" ? child : "";
}

function shortText(value: string, maximum = 96): string {
  const compact = value.replace(/\s+/gu, " ").trim();
  return compact.length <= maximum ? compact : `${compact.slice(0, maximum - 1)}…`;
}

function baseName(name: string): string {
  return name.replace(/\.[^.]+$/u, "").trim().toLocaleLowerCase("zh-CN");
}

function readU32(bytes: Uint8Array, offset: number): number {
  return ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0;
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let index = 0; index < 8; index += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

async function inflate(bytes: Uint8Array): Promise<Uint8Array> {
  const DecompressionStreamConstructor = (window as unknown as { DecompressionStream?: new (format: string) => TransformStream }).DecompressionStream;
  if (DecompressionStreamConstructor === undefined) throw new Error("当前浏览器不支持压缩 PNG 文本解码");
  const input = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const stream = new Blob([input]).stream().pipeThrough(new DecompressionStreamConstructor("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function pngTextEntries(bytes: Uint8Array): Promise<Record<string, string>> {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (bytes.length < 20 || !signature.every((value, index) => bytes[index] === value)) throw new Error("PNG 文件头不完整");
  const entries: Record<string, string> = {};
  let offset = 8;
  let sawIend = false;
  while (offset + 12 <= bytes.length) {
    const length = readU32(bytes, offset);
    const chunkEnd = offset + 12 + length;
    if (chunkEnd > bytes.length) throw new Error("PNG chunk 长度越界");
    const typeBytes = bytes.slice(offset + 4, offset + 8);
    const type = String.fromCharCode(...typeBytes);
    const data = bytes.slice(offset + 8, offset + 8 + length);
    const expectedCrc = readU32(bytes, offset + 8 + length);
    const crcInput = new Uint8Array(4 + data.length);
    crcInput.set(typeBytes);
    crcInput.set(data, 4);
    if (crc32(crcInput) !== expectedCrc) throw new Error(`${type} chunk 校验失败`);
    if (type === "tEXt") {
      const zero = data.indexOf(0);
      if (zero >= 0) entries[textDecoder.decode(data.slice(0, zero))] = textDecoder.decode(data.slice(zero + 1));
    } else if (type === "zTXt") {
      const zero = data.indexOf(0);
      if (zero >= 0 && data[zero + 1] === 0) entries[textDecoder.decode(data.slice(0, zero))] = textDecoder.decode(await inflate(data.slice(zero + 2)));
    } else if (type === "iTXt") {
      const keywordEnd = data.indexOf(0);
      if (keywordEnd >= 0 && keywordEnd + 3 <= data.length) {
        const keyword = textDecoder.decode(data.slice(0, keywordEnd));
        const compressed = data[keywordEnd + 1] === 1;
        let cursor = keywordEnd + 3;
        const languageEnd = data.indexOf(0, cursor);
        if (languageEnd < 0) throw new Error("iTXt language tag 不完整");
        cursor = languageEnd + 1;
        const translatedEnd = data.indexOf(0, cursor);
        if (translatedEnd < 0) throw new Error("iTXt translated keyword 不完整");
        const payload = data.slice(translatedEnd + 1);
        entries[keyword] = textDecoder.decode(compressed ? await inflate(payload) : payload);
      }
    }
    offset = chunkEnd;
    if (type === "IEND") {
      sawIend = true;
      break;
    }
  }
  if (!sawIend) throw new Error("PNG 缺少 IEND 结束标记");
  return entries;
}

function decodeCardMetadata(encoded: string): JsonObject {
  try {
    const binary = atob(encoded.trim());
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const decoded = JSON.parse(textDecoder.decode(bytes)) as unknown;
    if (!isObject(decoded)) throw new Error("卡片元数据不是对象");
    return decoded;
  } catch (base64Error) {
    try {
      const decoded = JSON.parse(encoded) as unknown;
      if (!isObject(decoded)) throw new Error("卡片元数据不是对象");
      return decoded;
    } catch {
      throw base64Error;
    }
  }
}

async function sha256(bytes: Uint8Array): Promise<string> {
  const input = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", input));
  return Array.from(digest, (value) => value.toString(16).padStart(2, "0")).join("");
}

function countUnknownFields(card: JsonObject): number {
  const data = objectAt(card, "data") ?? card;
  const rootUnknown = objectAt(card, "data") === undefined ? 0 : Object.keys(card).filter((key) => !ROOT_KNOWN.has(key)).length;
  return rootUnknown + Object.keys(data).filter((key) => !DATA_KNOWN.has(key)).length;
}

function detectCapabilities(card: JsonObject, sourceName: string): CapabilityFinding[] {
  const data = objectAt(card, "data") ?? card;
  const extensions = objectAt(data, "extensions") ?? {};
  const characterBook = objectAt(data, "character_book");
  const findings: CapabilityFinding[] = [];
  const add = (label: string, evidence: string, inferred = false): void => {
    if (!findings.some((finding) => finding.label === label)) findings.push({ label, evidence, inferred });
  };
  const worldbookEntries = characterBook === undefined ? [] : arrayAt(characterBook, "entries");
  if (worldbookEntries.length > 0) add("世界书", `${sourceName}: data.character_book.entries (${worldbookEntries.length})`);
  const regexScripts = arrayAt(extensions, "regex_scripts").length > 0 ? arrayAt(extensions, "regex_scripts") : arrayAt(extensions, "regex");
  if (regexScripts.length > 0) add("正则脚本", `${sourceName}: data.extensions.regex_scripts (${regexScripts.length})`);
  const quickReplies = arrayAt(extensions, "quick_replies");
  if (quickReplies.length > 0) add("快捷回复", `${sourceName}: data.extensions.quick_replies (${quickReplies.length})`);
  const helper = objectAt(extensions, "tavern_helper");
  if (helper !== undefined && Object.keys(helper).length > 0) add("酒馆助手", `${sourceName}: data.extensions.tavern_helper`);
  const serialized = JSON.stringify(card);
  if (/mvu|magvarupdate|mvu_init/iu.test(serialized)) add("MVU 变量系统", `${sourceName}: 发现 MVU 静态标记，仍需来源说明确认用途`, true);
  if (/\{\{(?:setvar|getvar)|\/setvar\b|\/getvar\b|stscript/iu.test(serialized)) add("STscript", `${sourceName}: 发现 STscript 静态标记，仍需来源说明确认用途`, true);
  if (/<(?:div|span|button|section|details)\b/iu.test(serialized)) add("HTML 前端", `${sourceName}: 文本中发现 HTML 标记`, true);
  if (/<style\b|style=|\.css\b/iu.test(serialized)) add("CSS 样式", `${sourceName}: 文本中发现 CSS 标记`, true);
  if (/<script\b|javascript:|eval\s*\(|document\./iu.test(serialized)) add("JavaScript", `${sourceName}: 文本中发现 JavaScript 标记`, true);
  return findings;
}

function createCardDraft(card: JsonObject, file: File, digest: string, rawBytes: Uint8Array, format: string): ImportedCardDraft {
  const data = objectAt(card, "data") ?? card;
  const title = stringAt(data, "name").trim() || baseName(file.name) || "未命名角色卡";
  const firstMessage = stringAt(data, "first_mes");
  const alternates = arrayAt(data, "alternate_greetings").filter((value): value is string => typeof value === "string");
  const openings = [firstMessage, ...alternates]
    .filter((message) => message.trim().length > 0)
    .map((message, index) => ({ label: index === 0 ? "卡片开场" : `备选开场 ${index}`, message }));
  const findings = detectCapabilities(card, file.name);
  const unknownFieldCount = countUnknownFields(card);
  const compatibilityRows: CompatibilityRow[] = [
    { capability: "卡片结构", disposition: "完整生效", evidence: `${format} 已静态解析` },
    { capability: "原始文件", disposition: "完整生效", evidence: `${file.size.toLocaleString()} bytes 已按 SHA-256 原样保留` },
  ];
  if (unknownFieldCount > 0) compatibilityRows.push({ capability: "未知字段", disposition: "仅保留", evidence: `${unknownFieldCount} 个未建模字段仍在原件中，没有被丢弃或擅自解释` });
  for (const finding of findings) compatibilityRows.push({
    capability: finding.label,
    disposition: "仅保留",
    evidence: `${finding.evidence}；当前原型不会执行，且尚不知道它是否为开局必需`,
  });
  if (openings.length === 0) compatibilityRows.push({ capability: "角色开场", disposition: "已丢失", evidence: "卡片中没有可用的 first_mes 或备选开场" });
  const blockedReasons = findings.length + (openings.length === 0 ? 1 : 0);
  const playability: Playability = blockedReasons > 0 ? "blocked" : "ready";
  const statusText = playability === "ready" ? "可开始" : "暂时不能开始";
  const statusDetail = playability === "ready"
    ? `人物设定和 ${openings.length} 个开场已读出；没有发现尚未接入的卡内能力。`
    : openings.length === 0
      ? `没有读到可用开场；另发现 ${findings.length} 项卡内能力，不能把“文件读到了”误报成“功能已生效”。`
      : `发现 ${findings.length} 项卡内能力，但来源没有说明哪些是必需项；确认或适配前先阻止开局。`;
  const description = stringAt(data, "description") || stringAt(data, "scenario");
  return {
    digest,
    sourceName: file.name,
    format,
    title,
    creator: stringAt(data, "creator").trim(),
    summary: shortText(description) || "卡片已解析；没有提供可展示的简介。",
    openings,
    unknownFieldCount,
    playability,
    statusText,
    statusDetail,
    compatibilityRows,
    coverFile: file.name.toLocaleLowerCase().endsWith(".png") ? file : null,
    rawBytes,
  };
}

async function inspectFile(file: File): Promise<FileInspection> {
  const rawBytes = new Uint8Array(await file.arrayBuffer());
  const digest = await sha256(rawBytes);
  const extension = file.name.toLocaleLowerCase().split(".").pop() ?? "";
  if (extension === "json") {
    try {
      const parsed = JSON.parse(textDecoder.decode(rawBytes)) as unknown;
      if (!isObject(parsed)) throw new Error("JSON 顶层不是对象");
      const spec = stringAt(parsed, "spec");
      if (spec === "chara_card_v2" || spec === "chara_card_v3") {
        return { file, digest, rawBytes, role: "character_card", format: spec, evidence: "JSON 角色卡结构已解析", card: createCardDraft(parsed, file, digest, rawBytes, spec) };
      }
      if (arrayAt(parsed, "entries").length > 0 || arrayAt(objectAt(parsed, "data"), "entries").length > 0) {
        return { file, digest, rawBytes, role: "worldbook", format: "worldbook_json", evidence: "识别为独立世界书；本批次没有把它伪装成角色卡" };
      }
      return { file, digest, rawBytes, role: "unknown", format: "json_other", evidence: "JSON 可解析，但不是 V2/V3 角色卡或已知世界书" };
    } catch (error) {
      return { file, digest, rawBytes, role: "unknown", format: "invalid_json", evidence: error instanceof Error ? error.message : "JSON 无法解析" };
    }
  }
  if (extension === "png") {
    try {
      const entries = await pngTextEntries(rawBytes);
      const encoded = entries.ccv3 ?? entries.chara;
      if (encoded === undefined) return { file, digest, rawBytes, role: "cover_or_preview", format: "png_image", evidence: "PNG 的 CRC 与 IEND 完整，但没有 chara/ccv3 元数据；只按封面保留" };
      const parsed = decodeCardMetadata(encoded);
      const format = stringAt(parsed, "spec") || (entries.ccv3 === undefined ? "chara_card_v2" : "chara_card_v3");
      return { file, digest, rawBytes, role: "character_card", format, evidence: "PNG 角色卡元数据与图片均已静态解析", card: createCardDraft(parsed, file, digest, rawBytes, format) };
    } catch (error) {
      return { file, digest, rawBytes, role: "unknown", format: "invalid_png", evidence: error instanceof Error ? error.message : "PNG 无法解析" };
    }
  }
  return { file, digest, rawBytes, role: "unknown", format: extension || "unknown", evidence: "原件已保留，但当前原型只解析 PNG 与 JSON" };
}

export async function inspectImportBatch(files: File[]): Promise<ImportBatch> {
  const inspections = await Promise.all(files.map(inspectFile));
  const covers = inspections.filter((inspection) => inspection.role === "cover_or_preview");
  const cards = inspections.flatMap((inspection) => inspection.card === undefined ? [] : [inspection.card]);
  for (const card of cards) {
    if (card.coverFile !== null) continue;
    const sameNameCover = covers.find((cover) => baseName(cover.file.name) === baseName(card.sourceName));
    const cover = sameNameCover ?? (covers.length === 1 && cards.length === 1 ? covers[0] : undefined);
    if (cover !== undefined) {
      card.coverFile = cover.file;
      card.compatibilityRows.push({ capability: "随卡封面", disposition: "完整生效", evidence: `${cover.file.name} 与 JSON 角色卡配对，原件仍独立保留` });
    }
  }
  const coverCount = covers.length;
  const worldbookCount = inspections.filter((inspection) => inspection.role === "worldbook").length;
  const unknowns = inspections.filter((inspection) => inspection.role === "unknown");
  const parts = [`检查 ${files.length} 个原件`, `识别 ${cards.length} 张角色卡`];
  if (coverCount > 0) parts.push(`${coverCount} 张仅封面`);
  if (worldbookCount > 0) parts.push(`${worldbookCount} 份独立世界书`);
  if (unknowns.length > 0) parts.push(`${unknowns.length} 个未识别或损坏文件`);
  return { inspections, cards, notice: `${parts.join("，")}。所有文件只做静态读取，卡内脚本没有执行。` };
}

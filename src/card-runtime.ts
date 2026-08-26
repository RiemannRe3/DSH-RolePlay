import { normalizeWorldbookEntry, type WorldbookEntry } from "./worldbook.js";
import { classifyInitvarSyntax, initializeVariableRuntime, type VariableObject, type VariableSyntax } from "./variable-runtime.js";
import { frontendDefinitionFromExtensions, messageRegexScriptsFromExtensions, type FrontendDefinition, type MessageRegexScript } from "./frontend-runtime.js";

export type CompatibilityDisposition = "完整生效" | "等价替代" | "仅保留" | "已禁用" | "已丢失";
export type Playability = "ready" | "degraded" | "blocked";
export const NORMALIZED_CARD_INDEX_VERSION = 8;
export const SUPPORTED_CRITICAL_TAVERN_HELPER_APIS = new Set(["generate"]);

export type CompatibilityRow = { capability: string; disposition: CompatibilityDisposition; evidence: string };
export type StoredOpening = { id: string; label: string; message: string };
export type CardVariableDefinition = {
  character: VariableObject;
  scripts: Array<{ id: string; variables: VariableObject }>;
  worldbookInitvarEntryIds: string[];
  openingInitvarIds: string[];
  initializationFormats: VariableSyntax[];
  updateFormats: VariableSyntax[];
  unknownFormats: string[];
};
export type TavernHelperScript = { id: string; name: string; source: string };
export type NormalizedCard = {
  normalizedIndexVersion: number;
  revisionId: string;
  sourceName: string;
  sourceFormat: string;
  importedAt: string;
  title: string;
  creator: string;
  creatorNotes: string;
  tags: string[];
  characterVersion: string;
  description: string;
  personality: string;
  scenario: string;
  messageExample: string;
  systemPrompt: string;
  postHistoryInstructions: string;
  openings: StoredOpening[];
  worldbook: WorldbookEntry[];
  variableDefinition: CardVariableDefinition;
  tavernHelperScripts: TavernHelperScript[];
  requiredCriticalTavernHelperApis: string[];
  missingCriticalTavernHelperApis: string[];
  frontendDefinition?: FrontendDefinition;
  messageRegexScripts: MessageRegexScript[];
  unknownFields: string[];
  playability: Playability;
  statusText: string;
  statusDetail: string;
  compatibilityRows: CompatibilityRow[];
  originalBlob: string;
};

type JsonObject = Record<string, unknown>;
const decoder = new TextDecoder("utf-8", { fatal: false });
const ROOT_KNOWN = new Set(["spec", "spec_version", "data"]);
const DATA_KNOWN = new Set(["name", "description", "personality", "scenario", "first_mes", "mes_example", "creator_notes", "system_prompt", "post_history_instructions", "alternate_greetings", "tags", "creator", "character_version", "extensions", "character_book", "group_only_greetings", "nickname", "creator_notes_multilingual", "source", "assets"]);
const ENTRY_KNOWN = new Set(["id", "uid", "comment", "memo", "content", "enabled", "constant", "keys", "key", "secondary_keys", "keysecondary", "selective", "selectiveLogic", "insertion_order", "order", "position", "role", "outletName", "group", "groupOverride", "groupWeight", "sticky", "cooldown", "delay", "use_regex", "probability", "depth", "scan_depth", "extensions"]);
const ENTRY_EXTENSION_KNOWN = new Set(["position", "role", "outlet_name", "depth", "scan_depth", "probability", "use_probability", "useProbability", "use_regex", "case_sensitive", "match_whole_words", "group", "group_override", "group_weight", "sticky", "cooldown", "delay", "prevent_recursion", "exclude_recursion", "delay_until_recursion", "selectiveLogic"]);

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
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

async function pngMetadata(bytes: Uint8Array, inflate: (bytes: Uint8Array) => Uint8Array): Promise<JsonObject> {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (!signature.every((value, index) => bytes[index] === value)) throw new Error("PNG 文件头不完整");
  let offset = 8;
  let charaMetadata: string | undefined;
  let ccv3Metadata: string | undefined;
  let sawEnd = false;
  while (offset + 12 <= bytes.length) {
    const length = readU32(bytes, offset);
    const end = offset + 12 + length;
    if (end > bytes.length) throw new Error("PNG chunk 长度越界");
    const typeBytes = bytes.slice(offset + 4, offset + 8);
    const type = String.fromCharCode(...typeBytes);
    const data = bytes.slice(offset + 8, offset + 8 + length);
    const crcInput = new Uint8Array(4 + data.length);
    crcInput.set(typeBytes);
    crcInput.set(data, 4);
    if (crc32(crcInput) !== readU32(bytes, offset + 8 + length)) throw new Error(`${type} chunk 校验失败`);
    let keyword = "";
    let value = "";
    if (type === "tEXt") {
      const zero = data.indexOf(0);
      if (zero >= 0) { keyword = decoder.decode(data.slice(0, zero)); value = decoder.decode(data.slice(zero + 1)); }
    } else if (type === "zTXt") {
      const zero = data.indexOf(0);
      if (zero >= 0 && data[zero + 1] === 0) { keyword = decoder.decode(data.slice(0, zero)); value = decoder.decode(inflate(data.slice(zero + 2))); }
    } else if (type === "iTXt") {
      const keywordEnd = data.indexOf(0);
      if (keywordEnd >= 0 && keywordEnd + 3 <= data.length) {
        keyword = decoder.decode(data.slice(0, keywordEnd));
        const compressed = data[keywordEnd + 1] === 1;
        let cursor = keywordEnd + 3;
        const languageEnd = data.indexOf(0, cursor);
        cursor = languageEnd + 1;
        const translatedEnd = data.indexOf(0, cursor);
        if (languageEnd < 0 || translatedEnd < 0) throw new Error("iTXt 元数据不完整");
        const payload = data.slice(translatedEnd + 1);
        value = decoder.decode(compressed ? inflate(payload) : payload);
      }
    }
    if (keyword === "ccv3") ccv3Metadata = value;
    if (keyword === "chara") charaMetadata = value;
    offset = end;
    if (type === "IEND") { sawEnd = true; break; }
  }
  if (!sawEnd) throw new Error("PNG 缺少 IEND 结束标记");
  const metadata = ccv3Metadata ?? charaMetadata;
  if (metadata === undefined) throw new Error("PNG 没有 chara/ccv3 角色卡元数据");
  let parsed: unknown;
  try {
    const compact = metadata.replace(/\s+/gu, "");
    const binary = atob(compact + "=".repeat((4 - compact.length % 4) % 4));
    parsed = JSON.parse(decoder.decode(Uint8Array.from(binary, (character) => character.charCodeAt(0))));
  } catch {
    parsed = JSON.parse(metadata);
  }
  if (!isObject(parsed)) throw new Error("角色卡元数据不是对象");
  return parsed;
}

export async function sha256(bytes: Uint8Array): Promise<string> {
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", buffer));
  return Array.from(digest, (value) => value.toString(16).padStart(2, "0")).join("");
}

function extensionCapabilities(data: JsonObject, frontendDefinition: FrontendDefinition | undefined, messageRegexScripts: readonly MessageRegexScript[], tavernHelperScripts: readonly TavernHelperScript[]): CompatibilityRow[] {
  const extensions = isObject(data.extensions) ? data.extensions : {};
  const rows: CompatibilityRow[] = [];
  const meaningful = (value: unknown): boolean => {
    if (value === null || value === undefined || value === false || value === "") return false;
    if (Array.isArray(value)) return value.some(meaningful);
    if (isObject(value)) return Object.values(value).some(meaningful);
    return true;
  };
  for (const [key, value] of Object.entries(extensions)) {
    if (!meaningful(value)) continue;
    if (key === "regex_scripts" || key === "regex") rows.push(messageRegexScripts.length === 0
      ? { capability: "正则脚本", disposition: "仅保留", evidence: "原件与字段完整保存；没有可安全执行的消息展示 Regex" }
      : { capability: "正则脚本", disposition: "等价替代", evidence: `${messageRegexScripts.length} 条 assistant 消息展示 Regex 在只读投影中执行；正式 Session 消息保持原文` });
    else if (key === "tavern_helper") rows.push(tavernHelperScripts.length > 0
      ? { capability: "TavernHelper 外部脚本", disposition: "等价替代", evidence: `${tavernHelperScripts.length} 个启用脚本在当前卡片 Session 的隔离 companion iframe 中运行；宿主交互经 DSH Bridge 提交` }
      : frontendDefinition === undefined
      ? { capability: "TavernHelper 外部脚本", disposition: "仅保留", evidence: "角色脚本原件完整保存；没有可运行的启用 script 内容" }
      : { capability: "TavernHelper 前端适配", disposition: "等价替代", evidence: `不执行原版宿主脚本；${frontendDefinition.caseId} 通过 DSH 窄 Bridge、Host 正式提交和可重建投影运行` });
    else if (["mvu_bundle_required", "synthetic_test_asset", "suite_id", "suite_case_id", "card_id", "runtime_class", "required_capabilities", "frontend_assets", "frontend_entry"].includes(key)) continue;
    else rows.push({ capability: `扩展字段 data.extensions.${key}`, disposition: "仅保留", evidence: "原件完整保存；该扩展不参与纯文字世界书运行时" });
  }
  return rows;
}

function tavernHelperScripts(data: JsonObject): TavernHelperScript[] {
  const extensions = isObject(data.extensions) ? data.extensions : {};
  const helper = isObject(extensions.tavern_helper) ? extensions.tavern_helper : {};
  const scripts = Array.isArray(helper.scripts) ? helper.scripts : [];
  return scripts.flatMap((value, index): TavernHelperScript[] => {
    if (!isObject(value) || value.enabled === false) return [];
    const source = text(value.content);
    if (source.trim().length === 0 || (text(value.type).length > 0 && text(value.type) !== "script")) return [];
    return [{ id: text(value.id) || `script-${index}`, name: text(value.name) || `脚本 ${index + 1}`, source }];
  });
}

export function requiredCriticalTavernHelperApis(value: unknown): string[] {
  let serialized = "";
  try { serialized = typeof value === "string" ? value : JSON.stringify(value); } catch { return []; }
  return /\bTavernHelper\s*\.\s*generate\s*\(/u.test(serialized) ? ["TavernHelper.generate"] : [];
}

export function missingCriticalTavernHelperApis(required: readonly string[], supported: ReadonlySet<string> = SUPPORTED_CRITICAL_TAVERN_HELPER_APIS): string[] {
  return required.filter((api) => !supported.has(api.replace(/^TavernHelper\./u, "")));
}

function variableObject(value: unknown): VariableObject {
  if (!isObject(value)) return {};
  try {
    const clone = JSON.parse(JSON.stringify(value)) as unknown;
    return isObject(clone) ? clone as VariableObject : {};
  } catch { return {}; }
}

function variableDefinition(data: JsonObject, openings: StoredOpening[], worldbook: WorldbookEntry[]): CardVariableDefinition {
  const extensions = isObject(data.extensions) ? data.extensions : {};
  const tavernHelper = isObject(extensions.tavern_helper) ? extensions.tavern_helper : {};
  const scripts = Array.isArray(tavernHelper.scripts) ? tavernHelper.scripts.flatMap((value, index) => {
    if (!isObject(value) || value.enabled === false) return [];
    const variables = variableObject(value.data);
    return [{ id: text(value.id) || text(value.name) || `script-${index}`, variables }];
  }) : [];
  // MVU intentionally stores [initvar] records as disabled lorebook entries:
  // they are runtime state seeds, not prompt content. Their disabled flag must
  // keep them out of World Info activation without hiding them from MVU init.
  const worldbookSources = worldbook.filter((entry) => /\[initvar\]/iu.test(entry.comment));
  const openingSources = openings.filter((opening) => /<initvar\b/iu.test(opening.message));
  const initSources = [
    ...worldbookSources.map((entry) => ({ id: `worldbook:${entry.id}`, content: entry.content, location: "worldbook" as const })),
    ...openingSources.map((opening) => ({ id: `opening:${opening.id}`, content: opening.message, location: "opening" as const })),
  ];
  const initializationFormats = initSources.map((source) => classifyInitvarSyntax(source.content));
  const serialized = JSON.stringify(data);
  const updateFormats: VariableSyntax[] = [];
  if (/_\.(?:set|add|insert|assign|remove|delete|unset|move|replace|delta)\s*\(/iu.test(serialized)) updateFormats.push("legacy");
  if (/<JSONPatch\b|"op"\s*:\s*"(?:replace|delta|insert|add|remove|move)"/iu.test(serialized)) updateFormats.push("json-patch");
  const unknownFormats = [
    ...initSources.flatMap((source, index) => initializeVariableRuntime({}, [source]).status === "failed" ? [`initvar:${index}:${initializationFormats[index]}`] : []),
    ...(/<UpdateVariable\b/iu.test(serialized) && updateFormats.length === 0 ? ["update:unknown"] : []),
  ];
  return {
    character: variableObject(tavernHelper.variables),
    scripts,
    worldbookInitvarEntryIds: worldbookSources.map((entry) => entry.id),
    openingInitvarIds: openingSources.map((opening) => opening.id),
    initializationFormats: [...new Set(initializationFormats)],
    updateFormats,
    unknownFormats,
  };
}

export async function parseCard(bytes: Uint8Array, sourceName: string, inflate: (bytes: Uint8Array) => Uint8Array): Promise<NormalizedCard> {
  const revisionId = await sha256(bytes);
  const lower = sourceName.toLocaleLowerCase();
  const root = lower.endsWith(".png") ? await pngMetadata(bytes, inflate) : JSON.parse(decoder.decode(bytes)) as unknown;
  if (!isObject(root)) throw new Error("JSON 顶层不是对象");
  const data = isObject(root.data) ? root.data : root;
  const spec = text(root.spec) || "chara_card_v2";
  if (spec !== "chara_card_v2" && spec !== "chara_card_v3") throw new Error("只接受 Tavern V2/V3 角色卡");
  const first = text(data.first_mes);
  const alternates = Array.isArray(data.alternate_greetings) ? data.alternate_greetings.filter((item): item is string => typeof item === "string") : [];
  const rawOpenings = [...(typeof data.first_mes === "string" ? [first] : []), ...alternates];
  const openings = rawOpenings.map((message, index) => ({ id: `opening-${index}`, label: index === 0 ? "卡片开场" : message.trim().length === 0 ? `备选开场 ${index}（空白）` : `备选开场 ${index}`, message }));
  const book = isObject(data.character_book) ? data.character_book : undefined;
  const rawEntries = book !== undefined && Array.isArray(book.entries) ? book.entries : [];
  const worldbook = rawEntries.map(normalizeWorldbookEntry);
  const variables = variableDefinition(data, openings, worldbook);
  const helperScripts = tavernHelperScripts(data);
  const requiredHelperApis = requiredCriticalTavernHelperApis(data);
  const missingHelperApis = missingCriticalTavernHelperApis(requiredHelperApis);
  const frontendDefinition = frontendDefinitionFromExtensions(isObject(data.extensions) ? data.extensions : undefined);
  const messageRegexScripts = messageRegexScriptsFromExtensions(isObject(data.extensions) ? data.extensions : undefined);
  const unsupportedWorldbookFields = new Set<string>();
  for (const rawEntry of rawEntries) {
    if (!isObject(rawEntry)) continue;
    for (const key of Object.keys(rawEntry)) if (!ENTRY_KNOWN.has(key)) unsupportedWorldbookFields.add(`entry.${key}`);
    if (isObject(rawEntry.extensions)) for (const key of Object.keys(rawEntry.extensions)) if (!ENTRY_EXTENSION_KNOWN.has(key)) unsupportedWorldbookFields.add(`entry.extensions.${key}`);
  }
  const unknownFields = [
    ...(data === root ? [] : Object.keys(root).filter((key) => !ROOT_KNOWN.has(key)).map((key) => `root.${key}`)),
    ...Object.keys(data).filter((key) => !DATA_KNOWN.has(key)).map((key) => `data.${key}`),
  ];
  const compatibilityRows: CompatibilityRow[] = [
    { capability: "卡片结构", disposition: "完整生效", evidence: `${spec} 已解析为不可变 revision ${revisionId.slice(0, 12)}` },
    { capability: "原始文件", disposition: "完整生效", evidence: `${bytes.byteLength.toLocaleString()} bytes 按 SHA-256 原样保存` },
    { capability: "角色开场", disposition: openings.length > 0 ? "完整生效" : "已丢失", evidence: openings.length > 0 ? `${openings.length} 个开场按原序可选择（含原件中的空白项），选择结果绑定到 DSH 会话` : "没有 first_mes 或 alternate_greetings" },
    { capability: "提示词与预设装配", disposition: "等价替代", evidence: "system_prompt、角色定义、场景、示例对话、聊天历史与 post_history_instructions 按内置 SillyTavern Chat Completion 兼容预设在每次请求前重新装配；暂不导入任意外部预设文件" },
    { capability: "世界书", disposition: "等价替代", evidence: `${worldbook.length} 条已建立可持久化索引；执行常驻、主次关键词、Regex、递归、互斥组、概率、时间效果、Order 与八种文本位置；向量检索、角色过滤与自动化脚本仍仅保留` },
    ...extensionCapabilities(data, frontendDefinition, messageRegexScripts, helperScripts),
  ];
  for (const api of requiredHelperApis) compatibilityRows.push(missingHelperApis.includes(api)
    ? { capability: api, disposition: "已丢失", evidence: `卡内脚本把 ${api} 作为关键启动依赖，但当前 Host 没有声明该接口` }
    : { capability: api, disposition: "等价替代", evidence: "由 DSH Host 使用当前 Session 绑定的 provider、model、preset 与上下文生成辅助文本；结果不自动写入正式 Conversation" });
  if (frontendDefinition !== undefined) {
    compatibilityRows.push({
      capability: "卡内前端",
      disposition: "等价替代",
      evidence: `${frontendDefinition.runtimeClass} 使用 DSH ${frontendDefinition.container} 容器；只开放 ${frontendDefinition.requiredCapabilities.join("、") || "只读展示"} 对应的冻结能力`,
    });
  }
  if (variables.worldbookInitvarEntryIds.length > 0 || variables.openingInitvarIds.length > 0 || variables.updateFormats.length > 0) {
    compatibilityRows.push({
      capability: "MVU / TavernHelper 变量",
      disposition: variables.unknownFormats.length === 0 ? "等价替代" : "仅保留",
      evidence: variables.unknownFormats.length === 0
        ? `内置原子运行时识别 ${variables.initializationFormats.join(" / ") || "无 initvar"} 初始化与 ${variables.updateFormats.join(" / ") || "无卡内更新样例"} 更新；不执行外部脚本私有实现`
        : `可识别部分已进入内置运行时；未知格式明确降级：${variables.unknownFormats.join("、")}`,
    });
  }
  if (/<%|%>/u.test(JSON.stringify(data))) compatibilityRows.push({
    capability: "EJS Prompt Template",
    disposition: "等价替代",
    evidence: "请求前在隔离 QuickJS Worker 中执行；顶层角色字段失败会阻止请求，可选世界书条目失败会在递归、互斥组和时间效果提交前省略；getvar 运行时缺失路径进入逐条诊断并保留模板自身 fallback；不执行任意宿主脚本",
  });
  if (worldbook.some((entry) => entry.position === "at_depth")) compatibilityRows.push({ capability: "世界书 @ Depth", disposition: "等价替代", evidence: "编译器保留目标 Depth 与 System/User/Assistant Role，轨迹展示概念排布；实际 DSH 请求使用单一可替换上下文信封，不重写不可变的既有聊天消息" });
  if (worldbook.some((entry) => entry.probability < 100)) compatibilityRows.push({ capability: "世界书概率", disposition: "等价替代", evidence: "使用 sessionId 与 entryId 的稳定采样，重启后同一会话保持相同结果" });
  const invalidRegexEntries = worldbook.filter((entry) => entry.useRegex && entry.keys.some((key) => { try { new RegExp(key, entry.caseSensitive ? "u" : "iu"); return false; } catch { return true; } }));
  if (invalidRegexEntries.length > 0) compatibilityRows.push({ capability: "世界书无效正则键", disposition: "已禁用", evidence: `${invalidRegexEntries.length} 个条目的正则键无法编译，条目原文仍保留；entry id：${invalidRegexEntries.slice(0, 12).map((entry) => entry.id).join("、")}` });
  if (unsupportedWorldbookFields.size > 0) compatibilityRows.push({ capability: "世界书未执行字段", disposition: "仅保留", evidence: `原件完整保存；纯文字运行时不解释：${Array.from(unsupportedWorldbookFields).slice(0, 12).join("、")}${unsupportedWorldbookFields.size > 12 ? "…" : ""}` });
  if (Array.isArray(data.group_only_greetings) && data.group_only_greetings.length > 0) compatibilityRows.push({ capability: "群组专用开场", disposition: "仅保留", evidence: `${data.group_only_greetings.length} 个 group_only_greetings 保留在原件；#107 只建立单角色会话` });
  const unsupportedMacros = new Set<string>();
  for (const match of JSON.stringify(data).matchAll(/\{\{\s*([a-z_][a-z0-9_-]*)(?::[^{}]*)?\s*\}\}/giu)) {
    const name = match[1].toLocaleLowerCase();
    if (!["user", "char", "get_message_variable", "format_message_variable", "getvar", "setvar", "random", "roll"].includes(name)) unsupportedMacros.add(name);
  }
  const hasRuntimeMacros = /\{\{\s*(?:get_message_variable|format_message_variable|getvar|setvar|random|roll)\b/iu.test(JSON.stringify(data));
  if (hasRuntimeMacros) compatibilityRows.push({ capability: "Tavern 运行时宏", disposition: "等价替代", evidence: "执行消息变量读取/格式化、局部 setvar/getvar，以及按 Session 稳定的 random/roll；变量状态仍由 DSH Storage Domain 持有" });
  if (unsupportedMacros.size > 0) compatibilityRows.push({ capability: "Tavern 未建模宏", disposition: "仅保留", evidence: `原件保留且不静默执行：${Array.from(unsupportedMacros).slice(0, 12).join("、")}${unsupportedMacros.size > 12 ? "…" : ""}` });
  if (unknownFields.length > 0) compatibilityRows.push({ capability: "未知字段", disposition: "仅保留", evidence: `${unknownFields.length} 个未建模字段留在原件中：${unknownFields.slice(0, 8).join("、")}${unknownFields.length > 8 ? "…" : ""}` });
  const degraded = compatibilityRows.some((row) => row.disposition === "仅保留" || row.disposition === "等价替代" || row.disposition === "已禁用");
  const playability: Playability = openings.length === 0 || missingHelperApis.length > 0 ? "blocked" : degraded ? "degraded" : "ready";
  return {
    normalizedIndexVersion: NORMALIZED_CARD_INDEX_VERSION,
    revisionId,
    sourceName,
    sourceFormat: spec,
    importedAt: new Date().toISOString(),
    title: text(data.name).trim() || sourceName.replace(/\.[^.]+$/u, ""),
    creator: text(data.creator).trim(),
    creatorNotes: text(data.creator_notes),
    tags: Array.isArray(data.tags) ? data.tags.filter((value): value is string => typeof value === "string") : [],
    characterVersion: text(data.character_version).trim(),
    description: text(data.description),
    personality: text(data.personality),
    scenario: text(data.scenario),
    messageExample: text(data.mes_example),
    systemPrompt: text(data.system_prompt),
    postHistoryInstructions: text(data.post_history_instructions),
    openings,
    worldbook,
    variableDefinition: variables,
    tavernHelperScripts: helperScripts,
    requiredCriticalTavernHelperApis: requiredHelperApis,
    missingCriticalTavernHelperApis: missingHelperApis,
    messageRegexScripts,
    ...(frontendDefinition === undefined ? {} : { frontendDefinition }),
    unknownFields,
    playability,
    statusText: playability === "ready" ? "可开始" : playability === "degraded" ? "可开始，非必需扩展仅保留" : "暂时不能开始",
    statusDetail: openings.length === 0
      ? "卡片没有可用开场，不能建立首条 assistant 消息。"
      : missingHelperApis.length > 0
        ? `卡内启动路径缺少关键接口：${missingHelperApis.join("、")}。补齐前不能开始 Session。`
        : `${openings.length} 个开场、${worldbook.length} 条世界书已进入 Host 运行时；未执行的扩展逐项列在兼容报告中。`,
    compatibilityRows,
    originalBlob: `blobs/${revisionId}`,
  };
}

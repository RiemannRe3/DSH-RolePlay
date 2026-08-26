export type VariablePrimitive = string | number | boolean | null;
export type VariableValue = VariablePrimitive | VariableValue[] | { [key: string]: VariableValue };
export type VariableObject = { [key: string]: VariableValue };

export type VariableScopes = {
  global?: VariableObject;
  character?: VariableObject;
  script?: VariableObject;
  chat?: VariableObject;
  messageSelectedVariant?: VariableObject;
};

export type VariableSource = {
  id: string;
  content: string;
  location: "worldbook" | "opening";
};

export type VariableSyntax = "json" | "yaml" | "xml" | "legacy" | "json-patch" | "unknown";
export type VariableDiagnosticCode =
  | "UNKNOWN_FORMAT"
  | "INVALID_INITVAR"
  | "INVALID_COMMAND"
  | "INVALID_JSON_PATCH"
  | "UNSUPPORTED_OPERATION"
  | "INVALID_PATH"
  | "PATH_NOT_FOUND"
  | "TYPE_MISMATCH"
  | "INVALID_ARGUMENT";

export type VariableDiagnostic = {
  code: VariableDiagnosticCode;
  message: string;
  sourceId?: string;
  operation?: string;
  path?: string;
};

export type VariableRuntimeEvent = {
  type:
    | "VARIABLE_INITIALIZATION_STARTED"
    | "VARIABLE_INITIALIZED"
    | "VARIABLE_INITIALIZATION_FAILED"
    | "VARIABLE_UPDATE_STARTED"
    | "COMMAND_PARSED"
    | "VARIABLE_UPDATE_ENDED"
    | "VARIABLE_UPDATE_FAILED";
  sourceId?: string;
  syntax?: VariableSyntax;
  operation?: string;
  path?: string;
  diagnostic?: VariableDiagnostic;
};

export type VariableInitializationResult = {
  status: "initialized" | "failed";
  state: VariableObject;
  events: VariableRuntimeEvent[];
  diagnostics: VariableDiagnostic[];
};

export type VariableUpdateResult = {
  status: "committed" | "ignored" | "failed";
  state: VariableObject;
  events: VariableRuntimeEvent[];
  diagnostics: VariableDiagnostic[];
  operationCount: number;
};

export class CommittedReplyVariableGate {
  readonly #pending = new Map<string, string>();

  capture(sessionId: string, body: string): void {
    this.#pending.set(sessionId, body);
  }

  async commit(sessionId: string, apply: (body: string) => Promise<void>): Promise<boolean> {
    const body = this.#pending.get(sessionId);
    if (body === undefined) return false;
    await apply(body);
    this.#pending.delete(sessionId);
    return true;
  }

  discard(sessionId: string): void {
    this.#pending.delete(sessionId);
  }
}

type PathSegment = string | number;
type ParsedOperation = {
  operation: string;
  path?: string;
  from?: string;
  value?: VariableValue;
  index?: number;
};

class VariableRuntimeError extends Error {
  constructor(
    readonly code: VariableDiagnosticCode,
    message: string,
    readonly operation?: string,
    readonly path?: string,
  ) {
    super(message);
  }
}

function isObject(value: unknown): value is VariableObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isVariableValue(value: unknown): value is VariableValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isVariableValue);
  if (!isObject(value)) return false;
  return Object.entries(value).every(([key, child]) => !forbiddenSegment(key) && isVariableValue(child));
}

function cloneValue<T extends VariableValue>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => cloneValue(item)) as T;
  if (isObject(value)) return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, cloneValue(child)])) as T;
  return value;
}

function mergeObject(target: VariableObject, source: VariableObject): VariableObject {
  const result = cloneValue(target);
  for (const [key, value] of Object.entries(source)) {
    if (forbiddenSegment(key)) throw new VariableRuntimeError("INVALID_PATH", `变量对象包含不安全的键：${key}`);
    const current = result[key];
    result[key] = isObject(current) && isObject(value) ? mergeObject(current, value) : cloneValue(value);
  }
  return result;
}

export function mergeVariableScopes(scopes: VariableScopes): VariableObject {
  return [scopes.global, scopes.character, scopes.script, scopes.chat, scopes.messageSelectedVariant]
    .reduce<VariableObject>((state, scope) => scope === undefined ? state : mergeObject(state, scope), {});
}

function stripFence(value: string): string {
  const trimmed = value.trim();
  const match = /^```(?:json|yaml|yml|xml)?\s*\n([\s\S]*?)\n```$/iu.exec(trimmed);
  return match?.[1].trim() ?? trimmed;
}

function initvarPayloads(content: string): string[] {
  const matches = Array.from(content.matchAll(/<initvar\b[^>]*>([\s\S]*?)<\/initvar>/giu), (match) => match[1]);
  return matches.length > 0 ? matches : [content];
}

export function classifyInitvarSyntax(content: string): VariableSyntax {
  const payload = stripFence(initvarPayloads(content)[0] ?? "");
  if (/^[{[]/u.test(payload)) return "json";
  if (/^<[/a-z_][\s\S]*>$/iu.test(payload)) return "xml";
  if (/^[^\n:#]+:\s*.+(?:\n|$)/u.test(payload)) return "yaml";
  return "unknown";
}

function parseJsonObject(payload: string): VariableObject {
  let value: unknown;
  try { value = JSON.parse(withoutTrailingJsonCommas(payload)); }
  catch { throw new VariableRuntimeError("INVALID_INITVAR", "initvar JSON 无法解析"); }
  if (!isObject(value) || !isVariableValue(value)) throw new VariableRuntimeError("INVALID_INITVAR", "initvar 必须是安全的 JSON 对象");
  return cloneValue(value);
}

function withoutTrailingJsonCommas(payload: string): string {
  let result = "";
  let quote = "";
  let escaped = false;
  for (let index = 0; index < payload.length; index += 1) {
    const character = payload[index];
    if (quote.length > 0) {
      result += character;
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = "";
      continue;
    }
    if (character === '"') { quote = character; result += character; continue; }
    if (character !== ",") { result += character; continue; }
    let cursor = index + 1;
    while (cursor < payload.length && /\s/u.test(payload[cursor])) cursor += 1;
    if (payload[cursor] !== "}" && payload[cursor] !== "]") result += character;
  }
  return result;
}

function scalarFromYaml(value: string): VariableValue {
  const trimmed = value.trim();
  if (trimmed === "null" || trimmed === "~") return null;
  if (/^(?:true|false)$/iu.test(trimmed)) return trimmed.toLocaleLowerCase() === "true";
  if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/u.test(trimmed)) return Number(trimmed);
  if (/^["']/.test(trimmed)) return parseLiteral(trimmed);
  if (/^[{[]/u.test(trimmed)) return parseLiteral(trimmed);
  return trimmed;
}

function parseSimpleYamlObject(payload: string): VariableObject {
  const root: VariableObject = {};
  const lines = payload.split(/\r?\n/u).flatMap((rawLine) => {
    if (rawLine.trim().length === 0 || rawLine.trimStart().startsWith("#")) return [];
    return [{ indent: rawLine.length - rawLine.trimStart().length, text: rawLine.trim() }];
  });
  const stack: Array<{ indent: number; value: VariableObject | VariableValue[] }> = [{ indent: -1, value: root }];
  for (const [lineIndex, line] of lines.entries()) {
    const { indent } = line;
    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
    const parent = stack[stack.length - 1].value;
    if (line.text.startsWith("- ")) {
      if (!Array.isArray(parent)) throw new VariableRuntimeError("INVALID_INITVAR", "initvar YAML 列表缺少父级键");
      parent.push(scalarFromYaml(line.text.slice(2)));
      continue;
    }
    if (Array.isArray(parent)) throw new VariableRuntimeError("INVALID_INITVAR", "initvar YAML 暂不支持对象列表项");
    const match = /^([^:#][^:]*):(?:\s*(.*))?$/u.exec(line.text);
    if (match === null) throw new VariableRuntimeError("INVALID_INITVAR", "initvar YAML 只支持确定性的对象映射");
    const key = match[1].trim();
    if (key.length === 0 || forbiddenSegment(key)) throw new VariableRuntimeError("INVALID_INITVAR", "initvar YAML 包含不安全的键");
    const rawValue = match[2] ?? "";
    if (rawValue.length === 0) {
      const next = lines[lineIndex + 1];
      const child: VariableObject | VariableValue[] = next !== undefined && next.indent > indent && next.text.startsWith("- ") ? [] : {};
      parent[key] = child;
      stack.push({ indent, value: child });
    } else parent[key] = scalarFromYaml(rawValue);
  }
  return root;
}

function parseInitvarObject(content: string): { value: VariableObject; syntax: VariableSyntax } {
  let combined: VariableObject = {};
  let syntax: VariableSyntax = "unknown";
  for (const rawPayload of initvarPayloads(content)) {
    const payload = stripFence(rawPayload);
    const current = classifyInitvarSyntax(payload);
    if (current === "json") combined = mergeObject(combined, parseJsonObject(payload));
    else if (current === "yaml") combined = mergeObject(combined, parseSimpleYamlObject(payload));
    else throw new VariableRuntimeError("INVALID_INITVAR", `暂不支持 ${current === "xml" ? "XML" : "未知"} initvar 格式`);
    syntax = current;
  }
  return { value: combined, syntax };
}

export function initializeVariableRuntime(scopes: VariableScopes, sources: readonly VariableSource[]): VariableInitializationResult {
  const before = mergeVariableScopes(scopes);
  let next = cloneValue(before);
  const events: VariableRuntimeEvent[] = [{ type: "VARIABLE_INITIALIZATION_STARTED" }];
  const diagnostics: VariableDiagnostic[] = [];
  try {
    for (const source of sources) {
      const parsed = parseInitvarObject(source.content);
      next = mergeObject(next, parsed.value);
      events.push({ type: "COMMAND_PARSED", sourceId: source.id, syntax: parsed.syntax, operation: "merge-initvar" });
    }
    events.push({ type: "VARIABLE_INITIALIZED" });
    return { status: "initialized", state: next, events, diagnostics };
  } catch (error) {
    const diagnostic = toDiagnostic(error);
    diagnostics.push(diagnostic);
    events.push({ type: "VARIABLE_INITIALIZATION_FAILED", diagnostic });
    return { status: "failed", state: before, events, diagnostics };
  }
}

function forbiddenSegment(value: string): boolean {
  return value === "__proto__" || value === "prototype" || value === "constructor";
}

function validateSegments(segments: readonly PathSegment[], path: string): PathSegment[] {
  if (segments.length === 0 || segments.some((segment) => typeof segment === "string" && (segment.length === 0 || forbiddenSegment(segment)))) {
    throw new VariableRuntimeError("INVALID_PATH", `变量路径不安全：${path}`, undefined, path);
  }
  return [...segments];
}

function legacyPath(path: string): PathSegment[] {
  const segments: PathSegment[] = [];
  const normalized = path.replace(/\[(\d+)\]/gu, ".$1");
  for (const item of normalized.split(".")) segments.push(/^\d+$/u.test(item) ? Number(item) : item);
  return validateSegments(segments, path);
}

function pointerPath(path: string): PathSegment[] {
  if (!path.startsWith("/")) throw new VariableRuntimeError("INVALID_PATH", `JSON Pointer 必须以 / 开头：${path}`, undefined, path);
  return validateSegments(path.slice(1).split("/").map((item) => item.replace(/~1/gu, "/").replace(/~0/gu, "~")).map((item) => /^\d+$/u.test(item) ? Number(item) : item), path);
}

function parentAt(root: VariableObject, segments: readonly PathSegment[], path: string, create: boolean): { parent: VariableObject | VariableValue[]; key: PathSegment } {
  let cursor: VariableObject | VariableValue[] = root;
  for (const [index, segment] of segments.slice(0, -1).entries()) {
    const child = cursor[segment as never] as VariableValue | undefined;
    if (child === undefined && create) {
      const created: VariableObject | VariableValue[] = typeof segments[index + 1] === "number" ? [] : {};
      cursor[segment as never] = created as never;
      cursor = created;
      continue;
    }
    if (!isObject(child) && !Array.isArray(child)) throw new VariableRuntimeError(child === undefined ? "PATH_NOT_FOUND" : "TYPE_MISMATCH", `变量路径不存在或不是容器：${path}`, undefined, path);
    cursor = child;
  }
  return { parent: cursor, key: segments[segments.length - 1] };
}

function valueAt(root: VariableObject, segments: readonly PathSegment[], path: string): VariableValue {
  let cursor: VariableValue = root;
  for (const segment of segments) {
    if ((!isObject(cursor) && !Array.isArray(cursor)) || !(segment in cursor)) throw new VariableRuntimeError("PATH_NOT_FOUND", `变量路径不存在：${path}`, undefined, path);
    cursor = cursor[segment as never] as VariableValue;
  }
  return cursor;
}

function hasAt(root: VariableObject, segments: readonly PathSegment[]): boolean {
  try { valueAt(root, segments, segments.join(".")); return true; } catch { return false; }
}

function setAt(root: VariableObject, segments: readonly PathSegment[], path: string, value: VariableValue, create: boolean): void {
  const { parent, key } = parentAt(root, segments, path, create);
  if (!create && !(key in parent)) throw new VariableRuntimeError("PATH_NOT_FOUND", `变量路径不存在：${path}`, undefined, path);
  if (Array.isArray(parent) && typeof key !== "number") throw new VariableRuntimeError("TYPE_MISMATCH", `数组路径必须使用数字下标：${path}`, undefined, path);
  parent[key as never] = cloneValue(value) as never;
}

function replaceLeafAt(root: VariableObject, segments: readonly PathSegment[], path: string, value: VariableValue): void {
  const { parent, key } = parentAt(root, segments, path, false);
  if (Array.isArray(parent)) {
    if (typeof key !== "number") throw new VariableRuntimeError("TYPE_MISMATCH", `数组路径必须使用数字下标：${path}`, undefined, path);
    if (!(key in parent)) throw new VariableRuntimeError("PATH_NOT_FOUND", `变量路径不存在：${path}`, undefined, path);
  } else if (typeof key !== "string") throw new VariableRuntimeError("TYPE_MISMATCH", `对象路径不能使用数字键：${path}`, undefined, path);
  parent[key as never] = cloneValue(value) as never;
}

function deleteAt(root: VariableObject, segments: readonly PathSegment[], path: string): void {
  const { parent, key } = parentAt(root, segments, path, false);
  if (!(key in parent)) throw new VariableRuntimeError("PATH_NOT_FOUND", `变量路径不存在：${path}`, undefined, path);
  if (Array.isArray(parent)) {
    if (typeof key !== "number") throw new VariableRuntimeError("TYPE_MISMATCH", `数组路径必须使用数字下标：${path}`, undefined, path);
    parent.splice(key, 1);
  } else delete parent[key as string];
}

function parseQuotedString(value: string): string {
  const quote = value[0];
  if ((quote !== "'" && quote !== '"') || value.at(-1) !== quote) throw new VariableRuntimeError("INVALID_ARGUMENT", "字符串参数缺少配对引号");
  if (quote === '"') {
    try { return JSON.parse(value) as string; } catch { throw new VariableRuntimeError("INVALID_ARGUMENT", "字符串参数无法解析"); }
  }
  let result = "";
  for (let index = 1; index < value.length - 1; index += 1) {
    const character = value[index];
    if (character !== "\\") { result += character; continue; }
    index += 1;
    const escaped = value[index];
    if (escaped === "n") result += "\n";
    else if (escaped === "r") result += "\r";
    else if (escaped === "t") result += "\t";
    else if (escaped === "\\" || escaped === "'") result += escaped;
    else throw new VariableRuntimeError("INVALID_ARGUMENT", `不支持的字符串转义：\\${escaped}`);
  }
  return result;
}

function parseLiteral(value: string): VariableValue {
  const trimmed = value.trim();
  let parsed: unknown;
  if (trimmed.startsWith("'") || trimmed.startsWith('"')) parsed = parseQuotedString(trimmed);
  else {
    try { parsed = JSON.parse(trimmed); }
    catch { throw new VariableRuntimeError("INVALID_ARGUMENT", `命令参数不是安全的 JSON 字面量：${trimmed.slice(0, 48)}`); }
  }
  if (!isVariableValue(parsed)) throw new VariableRuntimeError("INVALID_ARGUMENT", "命令参数不是安全的变量值");
  return cloneValue(parsed);
}

function splitArguments(value: string): string[] {
  const parts: string[] = [];
  let start = 0;
  let quote = "";
  let escaped = false;
  let depth = 0;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (quote.length > 0) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = "";
      continue;
    }
    if (character === "'" || character === '"') quote = character;
    else if (character === "{" || character === "[") depth += 1;
    else if (character === "}" || character === "]") depth -= 1;
    else if (character === "," && depth === 0) { parts.push(value.slice(start, index).trim()); start = index + 1; }
  }
  if (quote.length > 0 || depth !== 0) throw new VariableRuntimeError("INVALID_COMMAND", "命令参数括号或引号不完整");
  const last = value.slice(start).trim();
  if (last.length > 0) parts.push(last);
  return parts;
}

function scanLegacyCommands(payload: string): ParsedOperation[] {
  const operations: ParsedOperation[] = [];
  const consumed: Array<{ start: number; end: number }> = [];
  const head = /_\.(set|add|insert|assign|remove|delete|unset|move|replace|delta)\s*\(/giu;
  let match: RegExpExecArray | null;
  while ((match = head.exec(payload)) !== null) {
    const open = head.lastIndex - 1;
    let quote = "";
    let escaped = false;
    let depth = 1;
    let close = -1;
    for (let index = open + 1; index < payload.length; index += 1) {
      const character = payload[index];
      if (quote.length > 0) {
        if (escaped) escaped = false;
        else if (character === "\\") escaped = true;
        else if (character === quote) quote = "";
      } else if (character === "'" || character === '"') quote = character;
      else if (character === "(") depth += 1;
      else if (character === ")" && --depth === 0) { close = index; break; }
    }
    if (close < 0) throw new VariableRuntimeError("INVALID_COMMAND", "更新命令缺少右括号", match[1]);
    const args = splitArguments(payload.slice(open + 1, close));
    const operation = match[1].toLocaleLowerCase();
    if (operation === "move") {
      if (args.length !== 2) throw new VariableRuntimeError("INVALID_ARGUMENT", "move 需要来源和目标两个路径", operation);
      operations.push({ operation, from: parseQuotedString(args[0]), path: parseQuotedString(args[1]) });
    } else {
      if (args.length < 1 || args.length > 3) throw new VariableRuntimeError("INVALID_ARGUMENT", `${operation} 参数数量不正确`, operation);
      const path = parseQuotedString(args[0]);
      operations.push({ operation, path, ...(args[1] === undefined ? {} : { value: parseLiteral(args[1]) }), ...(args[2] === undefined ? {} : { index: Number(parseLiteral(args[2])) }) });
    }
    consumed.push({ start: match.index, end: close + 1 });
    head.lastIndex = close + 1;
  }
  if (operations.length > 0) {
    let cursor = 0;
    let residue = "";
    for (const range of consumed) { residue += payload.slice(cursor, range.start); cursor = range.end; }
    residue += payload.slice(cursor);
    if (residue.replace(/[\s;]+/gu, "").length > 0) throw new VariableRuntimeError("UNKNOWN_FORMAT", "UpdateVariable 混入了不可识别的命令文本");
  }
  return operations;
}

function jsonPatchOperations(payload: string): ParsedOperation[] {
  let parsed: unknown;
  try { parsed = JSON.parse(payload); }
  catch { throw new VariableRuntimeError("INVALID_JSON_PATCH", "JSON Patch 无法解析"); }
  if (!Array.isArray(parsed) || parsed.length === 0) throw new VariableRuntimeError("INVALID_JSON_PATCH", "JSON Patch 必须是非空数组");
  return parsed.map((item): ParsedOperation => {
    if (!isObject(item) || typeof item.op !== "string" || typeof item.path !== "string") throw new VariableRuntimeError("INVALID_JSON_PATCH", "JSON Patch 项缺少 op 或 path");
    const operation = item.op.toLocaleLowerCase();
    if (!isVariableValue(item.value) && item.value !== undefined) throw new VariableRuntimeError("INVALID_JSON_PATCH", "JSON Patch value 不是安全变量值", operation, item.path);
    return { operation, path: item.path, ...(typeof item.from === "string" ? { from: item.from } : {}), ...(item.value === undefined ? {} : { value: cloneValue(item.value) }) };
  });
}

function parseUpdateOperations(body: string): { operations: ParsedOperation[]; syntax: VariableSyntax } | undefined {
  const blocks = Array.from(body.matchAll(/<UpdateVariable\b[^>]*>([\s\S]*?)<\/UpdateVariable>/giu), (match) => match[1]);
  if (blocks.length === 0) return undefined;
  const operations: ParsedOperation[] = [];
  let syntax: VariableSyntax = "unknown";
  for (const rawBlock of blocks) {
    const patch = /<JSON_?Patch\b[^>]*>([\s\S]*?)<\/JSON_?Patch>/iu.exec(rawBlock);
    if (patch !== null) { operations.push(...jsonPatchOperations(stripFence(patch[1]))); syntax = "json-patch"; continue; }
    const commands = scanLegacyCommands(rawBlock);
    if (commands.length === 0) throw new VariableRuntimeError("UNKNOWN_FORMAT", "UpdateVariable 中没有可识别的 pinned MVU 更新格式");
    operations.push(...commands);
    syntax = syntax === "json-patch" ? syntax : "legacy";
  }
  return { operations, syntax };
}

function operationPath(operation: ParsedOperation): { segments: PathSegment[]; label: string } {
  const path = operation.path ?? "";
  return { segments: path.startsWith("/") ? pointerPath(path) : legacyPath(path), label: path };
}

function requireValue(operation: ParsedOperation): VariableValue {
  if (operation.value === undefined) throw new VariableRuntimeError("INVALID_ARGUMENT", `${operation.operation} 缺少 value`, operation.operation, operation.path);
  return operation.value;
}

function applyOperation(state: VariableObject, operation: ParsedOperation): void {
  const name = operation.operation;
  const { segments, label } = operationPath(operation);
  try {
    if ((name === "add" || name === "insert") && label.startsWith("/")) {
      const value = requireValue(operation);
      const { parent, key } = parentAt(state, segments, label, name === "insert");
      if (Array.isArray(parent)) {
        const index = key === "-" ? parent.length : key;
        if (typeof index !== "number" || index < 0 || index > parent.length) throw new VariableRuntimeError("INVALID_ARGUMENT", `${name} 数组下标越界`, name, label);
        parent.splice(index, 0, cloneValue(value));
      } else {
        if (typeof key !== "string") throw new VariableRuntimeError("TYPE_MISMATCH", `${name} 对象路径不能使用数字键`, name, label);
        parent[key] = cloneValue(value);
      }
    } else if (name === "set") setAt(state, segments, label, requireValue(operation), true);
    else if (name === "replace") replaceLeafAt(state, segments, label, requireValue(operation));
    else if (name === "remove" || name === "delete" || name === "unset") deleteAt(state, segments, label);
    else if (name === "assign") {
      const source = requireValue(operation);
      if (!isObject(source)) throw new VariableRuntimeError("TYPE_MISMATCH", "assign value 必须是对象", name, label);
      const current = valueAt(state, segments, label);
      if (!isObject(current)) throw new VariableRuntimeError("TYPE_MISMATCH", "assign 目标必须是对象", name, label);
      setAt(state, segments, label, { ...current, ...cloneValue(source) }, false);
    } else if (name === "add" || name === "delta") {
      const delta = requireValue(operation);
      const current = hasAt(state, segments) ? valueAt(state, segments, label) : undefined;
      if (current === undefined && name === "add") setAt(state, segments, label, delta, true);
      else if (typeof current === "number" && typeof delta === "number") setAt(state, segments, label, current + delta, false);
      else if (name === "add" && Array.isArray(current)) { current.push(cloneValue(delta)); }
      else throw new VariableRuntimeError("TYPE_MISMATCH", `${name} 需要数字目标${name === "add" ? "或数组目标" : ""}`, name, label);
    } else if (name === "insert") {
      const target = valueAt(state, segments, label);
      if (!Array.isArray(target)) throw new VariableRuntimeError("TYPE_MISMATCH", "insert 目标必须是数组", name, label);
      const index = operation.index ?? target.length;
      if (!Number.isInteger(index) || index < 0 || index > target.length) throw new VariableRuntimeError("INVALID_ARGUMENT", "insert 下标越界", name, label);
      target.splice(index, 0, cloneValue(requireValue(operation)));
    } else if (name === "move") {
      if (operation.from === undefined) throw new VariableRuntimeError("INVALID_ARGUMENT", "move 缺少来源路径", name, label);
      const from = operation.from.startsWith("/") ? pointerPath(operation.from) : legacyPath(operation.from);
      const value = cloneValue(valueAt(state, from, operation.from));
      deleteAt(state, from, operation.from);
      setAt(state, segments, label, value, true);
    } else throw new VariableRuntimeError("UNSUPPORTED_OPERATION", `不支持的更新操作：${name}`, name, label);
  } catch (error) {
    if (error instanceof VariableRuntimeError && error.operation === undefined) throw new VariableRuntimeError(error.code, error.message, name, error.path ?? label);
    throw error;
  }
}

function toDiagnostic(error: unknown): VariableDiagnostic {
  if (error instanceof VariableRuntimeError) return { code: error.code, message: error.message, ...(error.operation === undefined ? {} : { operation: error.operation }), ...(error.path === undefined ? {} : { path: error.path }) };
  return { code: "INVALID_COMMAND", message: error instanceof Error ? error.message : "变量更新失败" };
}

export function applyVariableUpdate(before: VariableObject, body: string): VariableUpdateResult {
  const original = cloneValue(before);
  let parsed: { operations: ParsedOperation[]; syntax: VariableSyntax } | undefined;
  try { parsed = parseUpdateOperations(body); }
  catch (error) {
    const diagnostic = toDiagnostic(error);
    return { status: "failed", state: original, operationCount: 0, diagnostics: [diagnostic], events: [{ type: "VARIABLE_UPDATE_STARTED" }, { type: "VARIABLE_UPDATE_FAILED", diagnostic }] };
  }
  if (parsed === undefined) return { status: "ignored", state: original, operationCount: 0, diagnostics: [], events: [] };
  const events: VariableRuntimeEvent[] = [{ type: "VARIABLE_UPDATE_STARTED", syntax: parsed.syntax }];
  const next = cloneValue(original);
  try {
    for (const operation of parsed.operations) {
      applyOperation(next, operation);
      events.push({ type: "COMMAND_PARSED", syntax: parsed.syntax, operation: operation.operation, path: operation.path });
    }
    events.push({ type: "VARIABLE_UPDATE_ENDED", syntax: parsed.syntax });
    return { status: "committed", state: next, operationCount: parsed.operations.length, diagnostics: [], events };
  } catch (error) {
    const diagnostic = toDiagnostic(error);
    events.push({ type: "VARIABLE_UPDATE_FAILED", syntax: parsed.syntax, diagnostic });
    return { status: "failed", state: original, operationCount: parsed.operations.length, diagnostics: [diagnostic], events };
  }
}

function canonical(value: VariableValue): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
}

export async function variableStateDigest(state: VariableObject): Promise<string> {
  const bytes = new TextEncoder().encode(canonical(state));
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return Array.from(digest, (value) => value.toString(16).padStart(2, "0")).join("");
}

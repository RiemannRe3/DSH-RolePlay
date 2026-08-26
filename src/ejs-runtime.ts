type NodeWorker = {
  postMessage(value: unknown): void;
  on(event: "message" | "error" | "exit", listener: (...args: any[]) => void): NodeWorker;
  once(event: "error", listener: (error: Error) => void): NodeWorker;
  once(event: "exit", listener: (code: number) => void): NodeWorker;
  off(event: "message" | "error" | "exit", listener: (...args: any[]) => void): NodeWorker;
  terminate(): Promise<number>;
  unref(): NodeWorker;
};

const nodeProcess = (globalThis as any).process as { execArgv?: string[]; getBuiltinModule(id: string): any };
const WorkerConstructor = nodeProcess.getBuiltinModule("node:worker_threads").Worker as new (url: URL, options?: { execArgv?: string[] }) => NodeWorker;

export type EjsRuntimeOptions = {
  deadlineMs?: number;
  memoryLimitBytes?: number;
  maxStackSizeBytes?: number;
  maximumInputBytes?: number;
  maximumOutputBytes?: number;
};

export type EjsRuntime = {
  render(templates: readonly string[], variables: Record<string, unknown>, context?: EjsRenderContext): Promise<string[]>;
  dispose(): Promise<void>;
};

export type EjsRenderContext = { messageId?: number; seed?: string; missingVariables?: string[] };

export type EjsRuntimeError = Error & {
  code: "ejs_invalid_template" | "ejs_timeout" | "ejs_memory_limit" | "ejs_render_failed" | "ejs_unresolved";
};

const tag = /<%([_=#%-]?)([\s\S]*?)([_-]?)%>/gu;
const prohibitedCode = /\b(?:require|process|window|document|globalThis|eval|Function|fetch|XMLHttpRequest|WebSocket|import|localStorage|sessionStorage)\b/u;
const literalGetvar = /\bgetvar\s*\(\s*(["'])(.*?)\1/gu;

export function literalEjsVariableRoots(template: string): string[] {
  const roots = new Set<string>();
  for (const match of template.matchAll(new RegExp(literalGetvar.source, literalGetvar.flags))) {
    const parts = String(match[2] ?? "")
      .replace(/\[([^\]]+)\]/gu, ".$1")
      .split(".")
      .map((part) => part.replace(/^["']|["']$/gu, ""))
      .filter(Boolean);
    if (parts[0]?.toLocaleLowerCase() === "stat_data") parts.shift();
    const root = parts[0];
    if (root !== undefined && !["__proto__", "prototype", "constructor"].includes(root)) roots.add(root);
  }
  return [...roots];
}

function runtimeError(code: EjsRuntimeError["code"], message: string, cause?: unknown): EjsRuntimeError {
  return Object.assign(new Error(message, cause === undefined ? undefined : { cause }), { code });
}

function compileTemplate(template: string): string {
  const parts: string[] = [
    "(()=>{let __out='';const __append=value=>{if(value!==undefined&&value!==null)__out+=String(value)};",
  ];
  let cursor = 0;
  for (const match of template.matchAll(new RegExp(tag.source, tag.flags))) {
    const index = match.index ?? cursor;
    const open = match[1] ?? "";
    const body = match[2] ?? "";
    const close = match[3] ?? "";
    let literal = template.slice(cursor, index);
    if (open === "_") literal = literal.replace(/\s+$/u, "");
    if (literal.length > 0) parts.push(`__append(${JSON.stringify(literal)});`);
    if (open !== "#" && prohibitedCode.test(body)) throw runtimeError("ejs_invalid_template", "EJS 模板请求了未授权的宿主能力");
    if (open === "=") parts.push(`__append(__escape((${body})));`);
    else if (open === "-") parts.push(`__append((${body}));`);
    else if (open === "#") parts.push(";");
    else if (open === "%") parts.push(`__append(${JSON.stringify(`<%${body}${close}%>`)});`);
    else parts.push(`${body}\n`);
    cursor = index + match[0].length;
    if (close === "_") {
      const whitespace = /^\s+/u.exec(template.slice(cursor));
      cursor += whitespace?.[0].length ?? 0;
    } else if (close === "-") {
      const newline = /^\r?\n/u.exec(template.slice(cursor));
      cursor += newline?.[0].length ?? 0;
    }
  }
  const tail = template.slice(cursor);
  if (tail.length > 0) parts.push(`__append(${JSON.stringify(tail)});`);
  parts.push("return __out})()");
  return parts.join("");
}

function batchProgram(templates: readonly string[], variables: Record<string, unknown>, context: EjsRenderContext): string {
  const serializedVariables = JSON.stringify(variables);
  if (serializedVariables === undefined) throw runtimeError("ejs_invalid_template", "EJS 变量无法序列化");
  const compiled = templates.map(compileTemplate).join(",\n");
  return `(()=>{
const __state=JSON.parse(${JSON.stringify(serializedVariables)});
const __messageId=${Number.isFinite(context.messageId) ? Math.trunc(context.messageId as number) : -1};
const __seed=${JSON.stringify(context.seed ?? "dsh-re3-rp-ejs")};
const __missing=[];
const __parts=path=>String(path??'').replace(/\\[([^\\]]+)\\]/g,'.$1').split('.').map(part=>part.replace(/^['"]|['"]$/g,'')).filter(Boolean);
const __safe=parts=>parts.every(part=>part!=='__proto__'&&part!=='prototype'&&part!=='constructor');
const __escape=value=>String(value??'').replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&#34;',"'":'&#39;'}[character]));
let __randomState=2166136261;for(const character of __seed){__randomState^=character.codePointAt(0)??0;__randomState=Math.imul(__randomState,16777619)}
Math.random=()=>{__randomState+=0x6D2B79F5;let value=__randomState;value=Math.imul(value^(value>>>15),value|1);value^=value+Math.imul(value^(value>>>7),value|61);return((value^(value>>>14))>>>0)/4294967296};
function getvar(path,options={}){const original=String(path??'');const parts=__parts(path);if(parts[0]?.toLowerCase()==='stat_data')parts.shift();if(!__safe(parts)){__missing.push(original);return options?.defaults}let current=__state;for(const part of parts){if(current===null||current===undefined||!Object.prototype.hasOwnProperty.call(Object(current),part)){__missing.push(original);return options?.defaults}current=current[part]}return current}
function getLastMessageId(){return __messageId}
const __outputs=[${compiled}];return {outputs:__outputs,missingVariables:Array.from(new Set(__missing))}
})()`;
}

export async function createEjsRuntime(options: EjsRuntimeOptions = {}): Promise<EjsRuntime> {
  const deadlineMs = Math.max(5, Math.min(5_000, options.deadlineMs ?? 50));
  const memoryLimitBytes = Math.max(4 * 1024 * 1024, Math.min(256 * 1024 * 1024, options.memoryLimitBytes ?? 32 * 1024 * 1024));
  const maxStackSizeBytes = Math.max(128 * 1024, Math.min(4 * 1024 * 1024, options.maxStackSizeBytes ?? 512 * 1024));
  const maximumInputBytes = Math.max(64 * 1024, Math.min(64 * 1024 * 1024, options.maximumInputBytes ?? 256 * 1024));
  const maximumOutputBytes = Math.max(64 * 1024, Math.min(64 * 1024 * 1024, options.maximumOutputBytes ?? 1024 * 1024));
  const bytes = (value: string): number => new TextEncoder().encode(value).byteLength;
  let worker: NodeWorker | undefined;
  let nextRequestId = 0;
  let queue: Promise<unknown> = Promise.resolve();
  let disposed = false;

  const terminateWorker = async (target: NodeWorker | undefined): Promise<void> => {
    if (target === undefined) return;
    if (worker === target) worker = undefined;
    try { await target.terminate(); } catch { /* Worker may already have crashed. */ }
  };

  const ensureWorker = (): NodeWorker => {
    if (disposed) throw runtimeError("ejs_render_failed", "EJS runtime 已关闭");
    if (worker !== undefined) return worker;
    const created = new WorkerConstructor(new URL("./ejs-worker.js", import.meta.url), {
      // `node --input-type=module -e` is useful for release probes, but the
      // flag is invalid for a file-backed Worker and must not be inherited.
      execArgv: [],
    });
    worker = created;
    // Request listeners are intentionally short-lived. These lifecycle
    // listeners remain attached so an idle crash is never an unhandled Worker
    // error and the next render never reuses a dead cached Worker.
    created.on("error", () => { if (worker === created) worker = undefined; });
    created.on("exit", () => { if (worker === created) worker = undefined; });
    // A forgotten plugin disposer must never keep the DSH process alive.
    created.unref();
    return created;
  };

  const runProgramNow = async (program: string): Promise<unknown> => {
    const target = ensureWorker();
    const id = ++nextRequestId;
    return new Promise((resolve, reject) => {
      let settled = false;
      const settle = (handler: () => void): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        target.off("message", onMessage);
        target.off("error", onError);
        target.off("exit", onExit);
        handler();
      };
      const onMessage = (response: { id?: unknown; ok?: unknown; result?: unknown; error?: { message?: unknown } }): void => {
        if (response?.id !== id) return;
        settle(() => {
          if (response.ok === true) resolve(response.result);
          else reject(runtimeError("ejs_render_failed", `EJS 渲染失败：${String(response.error?.message ?? "worker error")}`));
        });
      };
      const onError = (cause: Error): void => settle(() => {
        void terminateWorker(target);
        reject(runtimeError("ejs_render_failed", `EJS Worker 崩溃：${cause.message}`, cause));
      });
      const onExit = (code: number): void => settle(() => {
        void terminateWorker(target);
        reject(runtimeError("ejs_render_failed", `EJS Worker 异常退出（${code}）`));
      });
      const timer = setTimeout(() => settle(() => {
        void terminateWorker(target);
        reject(runtimeError("ejs_timeout", "EJS 执行超过墙钟时间边界"));
      }), Math.max(100, deadlineMs + 100));
      target.on("message", onMessage);
      target.once("error", onError);
      target.once("exit", onExit);
      target.postMessage({ id, program, deadlineMs, memoryLimitBytes, maxStackSizeBytes });
    });
  };

  const runProgram = (program: string): Promise<unknown> => {
    const scheduled = queue.then(() => runProgramNow(program), () => runProgramNow(program));
    queue = scheduled.catch(() => undefined);
    return scheduled;
  };

  const runtime: EjsRuntime = {
    async render(templates, variables, context = {}) {
      if (templates.some((template) => typeof template !== "string")) throw runtimeError("ejs_invalid_template", "EJS 模板必须是字符串");
      const inputBytes = templates.reduce((total, template) => total + bytes(template), 0);
      if (inputBytes > maximumInputBytes) throw runtimeError("ejs_invalid_template", `EJS 模板超过 ${maximumInputBytes} bytes 安全边界`);
      // Each evalCode call inside the worker creates a fresh QuickJS
      // runtime/context. Keeping the WASM host in a terminable Worker also
      // contains implementation-level aborts instead of risking the DSH loop.
      const rendered: string[] = [];
      for (const [index, template] of templates.entries()) {
        const program = batchProgram([template], variables, { ...context, seed: `${context.seed ?? "dsh-re3-rp-ejs"}:${index}` });
        let result: unknown;
        try {
          result = await runProgram(program);
        } catch (cause) {
          const message = cause instanceof Error
            ? cause.message
            : typeof cause === "object" && cause !== null && typeof (cause as { message?: unknown }).message === "string"
              ? (cause as { message: string }).message
              : String(cause);
          if (/interrupted/iu.test(message)) throw runtimeError("ejs_timeout", "EJS 执行超过时间边界", cause);
          if (/memory|allocation|out of memory/iu.test(message)) throw runtimeError("ejs_memory_limit", "EJS 执行超过内存边界", cause);
          throw runtimeError("ejs_render_failed", `EJS 渲染失败：${message}`, cause);
        }
        const resultObject = typeof result === "object" && result !== null ? result as { outputs?: unknown; missingVariables?: unknown } : undefined;
        if (!Array.isArray(resultObject?.outputs) || resultObject.outputs.length !== 1 || typeof resultObject.outputs[0] !== "string") {
          throw runtimeError("ejs_render_failed", "EJS 渲染结果形状无效");
        }
        if (Array.isArray(resultObject.missingVariables) && context.missingVariables !== undefined) {
          context.missingVariables.push(...resultObject.missingVariables.filter((value): value is string => typeof value === "string"));
        }
        rendered.push(resultObject.outputs[0]);
      }
      const outputBytes = rendered.reduce((total, value) => total + bytes(value), 0);
      if (outputBytes > maximumOutputBytes) throw runtimeError("ejs_memory_limit", `EJS 输出超过 ${maximumOutputBytes} bytes 安全边界`);
      if (rendered.some((value) => /<%|%>/u.test(value))) throw runtimeError("ejs_unresolved", "EJS 渲染后仍有未解析标签");
      return rendered;
    },
    async dispose() {
      disposed = true;
      await terminateWorker(worker);
    },
  };
  try {
    const selfTest = await runtime.render(["<%= 6 * 7 %>"], {}, { seed: "dsh-re3-rp-ejs-self-test" });
    if (selfTest[0] !== "42") throw runtimeError("ejs_render_failed", "EJS runtime 自检结果错误");
  } catch (error) {
    await runtime.dispose();
    throw error;
  }
  return runtime;
}

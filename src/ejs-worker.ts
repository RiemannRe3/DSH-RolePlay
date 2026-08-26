import variant from "@jitl/quickjs-wasmfile-release-sync";
import { newQuickJSWASMModuleFromVariant, shouldInterruptAfterDeadline } from "quickjs-emscripten-core";

const parentPort = (globalThis as any).process.getBuiltinModule("node:worker_threads").parentPort as {
  on(event: "message", listener: (value: WorkerRequest) => void): void;
  postMessage(value: WorkerResponse): void;
} | null;

type WorkerRequest = {
  id: number;
  program: string;
  deadlineMs: number;
  memoryLimitBytes: number;
  maxStackSizeBytes: number;
};

type WorkerResponse = {
  id: number;
  ok: true;
  result: unknown;
} | {
  id: number;
  ok: false;
  error: { message: string };
};

if (parentPort === null) throw new Error("EJS QuickJS worker 缺少 parentPort");

const quickJS = await newQuickJSWASMModuleFromVariant(variant);

parentPort.on("message", (request: WorkerRequest) => {
  let response: WorkerResponse;
  try {
    response = {
      id: request.id,
      ok: true,
      result: quickJS.evalCode(request.program, {
        memoryLimitBytes: request.memoryLimitBytes,
        maxStackSizeBytes: request.maxStackSizeBytes,
        shouldInterrupt: shouldInterruptAfterDeadline(Date.now() + request.deadlineMs),
      }),
    };
  } catch (cause) {
    const message = cause instanceof Error
      ? cause.message
      : typeof cause === "object" && cause !== null
        ? JSON.stringify(cause)
        : String(cause);
    response = {
      id: request.id,
      ok: false,
      error: { message },
    };
  }
  parentPort.postMessage(response);
});

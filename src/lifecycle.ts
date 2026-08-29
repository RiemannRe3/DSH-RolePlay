export type RolePlayLifecycleSnapshot = {
  enabled: boolean;
  phase: "active" | "disabled" | "transitioning" | "failed";
  error: string | null;
};

export type RolePlayRuntimeDisposer = () => void | Promise<void>;

export type RolePlayLifecycleOptions = {
  loadEnabled(): boolean | Promise<boolean>;
  saveEnabled(enabled: boolean): void | Promise<void>;
  startRuntime(): RolePlayRuntimeDisposer | Promise<RolePlayRuntimeDisposer>;
};

/**
 * Owns the reversible RolePlay runtime lifecycle behind one small interface.
 * Persistent roleplay data is deliberately outside this module: disabling the
 * runtime detaches behavior and UI without deleting cards or sessions.
 */
export class RolePlayLifecycle {
  private runtimeDispose: RolePlayRuntimeDisposer | null = null;
  private enabled = false;
  private phase: RolePlayLifecycleSnapshot["phase"] = "disabled";
  private error: string | null = null;
  private queue: Promise<void> = Promise.resolve();
  private disposed = false;

  constructor(private readonly options: RolePlayLifecycleOptions) {}

  async initialize(): Promise<void> {
    const enabled = await this.options.loadEnabled();
    if (enabled) await this.activate(false);
  }

  snapshot(): RolePlayLifecycleSnapshot {
    return { enabled: this.enabled, phase: this.phase, error: this.error };
  }

  setEnabled(enabled: boolean): Promise<RolePlayLifecycleSnapshot> {
    const operation = this.queue.then(async () => {
      if (this.disposed) throw new Error("RolePlay 生命周期已经释放");
      if (enabled === this.enabled && this.phase !== "failed") return;
      if (enabled) await this.activate(true);
      else await this.deactivate(true);
    });
    this.queue = operation.then(() => undefined, () => undefined);
    return operation.then(() => this.snapshot());
  }

  async dispose(): Promise<void> {
    this.disposed = true;
    await this.queue;
    await this.deactivate(false);
  }

  private async activate(persist: boolean): Promise<void> {
    this.phase = "transitioning";
    this.error = null;
    let dispose: RolePlayRuntimeDisposer | null = null;
    try {
      dispose = await this.options.startRuntime();
      if (typeof dispose !== "function") throw new Error("RolePlay 运行时没有返回卸载函数");
      if (persist) await this.options.saveEnabled(true);
      this.runtimeDispose = dispose;
      this.enabled = true;
      this.phase = "active";
    } catch (error) {
      if (dispose !== null) await dispose();
      this.enabled = false;
      this.phase = "failed";
      this.error = error instanceof Error ? error.message : String(error);
      throw error;
    }
  }

  private async deactivate(persist: boolean): Promise<void> {
    if (this.runtimeDispose === null) {
      this.enabled = false;
      this.phase = "disabled";
      this.error = null;
      if (persist) await this.options.saveEnabled(false);
      return;
    }

    this.phase = "transitioning";
    this.error = null;
    const dispose = this.runtimeDispose;
    try {
      await dispose();
      this.runtimeDispose = null;
      this.enabled = false;
      if (persist) await this.options.saveEnabled(false);
      this.phase = "disabled";
    } catch (error) {
      this.phase = "failed";
      this.error = error instanceof Error ? error.message : String(error);
      throw error;
    }
  }
}

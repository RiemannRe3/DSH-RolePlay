import { applyVariableUpdate, type VariableObject, type VariableRuntimeEvent } from "./variable-runtime.js";

export type MvuUpdateMethod = "随 AI 输出" | "额外模型解析";
export type MvuModelSource = "与插头相同" | "自定义";

export type MvuSessionSettings = {
  updateMethod: MvuUpdateMethod;
  automaticRequest: boolean;
  extraModel: {
    source: MvuModelSource;
    provider: string;
    model: string;
    maxTokens: number;
  };
};

type MvuSettingDefaults = { provider: string; model: string; supportsExtraModel: boolean };

export function supportsExtraModelParsing(updateFormats: readonly string[]): boolean {
  return updateFormats.some((format) => typeof format === "string" && format.trim().length > 0);
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function shortText(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= 200 ? value.trim() : fallback;
}

export function defaultMvuSessionSettings(defaults: MvuSettingDefaults): MvuSessionSettings {
  return {
    updateMethod: defaults.supportsExtraModel ? "额外模型解析" : "随 AI 输出",
    automaticRequest: true,
    extraModel: {
      source: "与插头相同",
      provider: defaults.provider,
      model: defaults.model,
      maxTokens: 4096,
    },
  };
}

export function normalizeMvuSessionSettings(value: unknown, defaults: MvuSettingDefaults): MvuSessionSettings {
  const base = defaultMvuSessionSettings(defaults);
  const input = record(value);
  const extra = record(input.extraModel);
  const updateMethod = input.updateMethod === "随 AI 输出" || input.updateMethod === "额外模型解析"
    ? input.updateMethod
    : base.updateMethod;
  if (updateMethod === "额外模型解析" && !defaults.supportsExtraModel) {
    throw new Error("当前角色卡未声明可执行的额外模型解析条目");
  }
  const source = extra.source === "自定义" ? "自定义" : "与插头相同";
  const maxTokens = typeof extra.maxTokens === "number" && Number.isInteger(extra.maxTokens) && extra.maxTokens >= 256 && extra.maxTokens <= 32_768
    ? extra.maxTokens
    : base.extraModel.maxTokens;
  return {
    updateMethod,
    automaticRequest: typeof input.automaticRequest === "boolean" ? input.automaticRequest : base.automaticRequest,
    extraModel: {
      source,
      provider: shortText(extra.provider, base.extraModel.provider),
      model: shortText(extra.model, base.extraModel.model),
      maxTokens,
    },
  };
}

export function resolveMvuExtraModel(settings: MvuSessionSettings, current: { provider: string; model: string }): { provider: string; model: string; maxTokens: number } {
  return settings.extraModel.source === "自定义"
    ? { provider: settings.extraModel.provider, model: settings.extraModel.model, maxTokens: settings.extraModel.maxTokens }
    : { provider: current.provider, model: current.model, maxTokens: settings.extraModel.maxTokens };
}

export function replayMvuReplies(initialState: VariableObject, replies: readonly string[]): {
  state: VariableObject;
  events: Array<VariableRuntimeEvent & { replayIndex: number }>;
  committedReplies: number;
  failedReplies: number;
} {
  let state = structuredClone(initialState);
  const events: Array<VariableRuntimeEvent & { replayIndex: number }> = [];
  let committedReplies = 0;
  let failedReplies = 0;
  replies.forEach((reply, replayIndex) => {
    const result = applyVariableUpdate(state, reply);
    events.push(...result.events.map((event) => ({ ...event, replayIndex })));
    if (result.status === "committed") {
      state = result.state;
      committedReplies += 1;
    } else if (result.status === "failed") {
      failedReplies += 1;
    }
  });
  return { state, events, committedReplies, failedReplies };
}

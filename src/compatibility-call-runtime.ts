export type CompatibilitySurface = "TavernHelper" | "MVU" | "SillyTavern";

export type CompatibilityCallDescriptor = {
  surface: CompatibilitySurface;
  method: string;
  dshAction: string;
  effect: "只读" | "本地执行" | "持久化写入" | "正式消息提交";
};

const catalog: readonly CompatibilityCallDescriptor[] = [
  { surface: "TavernHelper", method: "getVariables", dshAction: "读取当前 Session 变量投影", effect: "只读" },
  { surface: "TavernHelper", method: "getAllVariables", dshAction: "读取当前 Session 的 stat_data 投影", effect: "只读" },
  { surface: "TavernHelper", method: "replaceVariables", dshAction: "原子替换当前 Session 变量状态", effect: "持久化写入" },
  { surface: "TavernHelper", method: "insertOrAssignVariables", dshAction: "合并后原子提交当前 Session 变量状态", effect: "持久化写入" },
  { surface: "TavernHelper", method: "getChatMessages", dshAction: "读取 DSH Session 消息与变量投影", effect: "只读" },
  { surface: "TavernHelper", method: "getWorldbook", dshAction: "读取当前卡绑定的世界书投影", effect: "只读" },
  { surface: "TavernHelper", method: "getWorldbookNames", dshAction: "读取当前卡世界书名称", effect: "只读" },
  { surface: "TavernHelper", method: "getCharWorldbookNames", dshAction: "读取当前卡世界书绑定", effect: "只读" },
  { surface: "TavernHelper", method: "updateWorldbookWith", dshAction: "提交当前 Session 的世界书启用覆盖", effect: "持久化写入" },
  { surface: "TavernHelper", method: "replaceWorldbook", dshAction: "提交当前 Session 的世界书启用覆盖", effect: "持久化写入" },
  { surface: "TavernHelper", method: "rebindCharWorldbooks", dshAction: "返回当前卡绑定投影，不改写卡片原件", effect: "本地执行" },
  { surface: "TavernHelper", method: "createWorldbookEntries", dshAction: "仅返回兼容结果；DSH 当前不创建卡片世界书条目", effect: "本地执行" },
  { surface: "TavernHelper", method: "eventOn", dshAction: "订阅当前隔离前端事件域", effect: "本地执行" },
  { surface: "TavernHelper", method: "eventEmit", dshAction: "发布当前隔离前端事件", effect: "本地执行" },
  { surface: "TavernHelper", method: "initializeGlobal", dshAction: "注册当前卡 companion 与消息 iframe 共享全局", effect: "本地执行" },
  { surface: "TavernHelper", method: "waitGlobalInitialized", dshAction: "等待当前卡隔离运行域共享全局", effect: "本地执行" },
  { surface: "TavernHelper", method: "triggerSlash", dshAction: "映射到 DSH 输入框草稿或正式消息提交", effect: "正式消息提交" },
  { surface: "MVU", method: "variables", dshAction: "读取当前 Session 变量投影", effect: "只读" },
  { surface: "MVU", method: "getMvuData", dshAction: "读取当前 Session 的 stat_data 投影", effect: "只读" },
  { surface: "MVU", method: "replaceMvuData", dshAction: "原子替换当前 Session 变量状态", effect: "持久化写入" },
  { surface: "SillyTavern", method: "getContext", dshAction: "读取当前 DSH Session 消息上下文投影", effect: "只读" },
  { surface: "SillyTavern", method: "sendMessage", dshAction: "向当前 DSH Session 提交正式玩家消息", effect: "正式消息提交" },
];

export function compatibilityCallCatalog(): CompatibilityCallDescriptor[] {
  return catalog.map((item) => ({ ...item }));
}

export function describeCompatibilityCall(surface: string, method: string): CompatibilityCallDescriptor | undefined {
  const found = catalog.find((item) => item.surface === surface && item.method === method);
  return found === undefined ? undefined : { ...found };
}

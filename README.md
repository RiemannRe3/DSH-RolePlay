# DSH RolePlay

> 在 DeepSeek Harness 的原生 Session 里游玩 Tavern 角色卡。

`dsh-re3-rp` 是一个 DSH 插件：把 Tavern Character Card V2/V3 导入 DSH，在原生 Conversation 中开始、继续和恢复游玩。玩家面对的仍然是一段 RP；卡片的世界书、变量和前端能力由插件在后台装配，并且每一项兼容结果都可以被查看。

![DSH RolePlay 中的 Tavern 卡片与原生 Conversation](demo.png)

上图使用原创展示卡「阿沫·零点七分失物处」：左侧是酒馆卡库与 Session 树，中央是卡片开场和消息内前端，右侧保留 DSH 的世界书、预设、Regex、前端、卡片和 Persona 能力入口。展示卡只用于说明体验，不包含在插件发布包中。

## 它解决什么问题

许多 Tavern 卡并不只有角色简介和一段开场白，还会依赖 World Info、Regex、EJS、MVU、TavernHelper 或卡内前端。直接把这些卡当成普通文本导入，常常会得到“看起来导入成功、实际机制没有运行”的结果。

DSH RolePlay 采用一条清晰的运行链：

```text
Tavern 卡 → DSH Session → 原生 Conversation / Session Log
```

卡片的原始文件和不可变 revision 会被保留；新的 Session 绑定选定的卡片版本，已有 Session 不会因为卡库整理而悄悄换卡。DOM、iframe 和浏览器存储只是可以重新构建的显示投影，不是第二套聊天历史。

## 当前能力

- 导入 PNG / JSON Tavern Character Card V2/V3。
- 管理卡片、主开场与备选开场，并从卡片创建原生 DSH Session。
- 装配 World Info、Regex、EJS、MVU、Preset、Persona，以及受限的 TavernHelper 和卡内前端兼容层。
- 在 DSH 原生 Conversation 中查看卡片消息、上下文装配和能力面板。
- 使用 DSH 原生的 Session Log、Fork 和停止/重启恢复。
- 对每项能力标记“完整生效、等价替代、仅保留、已禁用或已丢失”，不把静默降级伪装成完整兼容。

兼容范围仍在扩展中。某张卡是否可完整游玩，要以该卡导入后的兼容报告和实际 Session 行为为准；“能导入”不等于“所有扩展都已执行”。

## 安装与构建

当前公开版本面向 DeepSeek Harness `0.1.1-rc.2`。

从 [Releases](https://github.com/RiemannRe3/DSH-RolePlay/releases) 下载 `dsh-re3-rp` 的 tarball，再按你的 DSH profile 安装该 npm 包。这个插件通过 `cordis.patch.yml` 注册 bundle，安装完成后，DSH WebUI 会在原生工作区中提供酒馆入口。

从源码构建：

```powershell
npm ci --legacy-peer-deps
npm run build
npm pack
```

Node.js 版本要求：`>=24.13.1 <25`。

## 使用方式

1. 在 DSH WebUI 打开“酒馆”，导入一张 PNG 或 JSON 角色卡。
2. 在卡片库中检查版本、开场和兼容报告。
3. 选择开场并创建 Session。
4. 回到原生 Conversation 游玩；需要时在右侧查看世界书、Regex、前端或变量投影。

卡片库只负责管理卡片 revision 和入口。对话记录、Session 状态、变量提交和操作回执仍由 DSH 原生运行时负责。

## 安全与公开边界

- 卡内消息前端默认运行在 `sandbox="allow-scripts"` 的 iframe 中，不获得 same-origin 权限。
- Bridge 会同时校验 iframe 来源窗口、实例 token、Session 和声明能力。
- EJS 等卡内模板运行在可丢弃的 QuickJS Worker 中，不直接获得宿主文件、网络或密钥权限。
- 仓库不附带真实社区酒馆卡、社区卡原件、聊天记录、测试证据或私有研究材料。
- 截图中的原创展示卡是演示素材，不代表插件会替你再分发第三方卡片。

发现安全问题，请按 [SECURITY.md](SECURITY.md) 的方式报告。

## 反馈与路线

这是一个持续迭代中的早期版本。欢迎用自己的卡片测试：哪里没有生效、哪里显示不对、哪里与原来的 Tavern 体验不同，都可以在 [Issues](https://github.com/RiemannRe3/DSH-RolePlay/issues) 中反馈。请在不方便公开卡片内容时，只描述可复现的能力、输入和观察结果，不要上传未经授权的卡片原件。

后续方向是继续完善卡片兼容与可观测性，再逐步探索让后台 Agent 承担更像“跑团导演”的场景、节奏和状态工作；这部分不会改变玩家以自然 RP 为主的使用方式。

## License

第一方代码使用 [MIT License](LICENSE)。第三方依赖继续遵守各自许可证。

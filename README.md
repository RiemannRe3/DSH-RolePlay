# DSH Re3 RP

`dsh-re3-rp` 是一个 DSH 插件，用于导入 Tavern Character Card V2/V3，并在 DSH 原生 Session 与 Conversation 中持续游玩。

## 能力

- 导入 Tavern PNG/JSON 角色卡，保留原始字节与不可变 revision。
- 选择主开场或备选开场，并创建原生 DSH Session。
- 执行 World Info、Regex、EJS、MVU、Preset、Persona 与受限卡内前端兼容层。
- 使用 DSH 原生 Conversation、Fork、Session Log 和重启恢复，不建立第二套聊天历史。
- 对不支持或缺失的 required 能力给出明确兼容结果，不静默丢失。

DSH Session、变量表、卡片绑定和操作回执是权威状态。iframe、DOM 与浏览器存储仅作为可重建投影或缓存。

## 环境

- Node.js `24.13.1` 以上、`25` 以下。
- DeepSeek Harness `0.1.0-rc.7` 兼容依赖。

## 构建

```powershell
npm ci --legacy-peer-deps
npm run build
npm pack --ignore-scripts
```

构建输出位于 `lib/`。`npm pack` 只包含包清单明确列出的运行文件。

## DSH bundle

`cordis.patch.yml` 注册 `dsh-re3-rp` bundle。安装打包产物后，DSH WebUI 会在原生工作区中提供酒馆卡入口。

主要 HTTP 接缝：

- `GET /dsh-re3-rp/cards`
- `POST /dsh-re3-rp/import`
- `POST /dsh-re3-rp/sessions`
- `GET /dsh-re3-rp/conversation-projection?sessionId=...`
- `GET /dsh-re3-rp/frontend?sessionId=...`
- `POST /dsh-re3-rp/bridge`
- `GET /dsh-re3-rp/variables?sessionId=...`

导入请求使用 `X-Dsh-Re3-Rp-Filename` 传递经过 URL 编码的原文件名。

## 安全边界

- 消息 iframe 默认使用 `sandbox="allow-scripts"`，不获得 same-origin 权限。
- Bridge 同时校验 iframe 来源窗口、实例 token、Session 与声明能力。
- 卡内模板运行在可丢弃的 QuickJS Worker 中，不获得宿主文件、网络或密钥权限。
- 插件不附带真实社区角色卡、聊天记录、测试证据或私有研究材料。

安全问题请按 [SECURITY.md](SECURITY.md) 中的方式报告。

## License

第一方代码使用 [MIT License](LICENSE)。第三方依赖继续遵守各自许可证。

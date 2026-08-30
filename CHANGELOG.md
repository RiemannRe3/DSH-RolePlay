# Changelog

## 0.1.5 - 2026-08-30

- 重写公开 README，使用《玄净》《苏念念》《顾清》和世界书、预设、上下文、前端页面的全宽实机截图。
- 补充三张演示卡的来源、修改说明与 CC BY 4.0 许可。

## 0.1.4 - 2026-08-30

- 改进空回复拒绝、富消息与 iframe 尺寸恢复、Conversation 消息投影及预设响应格式兼容。
- 将角色卡、世界书命中、上下文装配、预设、Regex、MVU/前端与 Persona 的真实运行页面纳入公开产品导览。
- 增加 Foreverse Team 演示角色卡、《玄净》DSH 适配与新封面的分项 CC BY 4.0 署名和修改说明；演示卡文件本身不随插件分发。
- 将兼容报告与运行时展示中的内部追踪编号改为公开产品语言。

## 0.1.3 - 2026-08-29

- 将 npm 包迁移为公开作用域包 `@riemannre3/dsh-roleplay`，避免未作用域包名冲突。
- 改用标准 DSH Web Profile 安装命令，并增加可逆的设置开关：关闭时卸载酒馆运行时与界面，保留角色卡和 Session 数据。
- 增加 npm Trusted Publisher 工作流，为首次人工发布后的 GitHub OIDC 自动发布做准备。

## 0.1.2 - 2026-08-27

- 将公开包名、插件标识和新建消息来源统一为 `dsh-roleplay`。
- 保留旧 Session 的持久化命名和 `/dsh-re3-rp` HTTP 路径，避免已有数据升级后失联。
- 补充 Windows 安装、启动、停止和重启说明。

## 0.1.1 - 2026-08-26

- 更新至 DeepSeek Harness `0.1.1-rc.2` 兼容线。
- 改进 Tavern 卡片库、富消息渲染、开场选择与 Session 投影恢复。
- 增加原创展示卡界面截图，补充公开仓库 README 与发布边界说明。

## 0.1.0

- 首个 `dsh-re3-rp` 公开候选。
- 支持 Tavern Character Card V2/V3、World Info、Regex、EJS、MVU、Preset、Persona 与受限前端 Bridge。
- 使用 DSH 原生 Session、Conversation、Fork 与重启恢复。

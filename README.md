# DSH RolePlay

> 让 Tavern 角色卡进入 DeepSeek Harness，而不是把你带去另一套聊天系统。

`@riemannre3/dsh-roleplay` 是一个 DSH Web 插件：导入 Tavern Character Card V2/V3 PNG/JSON，从卡片开场创建原生 DSH Session，再在原生 Conversation 里继续游玩。

卡片仍然是卡片；模型调用、上下文、Token 状态、分支和 Session Log 仍然属于 DSH。

[![npm version](https://img.shields.io/npm/v/@riemannre3/dsh-roleplay.svg)](https://www.npmjs.com/package/@riemannre3/dsh-roleplay)
[![GitHub Release](https://img.shields.io/github/v/release/RiemannRe3/DSH-RolePlay)](https://github.com/RiemannRe3/DSH-RolePlay/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

![DSH RolePlay 中的 Tavern 卡片与原生 Conversation](https://raw.githubusercontent.com/RiemannRe3/DSH-RolePlay/v0.1.4/media/readme/01-conversation.jpg)

主演示卡是《玄净》的 DSH 适配版：原作由 Foreverse Team 在 [character-card-skills](https://github.com/foreverse-app/character-card-skills/tree/dab0da437810b2ea4b5eec414c10c8fa35e779f8) 中以 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) 发布；RiemannRe3 重整了世界引入、持续状态与「云山长卷」，并使用 OpenAI 图像生成工具制作了新封面。截图中同屏的其他角色卡来自同一上游固定版本。独立角色卡文件不随插件分发；完整署名、修改说明与分项许可见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

## 为什么它更舒服

DSH RolePlay 的重点不是再做一层聊天外壳，而是把 Tavern 资产接入 DSH 已有的运行链路。

| 设计取向 | 带来的体验 |
| --- | --- |
| 对话留在原生 Conversation | 沿用 DSH 的模型选择、消息操作、Token 状态、分支与 Session Log，不维护第二份聊天记录 |
| 上下文可以逐项检查 | 世界书命中、提示词顺序、Persona、角色字段和示例对话不再藏在一个黑盒 Prompt 里 |
| 复杂能力分面板呈现 | 世界书、预设、Regex、前端、卡片和 Persona 各自有清楚入口，排查问题不必直接翻 JSON |
| 兼容边界直接显示 | “能导入”“能开始对话”和“卡内能力完整运行”是三件事；界面展示实际规则数、运行事件、权限和错误 |
| 插件关闭可逆 | 关闭插件会卸载界面与运行时扩展，但角色卡和 Session 数据仍保存在当前 DSH Web Profile |

我们不会用一句“兼容 Tavern 卡”掩盖卡与卡之间的差异。没有载入的 Regex、前端脚本或运行时能力会如实显示，方便你判断这张卡适合直接游玩，还是需要补齐兼容层。

## 对话留在 DSH，卡片能力随时展开

角色卡在左侧“酒馆”中管理，实际游玩发生在 DSH 原生 Conversation。需要查看卡片怎么工作时，右侧能力栏随时可以展开，不会离开当前 Session。

### 卡片内容与世界书

<table>
  <tr>
    <td width="50%">
      <strong>角色字段、封面与多个开场</strong><br>
      <a href="https://github.com/RiemannRe3/DSH-RolePlay/blob/v0.1.4/media/readme/04-card.jpg"><img src="https://raw.githubusercontent.com/RiemannRe3/DSH-RolePlay/v0.1.4/media/readme/04-card.jpg" alt="角色卡字段、封面与开场" width="100%"></a>
    </td>
    <td width="50%">
      <strong>真实一轮命中 6 条世界书</strong><br>
      <a href="https://github.com/RiemannRe3/DSH-RolePlay/blob/v0.1.4/media/readme/02-worldbook.jpg"><img src="https://raw.githubusercontent.com/RiemannRe3/DSH-RolePlay/v0.1.4/media/readme/02-worldbook.jpg" alt="世界书条目、命中状态与注入位置" width="100%"></a>
    </td>
  </tr>
</table>

导入后可以直接查看角色描述、性格、场景和多个开场。世界书面板区分全部条目、本轮命中与当前范围，并显示条目的插入位置、执行顺序和真实命中依据。

### 模型最终看见了什么

<table>
  <tr>
    <td width="50%">
      <strong>提示词槽位、顺序与 revision</strong><br>
      <a href="https://github.com/RiemannRe3/DSH-RolePlay/blob/v0.1.4/media/readme/03-preset.jpg"><img src="https://raw.githubusercontent.com/RiemannRe3/DSH-RolePlay/v0.1.4/media/readme/03-preset.jpg" alt="对话补全预设和提示词顺序" width="100%"></a>
    </td>
    <td width="50%">
      <strong>本轮发送给模型的上下文装配</strong><br>
      <a href="https://github.com/RiemannRe3/DSH-RolePlay/blob/v0.1.4/media/readme/08-context-assembly.jpg"><img src="https://raw.githubusercontent.com/RiemannRe3/DSH-RolePlay/v0.1.4/media/readme/08-context-assembly.jpg" alt="本轮上下文装配结果" width="100%"></a>
    </td>
  </tr>
</table>

预设定义提示词槽位；“酒馆”上下文视图则按实际发送顺序列出 Main Prompt、世界书、Persona、角色字段、示例对话和历史消息，并给出各部分的 Token 估算。这样，“为什么角色突然这样回答”会变成一个可以检查的问题。

### Persona 与卡内运行时

<table>
  <tr>
    <td width="50%">
      <strong>Persona 作用域与当前绑定</strong><br>
      <a href="https://github.com/RiemannRe3/DSH-RolePlay/blob/v0.1.4/media/readme/05-persona.jpg"><img src="https://raw.githubusercontent.com/RiemannRe3/DSH-RolePlay/v0.1.4/media/readme/05-persona.jpg" alt="Persona 作用范围与当前 Session 绑定" width="100%"></a>
    </td>
    <td width="50%">
      <strong>前端、iframe 与 MVU 运行状态</strong><br>
      <a href="https://github.com/RiemannRe3/DSH-RolePlay/blob/v0.1.4/media/readme/06-frontend-mvu.jpg"><img src="https://raw.githubusercontent.com/RiemannRe3/DSH-RolePlay/v0.1.4/media/readme/06-frontend-mvu.jpg" alt="卡内前端和 MVU 变量运行状态" width="100%"></a>
    </td>
  </tr>
</table>

Persona 可以按全局、当前角色卡或当前 Session 生效。前端面板分别呈现消息 HTML/CSS、iframe、后台脚本、独立前端和 MVU 变量状态，不会把“页面看起来正常”冒充成运行时已经完整工作。

### Regex 与插件生命周期

<table>
  <tr>
    <td width="50%">
      <strong>Regex 规则、作用域与诚实边界</strong><br>
      <a href="https://github.com/RiemannRe3/DSH-RolePlay/blob/v0.1.4/media/readme/07-regex.jpg"><img src="https://raw.githubusercontent.com/RiemannRe3/DSH-RolePlay/v0.1.4/media/readme/07-regex.jpg" alt="Regex 规则、作用域与设置状态" width="100%"></a>
    </td>
    <td width="50%">
      <strong>随时关闭或重新开启</strong><br>
      <a href="https://github.com/RiemannRe3/DSH-RolePlay/blob/v0.1.4/media/readme/09-plugin-settings.jpg"><img src="https://raw.githubusercontent.com/RiemannRe3/DSH-RolePlay/v0.1.4/media/readme/09-plugin-settings.jpg" alt="在 DSH 插件设置中关闭或开启 DSH RolePlay" width="100%"></a>
    </td>
  </tr>
</table>

Regex 面板把全局、预设和当前卡片规则分开，并将屏幕显示视为可重建投影，不污染 Session 中的正式消息。插件本身可以从 DSH 设置中关闭或重新开启，已有角色卡和 Session 不会因此消失。

## 支持范围

当前支持：

- 导入 Tavern Character Card V2/V3 PNG 或 JSON。
- 浏览角色描述、性格、场景、示例对话和多个开场。
- 从角色卡开场创建 DSH 原生 Session，并在原生 Conversation 中继续对话、分支和导出 Session Log。
- 检查世界书条目、本轮命中、插入位置和执行顺序。
- 查看与编辑对话补全预设，检查实际上下文装配结果。
- 管理 Persona，并按全局、角色卡或 Session 绑定。
- 查看 Regex、富消息、卡内前端、iframe、后台脚本和 MVU 的实际运行状态。

不同角色卡可能依赖不同版本的世界书、Regex、脚本框架或前端协议。导入成功不等于所有扩展能力都已支持；请以兼容报告、能力面板状态和真实运行证据为准。

## 环境要求

| 组件 | 最低已验证版本 | 说明 |
| --- | --- | --- |
| Node.js | `22.19.0` | 同时验证通过 `24.13.1`；推荐使用当前 Node.js 24 LTS |
| DeepSeek Harness | `0.1.1-rc.2` | 插件当前锁定并验证的 DSH 基线 |

不建议使用更早的 DSH 版本。它们缺少本插件依赖的 Web、Session 或插件运行时接口。

## Windows 安装

DSH RolePlay 直接从 npm Registry 安装，不需要先下载 GitHub Release 或 `.tgz` 文件。

先安装固定版本的 DSH：

```powershell
npm install --global @deepseek-ai/dsh@0.1.1-rc.2
```

让 DSH 从 npm 安装 DSH RolePlay、加入标准 Web Profile，然后启动 Web：

```powershell
dsh plugin --profile web add @riemannre3/dsh-roleplay
dsh web
```

`dsh plugin add` 会调用 DSH 自己的包管理器完成 npm 下载和 Profile 注册。不要改成普通的 `npm install @riemannre3/dsh-roleplay`：普通 npm 安装只会下载依赖，不会把插件加入 DSH Web Profile。

打开终端中显示的本机地址（默认是 <http://127.0.0.1:3080>），在“设置 → 模型”中配置模型和 API Key，再进入“酒馆”导入 PNG/JSON 角色卡。

停止 DSH 时，回到运行 `dsh web` 的终端并按 `Ctrl+C`。

更新插件时，停止 DSH 后重新运行同一条安装命令，再启动 Web：

```powershell
dsh plugin --profile web add @riemannre3/dsh-roleplay
dsh web
```

## 开始使用

1. 打开 DSH Web，进入左侧“酒馆”。
2. 点击“导入”，选择 Tavern Character Card V2/V3 PNG 或 JSON。
3. 查看卡片的兼容状态、角色字段、世界书和可用开场。
4. 选择开场并创建新对话。
5. 在原生 Conversation 中游玩；需要排查上下文时，从右侧展开对应能力面板。

## 临时关闭与重新开启

打开“设置 → 插件 → 插件配置”，展开 **DSH RolePlay**，点击右侧复选框即可关闭或重新开启。

关闭是可逆的运行时卸载：酒馆侧栏、对话适配、输入区扩展、Host 路由、事件监听和运行时资源会被移除；角色卡与 Session 数据仍保存在当前 DSH Web Profile 中。重新开启后，插件会恢复这些界面和运行时能力。

## 从 Web Profile 移除

先停止正在运行的 DSH，再执行：

```powershell
dsh plugin --profile web remove @riemannre3/dsh-roleplay
```

这会从 Web Profile 移除 npm 包，不会主动删除插件已保存的角色卡和 Session。重新安装到同一个 Profile 后仍可恢复；不要为了卸载插件删除整个 DSH 数据目录。

GitHub Release 中的 `.tgz` 只用于离线安装或 npm Registry 暂时不可用时的故障备用，不是推荐安装方式。

## 从源码构建

仅在开发或本地修改插件时需要源码构建：

```powershell
git clone https://github.com/RiemannRe3/DSH-RolePlay.git
cd DSH-RolePlay
npm ci --legacy-peer-deps
npm run build
dsh plugin --profile web add .
dsh web
```

`npm run build` 会编译 Host 代码，并生成 DSH Web 加载的单文件 Client Bundle。修改源码后，重新执行构建和 `dsh plugin --profile web add .`，再重启 DSH。

## 截图与第三方内容

本 README 的 9 张原始实机截图使用了 Foreverse Team 发布的开源角色卡，以及基于其中《玄净》制作的 DSH 适配版：

- 来源：[foreverse-app/character-card-skills](https://github.com/foreverse-app/character-card-skills/tree/dab0da437810b2ea4b5eec414c10c8fa35e779f8)
- 固定版本：`dab0da437810b2ea4b5eec414c10c8fa35e779f8`
- 原作作者：Foreverse Team（[foreverse.app](https://foreverse.app/)）
- 原作内容许可：[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- 上游许可文件：[LICENSE-CONTENT](https://github.com/foreverse-app/character-card-skills/blob/dab0da437810b2ea4b5eec414c10c8fa35e779f8/LICENSE-CONTENT)
- 《玄净》适配与新封面：RiemannRe3；保留原作的两条开场与师徒修行核心，补写世界与玩家来处，重整时间线、持续状态、「云山长卷」和行动选择；新封面使用 OpenAI 图像生成工具制作
- 适配新增贡献许可：与原作内容一同按 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) 提供
- 截图过程：在隔离 Profile 中导入并渲染卡片，创建虚构 Persona 与一轮演示 Session，再以浏览器默认视口捕获页面
- 分发边界：第三方角色卡原文件不随 npm 包、GitHub Release 或本仓库公开快照分发

Foreverse Team 未参与 DSH RolePlay 的开发，也不代表其认可或为本项目背书。完整说明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

## 问题反馈

项目源码与问题反馈：[RiemannRe3/DSH-RolePlay](https://github.com/RiemannRe3/DSH-RolePlay)。

请勿在 Issue 中公开 API Key、Token、私有角色卡或完整 Session Log。兼容问题最好附上卡片规范版本、能力面板状态和经过脱敏的最小复现信息。

## License

DSH RolePlay 的第一方代码使用 [MIT License](LICENSE)。

README 截图中的 Foreverse 原作内容与原始封面依照上游 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) 使用；《玄净》适配新增内容与 RiemannRe3 制作的新封面也按 CC BY 4.0 提供。详见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

# DSH RolePlay

[![npm version](https://img.shields.io/npm/v/@riemannre3/dsh-roleplay.svg)](https://www.npmjs.com/package/@riemannre3/dsh-roleplay)
[![GitHub Release](https://img.shields.io/github/v/release/RiemannRe3/DSH-RolePlay)](https://github.com/RiemannRe3/DSH-RolePlay/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

DSH RolePlay 是 DeepSeek Harness 的 Tavern 角色卡插件。导入 Character Card V2/V3 PNG 或 JSON，选一个开场，就能开始玩。

角色卡 · 多开场 · 世界书 · 预设 · Persona · Regex · EJS / iframe · MVU

## Windows 安装

> [!TIP]
> **三条命令，装好就能开始。**
>
> ```powershell
> npm install --global @deepseek-ai/dsh@0.1.1-rc.2
> dsh plugin --profile web add @riemannre3/dsh-roleplay
> dsh web
> ```
>
> 打开终端中显示的本机地址，在“设置 → 模型”中配置模型和 API Key，然后进入“酒馆”导入角色卡。
>
> [下载最新版](https://github.com/RiemannRe3/DSH-RolePlay/releases/latest) · [npm](https://www.npmjs.com/package/@riemannre3/dsh-roleplay) · [问题反馈](https://github.com/RiemannRe3/DSH-RolePlay/issues)

![玄净在 DSH RolePlay 中的卡库、修行札和角色详情](https://raw.githubusercontent.com/RiemannRe3/DSH-RolePlay/v0.1.5/media/readme/10-hero.png)

卡库、对话、卡内界面和角色详情可以同时展开。

## 最近完成的卡

### 玄净 · 云山修行札

![玄净在真实一轮对话后的修行札和前端运行状态](https://raw.githubusercontent.com/RiemannRe3/DSH-RolePlay/v0.1.5/media/readme/11-xuanjing-live.png)

修行状态、人物关系和下一步行动会跟着对话更新。

### 苏念念 · 银杏道

![苏念念的状态页和行动选项](https://raw.githubusercontent.com/RiemannRe3/DSH-RolePlay/v0.1.5/media/readme/12-suniannian.png)

轻量状态页保留在消息里，按钮可以直接接下一句。

### 顾清 · 大理寺案牍

![顾清的西市浮尸案案牍](https://raw.githubusercontent.com/RiemannRe3/DSH-RolePlay/v0.1.5/media/readme/13-guqing.png)

已确认事实、待验线索和时限写进同一份案牍。

三张卡均由 RiemannRe3 基于 Foreverse Team 的开源角色卡改作。原卡、修改说明和 CC BY 4.0 许可见 [内容与许可说明](THIRD_PARTY_NOTICES.md)。

## 世界书

![玄净角色卡的世界书条目](https://raw.githubusercontent.com/RiemannRe3/DSH-RolePlay/v0.1.5/media/readme/14-worldbook.png)

条目、触发词、插入位置和执行顺序都在面板里。

## 预设与本轮上下文

![对话补全预设编辑页](https://raw.githubusercontent.com/RiemannRe3/DSH-RolePlay/v0.1.5/media/readme/15-preset.png)

![一次真实请求的上下文装配结果](https://raw.githubusercontent.com/RiemannRe3/DSH-RolePlay/v0.1.5/media/readme/16-context.png)

预设按槽位编辑；每次请求都能查看来源、角色、Token 和实际内容。

## 卡内前端

![玄净的消息界面与前端运行面板](https://raw.githubusercontent.com/RiemannRe3/DSH-RolePlay/v0.1.5/media/readme/17-frontend.png)

消息内可以放状态页、按钮和 iframe。右侧面板会显示脚本、运行事件、MVU 状态与错误。

## 开始使用

1. 打开 DSH Web，进入“酒馆”。
2. 导入角色卡 PNG 或 JSON。
3. 选择开场，创建对话。
4. 从右侧打开世界书、预设、Regex、前端、卡片或 Persona。

<details>
<summary>更新、卸载、离线安装与源码构建</summary>

### 更新

```powershell
dsh plugin --profile web add @riemannre3/dsh-roleplay
dsh web
```

### 卸载

```powershell
dsh plugin --profile web remove @riemannre3/dsh-roleplay
```

### 离线安装

从 [Releases](https://github.com/RiemannRe3/DSH-RolePlay/releases/latest) 下载 `.tgz` 文件：

```powershell
dsh plugin --profile web add C:\Downloads\dsh-roleplay-<version>.tgz
dsh web
```

### 源码构建

```powershell
git clone https://github.com/RiemannRe3/DSH-RolePlay.git
cd DSH-RolePlay
npm ci --legacy-peer-deps
npm run build
dsh plugin --profile web add .
dsh web
```

</details>

## License

插件代码使用 [MIT License](LICENSE)。演示角色卡及截图中的卡片内容按 CC BY 4.0 使用，详见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

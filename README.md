# DSH RolePlay

> 在 DeepSeek Harness 的原生 Session 里游玩 Tavern 角色卡。

`dsh-roleplay` 是一个 DSH 插件，支持导入 Tavern Character Card V2/V3，并在原生 Conversation 中开始游玩。

![DSH RolePlay 中的 Tavern 卡片与原生 Conversation](demo.png)

## Windows 安装

需要 Node.js `>=24.13.1 <25`。先从 [Releases](https://github.com/RiemannRe3/DSH-RolePlay/releases) 下载最新的 `dsh-roleplay-*.tgz`，然后打开 PowerShell：

```powershell
npm install --global pnpm@11

$pluginPath = 'C:\Downloads\dsh-roleplay-<version>.tgz'
npx @deepseek-ai/dsh@0.1.1-rc.2 plugin --profile web add $pluginPath
npx @deepseek-ai/dsh@0.1.1-rc.2 web
```

启动后打开 <http://127.0.0.1:3080>，在 DSH 设置中配置模型和 API Key，再进入“酒馆”导入 PNG/JSON 角色卡。

停止运行：在 PowerShell 中按 `Ctrl+C`。

如果使用 DSH Desktop，请在托盘菜单打开 **DSH Terminal**，执行同样的安装命令，然后重启 DSH Desktop。

## License

第一方代码使用 [MIT License](LICENSE)。

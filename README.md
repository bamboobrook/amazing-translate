# Amazing Translate

Amazing Translate 是一个自用优先、可发布的 Chrome Manifest V3 网页翻译插件。它提供手动触发的网页段落翻译、划词翻译、输入框翻译、Chrome 原生侧边栏控制台和页面内快捷控制面板，支持 DeepSeek 与智谱 GLM Coding Plan。项目是独立实现，不复用或复制第三方插件的代码、素材或品牌。

## 功能

- 手动翻译当前网页正文，并在原文下方逐段显示译文。
- 工具栏图标打开 Chrome 侧边栏，侧边栏可控制翻译、恢复、语言、模型和 API Key。
- 页面右下角提供紧凑快捷面板，可翻译网页、划词、输入框和恢复原文。
- 右键菜单翻译选中文本。
- 输入框翻译先展示预览，用户确认后再替换。
- 可配置源语言、目标语言、显示模式、批量字符上限、缓存开关。
- API Key 仅保存在 Chrome 扩展本地存储中，不写入仓库，也不注入网页。

## 开发与构建

```bash
npm install
npm run typecheck
npm test
npm run build
```

构建产物位于 `dist/`，Chrome 加载 unpacked extension 时请选择这个目录。

生成 Chrome Web Store 可上传的 ZIP 包：

```bash
npm run package
```

打包文件会生成到 `release/amazing-translate-0.1.0.zip`。

## 在 Chrome 中加载

1. 打开 `chrome://extensions`。
2. 开启右上角 Developer mode。
3. 点击 Load unpacked。
4. 选择本项目的 `dist/` 目录。
5. 打开普通网页，点击 Amazing Translate 工具栏图标，Chrome 会打开侧边栏控制台。

## 配置 API Key

可以在 Chrome 侧边栏中直接配置，也可以打开 Options 页面做完整配置。

### DeepSeek

- 服务商选择 DeepSeek。
- Base URL 默认 `https://api.deepseek.com`。
- 默认模型为 `deepseek-v4-flash`。
- 填入 DeepSeek API Key 后点击“测试连接”。

### 智谱 GLM Coding

- 服务商选择“智谱 GLM Coding”。
- Base URL 默认 `https://open.bigmodel.cn/api/coding/paas/v4`。
- 默认模型为 `glm-5.2`。
- 填入 API Key 后点击“测试连接”。

GLM Coding Plan 官方定位是 coding 工具接入端点。如果账号、模型或端点策略限制浏览器插件调用，插件会显示接口返回的错误信息。

## 使用方式

- 网页翻译：打开网页后点击工具栏图标，在侧边栏点击“翻译当前页”，或使用页面右下角的“翻译网页”。
- 恢复原文：点击侧边栏或页面右下角的“恢复原文”。
- 划词翻译：选中文本后右键，选择“Amazing Translate：翻译选中文本”；也可以用侧边栏或页面快捷面板触发。
- 输入框翻译：把光标放在文本框中，右键选择“Amazing Translate：翻译输入内容”；插件会先显示译文预览，点击“替换为译文”后才覆盖文本。
- 语言切换：在侧边栏选择源语言、目标语言和显示模式，会自动保存。

## Demo 页面

本仓库包含 `demo/index.html`。加载扩展后打开该页面，可以验证网页翻译、划词翻译和输入框翻译流程。

## 发布方式

### Chrome Web Store

可以发布到 Chrome Web Store，推荐给普通用户使用这种方式。发布前需要：

- 注册 Chrome Web Store Developer 账号并支付一次性注册费。
- 运行 `npm run package` 生成 ZIP 包。
- 在 Chrome Developer Dashboard 新建 item，上传 `release/amazing-translate-0.1.0.zip`。
- 填写 Store Listing、Privacy、Distribution、Test instructions。
- 提交审核；审核通过后可自动发布或手动发布。

因为插件会把用户手动触发的网页文本发送给 DeepSeek 或智谱，商店隐私页和隐私政策必须说明：收集哪些文本、发送给哪些服务商、API Key 如何保存、缓存如何保存和清除。可以从 `docs/privacy-policy-template.md` 开始整理正式隐私政策。

### 其他分发方式

- GitHub Releases：可以上传 ZIP 包，适合开发者或内测用户手动下载后加载 unpacked extension。
- 企业分发：公司或团队可通过 Chrome Enterprise policy 管理安装。
- 直接 CRX/ZIP 分发：面向普通 Chrome 用户体验较差，消费者版 Chrome 对非商店扩展安装限制很多，不建议作为主要渠道。
- Edge Add-ons：代码大体可复用，但需要单独账号、商店资料和兼容测试。

## 图标

图标为本项目原创设计，源文件和 PNG 尺寸位于 `public/icons/`。Manifest 使用 `16`、`32`、`48`、`128` 四个尺寸，`256` 和 `1024` 可用于商店素材或后续宣传图。

## 常见问题

- `API Key is missing`：打开侧边栏或设置页填写当前服务商的 API Key。
- `authentication failed`：检查 API Key、账号权限和 Base URL。
- `rate limit reached`：稍后重试，或降低批量字符上限。
- 页面没有变化：当前页面可能是 Chrome 内置页面、扩展商店页面或没有可翻译正文块。
- 工具栏点击没有打开侧边栏：请确认 Chrome 版本支持 Side Panel API，且扩展已重新加载最新 `dist/`。

## 隐私边界

插件只在用户手动触发时发送文本到当前配置的模型服务商。content script 不读取 API Key，网页本身也无法访问 API Key。翻译缓存保存在 Chrome 扩展本地存储中，可以在侧边栏或设置页清空。

# Amazing Translate

Amazing Translate 是一个自用 Chrome Manifest V3 网页翻译插件。它提供手动触发的网页段落翻译、划词翻译和输入框翻译，支持 DeepSeek 与智谱 GLM Coding Plan。项目是独立实现，不复用或复制第三方插件的代码、素材或品牌。

## 功能

- 手动翻译当前网页正文，并在原文下方显示译文。
- 一键恢复原文。
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

## 在 Chrome 中加载

1. 打开 `chrome://extensions`。
2. 开启右上角 Developer mode。
3. 点击 Load unpacked。
4. 选择本项目的 `dist/` 目录。
5. 打开扩展详情页，可按需固定到工具栏。

## 配置 API Key

点击插件弹窗中的“设置”，或在扩展详情页打开 Options。

### DeepSeek

- 服务商选择 DeepSeek。
- Base URL 默认 `https://api.deepseek.com`。
- 默认模型为 `deepseek-v4-flash`。
- 填入 DeepSeek API Key 后点击“测试当前服务商”。

### 智谱 GLM Coding

- 服务商选择“智谱 GLM Coding”。
- Base URL 默认 `https://open.bigmodel.cn/api/coding/paas/v4`。
- 默认模型为 `glm-5.2`。
- 填入 API Key 后点击“测试当前服务商”。

GLM Coding Plan 官方定位是 coding 工具接入端点。如果账号、模型或端点策略限制浏览器插件调用，插件会显示接口返回的错误信息。

## 使用方式

- 网页翻译：打开网页后点击插件弹窗中的“翻译当前页”，或使用页面右下角的“翻译”按钮。
- 恢复原文：点击插件弹窗或页面右下角的“恢复”。
- 划词翻译：选中文本后右键，选择“Amazing Translate：翻译选中文本”。
- 输入框翻译：把光标放在文本框中，右键选择“Amazing Translate：翻译输入内容”；插件会先显示译文预览，点击“替换为译文”后才覆盖文本。

## Demo 页面

本仓库包含 `demo/index.html`。加载扩展后打开该页面，可以验证网页翻译、划词翻译和输入框翻译流程。

## 常见问题

- `API Key is missing`：打开设置页填写当前服务商的 API Key。
- `authentication failed`：检查 API Key、账号权限和 Base URL。
- `rate limit reached`：稍后重试，或降低批量字符上限。
- 页面没有变化：当前页面可能是 Chrome 内置页面、扩展商店页面或没有可翻译正文块。

## 隐私边界

插件只在用户手动触发时发送文本到当前配置的模型服务商。content script 不读取 API Key，网页本身也无法访问 API Key。翻译缓存保存在 Chrome 扩展本地存储中，可以在设置页清空。

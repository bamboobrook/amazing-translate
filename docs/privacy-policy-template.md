# Amazing Translate Privacy Policy Template

> This is a starting template for a Chrome Web Store submission. Review and adapt it before publishing.

## Single Purpose

Amazing Translate provides user-triggered web page translation, selected text translation, and editable text translation in Chrome.

## Data Processed

When the user manually starts a translation, the extension reads the selected text, editable text, or visible page text blocks needed for translation. The extension does not run background translation without user action.

## Data Sharing

Translation text is sent to the provider selected by the user:

- DeepSeek API, when DeepSeek is selected.
- Zhipu GLM Coding API, when GLM Coding is selected.

The extension does not sell user data and does not share translation text with any other service controlled by the extension developer.

## API Keys

Provider API keys are stored in Chrome extension storage on the user's device. They are not committed to the source repository, injected into web pages, or printed to logs by the extension.

## Local Cache

If local cache is enabled, translated text is stored in Chrome extension storage to reduce repeated API calls. Users can clear this cache from the extension side panel or options page.

## User Controls

Users can change providers, update API keys, disable cache, clear cache, and uninstall the extension at any time through Chrome extension settings.

## Contact

Add a support email or website before publishing.

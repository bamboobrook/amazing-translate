# Chrome Web Store Listing Draft

## Name

Amazing Translate

## Short Description

User-triggered bilingual web translation with DeepSeek and GLM Coding Plan.

## Detailed Description

Amazing Translate helps you translate web pages paragraph by paragraph, translate selected text, and preview translations for input boxes before replacing text. It opens as a Chrome side panel so language, provider, and display controls stay close to the page you are reading.

Key features:

- Translate visible page text and show each translation below its source paragraph.
- Translate selected text from the context menu or side panel.
- Translate textarea, input, and contenteditable text with manual replacement.
- Configure DeepSeek or Zhipu GLM Coding providers.
- Store API keys locally in Chrome extension storage.
- Clear local translation cache at any time.

The extension is an independent implementation and is not affiliated with Immersive Translate, DeepSeek, or Zhipu.

## Suggested Test Instructions

1. Install the extension.
2. Open the side panel from the toolbar icon.
3. Enter a test DeepSeek or GLM API key.
4. Open `demo/index.html` or any English article page.
5. Click Translate current page and verify bilingual paragraph rendering.
6. Select text and trigger selected text translation.
7. Focus a text input and trigger editable text translation.

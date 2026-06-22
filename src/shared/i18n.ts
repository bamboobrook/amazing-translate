import { LANGUAGE_OPTIONS } from "./defaults";
import type { ProviderId } from "./types";

type LanguageOptionValue = (typeof LANGUAGE_OPTIONS)[number][0];
export type UiLanguage = "zh-Hans" | "zh-Hant" | "en" | "ja" | "ko" | "fr" | "de" | "es" | "ru";

const EN = {
  optionsPageTitle: "Amazing Translate Settings",
  settingsTitle: "Translation settings",
  saveSettings: "Save settings",
  providerSection: "Provider",
  defaultProvider: "Default provider",
  maxBatchChars: "Batch character limit",
  model: "Model",
  languageAndDisplay: "Language and display",
  sourceLanguage: "Source language",
  targetLanguage: "Target language",
  displayMode: "Display mode",
  displayBelowLong: "Show translation below original",
  displayReplaceLong: "Show translation only, restorable",
  cacheEnabled: "Enable local translation cache",
  testCurrentProvider: "Test current provider",
  clearCache: "Clear cache",
  settingsSaved: "Settings saved",
  connectionSuccess: "Connection successful",
  cacheCleared: "Cleared {count} cached items",
  webTranslate: "Web translation",
  provider: "Provider",
  language: "Language",
  translateCurrentPage: "Translate current page",
  restoreOriginal: "Restore original",
  settings: "Settings",
  translateCommandSent: "Translation command sent",
  restoreCommandSent: "Restore command sent",
  translationConsole: "Translation console",
  webActions: "Page actions",
  selectionTranslate: "Selection translation",
  editableTranslate: "Input translation",
  belowOriginal: "Below original",
  replaceOriginal: "Replace original",
  modelConfig: "Model configuration",
  showHideApiKey: "Show or hide API Key",
  advanced: "Advanced",
  localCache: "Enable local cache",
  save: "Save",
  testConnection: "Test connection",
  fullSettings: "Full settings",
  ready: "Ready",
  providerSwitched: "Provider switched",
  languagesUpdated: "Language updated",
  displayModeUpdated: "Display mode updated",
  startedTranslatingPage: "Started translating current page",
  restoredOriginal: "Original restored",
  selectionCommandSent: "Selection translation sent",
  editableCommandSent: "Input translation sent",
  glmProvider: "Zhipu GLM Coding"
} as const;

export type UiTextKey = keyof typeof EN;

const TEXT: Record<UiLanguage, Partial<Record<UiTextKey, string>>> = {
  en: EN,
  "zh-Hans": {
    optionsPageTitle: "Amazing Translate 设置",
    settingsTitle: "翻译设置",
    saveSettings: "保存设置",
    providerSection: "服务商",
    defaultProvider: "默认服务商",
    maxBatchChars: "批量字符上限",
    model: "模型",
    languageAndDisplay: "语言与显示",
    sourceLanguage: "源语言",
    targetLanguage: "目标语言",
    displayMode: "显示模式",
    displayBelowLong: "原文下方显示译文",
    displayReplaceLong: "仅显示译文，可恢复",
    cacheEnabled: "启用本地翻译缓存",
    testCurrentProvider: "测试当前服务商",
    clearCache: "清空缓存",
    settingsSaved: "设置已保存",
    connectionSuccess: "连接成功",
    cacheCleared: "已清空 {count} 条缓存",
    webTranslate: "网页翻译",
    provider: "服务商",
    language: "语言",
    translateCurrentPage: "翻译当前页",
    restoreOriginal: "恢复原文",
    settings: "设置",
    translateCommandSent: "已发送翻译指令",
    restoreCommandSent: "已发送恢复指令",
    translationConsole: "翻译控制台",
    webActions: "网页操作",
    selectionTranslate: "划词翻译",
    editableTranslate: "输入框翻译",
    belowOriginal: "原文下方",
    replaceOriginal: "替换原文",
    modelConfig: "模型配置",
    showHideApiKey: "显示或隐藏 API Key",
    advanced: "高级",
    localCache: "启用本地缓存",
    save: "保存",
    testConnection: "测试连接",
    fullSettings: "完整设置",
    ready: "就绪",
    providerSwitched: "已切换服务商",
    languagesUpdated: "语言已更新",
    displayModeUpdated: "显示模式已更新",
    startedTranslatingPage: "已开始翻译当前页",
    restoredOriginal: "已恢复原文",
    selectionCommandSent: "已发送划词翻译",
    editableCommandSent: "已发送输入框翻译",
    glmProvider: "智谱 GLM Coding"
  },
  "zh-Hant": {
    optionsPageTitle: "Amazing Translate 設定",
    settingsTitle: "翻譯設定",
    saveSettings: "儲存設定",
    providerSection: "服務商",
    defaultProvider: "預設服務商",
    maxBatchChars: "批次字元上限",
    model: "模型",
    languageAndDisplay: "語言與顯示",
    sourceLanguage: "來源語言",
    targetLanguage: "目標語言",
    displayMode: "顯示模式",
    displayBelowLong: "在原文下方顯示譯文",
    displayReplaceLong: "僅顯示譯文，可還原",
    cacheEnabled: "啟用本機翻譯快取",
    testCurrentProvider: "測試目前服務商",
    clearCache: "清空快取",
    settingsSaved: "設定已儲存",
    connectionSuccess: "連線成功",
    cacheCleared: "已清空 {count} 筆快取",
    webTranslate: "網頁翻譯",
    provider: "服務商",
    language: "語言",
    translateCurrentPage: "翻譯目前頁面",
    restoreOriginal: "還原原文",
    settings: "設定",
    translateCommandSent: "已送出翻譯指令",
    restoreCommandSent: "已送出還原指令",
    translationConsole: "翻譯控制台",
    webActions: "網頁操作",
    selectionTranslate: "劃詞翻譯",
    editableTranslate: "輸入框翻譯",
    belowOriginal: "原文下方",
    replaceOriginal: "替換原文",
    modelConfig: "模型設定",
    showHideApiKey: "顯示或隱藏 API Key",
    advanced: "進階",
    localCache: "啟用本機快取",
    save: "儲存",
    testConnection: "測試連線",
    fullSettings: "完整設定",
    ready: "就緒",
    providerSwitched: "已切換服務商",
    languagesUpdated: "語言已更新",
    displayModeUpdated: "顯示模式已更新",
    startedTranslatingPage: "已開始翻譯目前頁面",
    restoredOriginal: "已還原原文",
    selectionCommandSent: "已送出劃詞翻譯",
    editableCommandSent: "已送出輸入框翻譯",
    glmProvider: "智譜 GLM Coding"
  },
  ja: {
    optionsPageTitle: "Amazing Translate 設定",
    settingsTitle: "翻訳設定",
    saveSettings: "設定を保存",
    providerSection: "プロバイダー",
    defaultProvider: "既定のプロバイダー",
    maxBatchChars: "一括文字数の上限",
    model: "モデル",
    languageAndDisplay: "言語と表示",
    sourceLanguage: "元の言語",
    targetLanguage: "翻訳先言語",
    displayMode: "表示モード",
    displayBelowLong: "原文の下に翻訳を表示",
    displayReplaceLong: "翻訳のみ表示、復元可能",
    cacheEnabled: "ローカル翻訳キャッシュを有効化",
    testCurrentProvider: "現在のプロバイダーをテスト",
    clearCache: "キャッシュを消去",
    settingsSaved: "設定を保存しました",
    connectionSuccess: "接続しました",
    cacheCleared: "キャッシュを {count} 件消去しました",
    webTranslate: "Web 翻訳",
    provider: "プロバイダー",
    language: "言語",
    translateCurrentPage: "現在のページを翻訳",
    restoreOriginal: "原文を復元",
    settings: "設定",
    translateCommandSent: "翻訳コマンドを送信しました",
    restoreCommandSent: "復元コマンドを送信しました",
    translationConsole: "翻訳コンソール",
    webActions: "ページ操作",
    selectionTranslate: "選択範囲を翻訳",
    editableTranslate: "入力欄を翻訳",
    belowOriginal: "原文の下",
    replaceOriginal: "原文を置換",
    modelConfig: "モデル設定",
    showHideApiKey: "API Key を表示または非表示",
    advanced: "詳細",
    localCache: "ローカルキャッシュを有効化",
    save: "保存",
    testConnection: "接続テスト",
    fullSettings: "すべての設定",
    ready: "準備完了",
    providerSwitched: "プロバイダーを切り替えました",
    languagesUpdated: "言語を更新しました",
    displayModeUpdated: "表示モードを更新しました",
    startedTranslatingPage: "現在のページの翻訳を開始しました",
    restoredOriginal: "原文を復元しました",
    selectionCommandSent: "選択範囲の翻訳を送信しました",
    editableCommandSent: "入力欄の翻訳を送信しました",
    glmProvider: "Zhipu GLM Coding"
  },
  ko: {
    optionsPageTitle: "Amazing Translate 설정",
    settingsTitle: "번역 설정",
    saveSettings: "설정 저장",
    providerSection: "제공자",
    defaultProvider: "기본 제공자",
    maxBatchChars: "일괄 문자 제한",
    model: "모델",
    languageAndDisplay: "언어 및 표시",
    sourceLanguage: "원본 언어",
    targetLanguage: "대상 언어",
    displayMode: "표시 모드",
    displayBelowLong: "원문 아래에 번역 표시",
    displayReplaceLong: "번역만 표시, 복원 가능",
    cacheEnabled: "로컬 번역 캐시 사용",
    testCurrentProvider: "현재 제공자 테스트",
    clearCache: "캐시 지우기",
    settingsSaved: "설정이 저장되었습니다",
    connectionSuccess: "연결 성공",
    cacheCleared: "캐시 {count}개를 지웠습니다",
    webTranslate: "웹 번역",
    provider: "제공자",
    language: "언어",
    translateCurrentPage: "현재 페이지 번역",
    restoreOriginal: "원문 복원",
    settings: "설정",
    translateCommandSent: "번역 명령을 보냈습니다",
    restoreCommandSent: "복원 명령을 보냈습니다",
    translationConsole: "번역 콘솔",
    webActions: "페이지 작업",
    selectionTranslate: "선택 번역",
    editableTranslate: "입력 번역",
    belowOriginal: "원문 아래",
    replaceOriginal: "원문 대체",
    modelConfig: "모델 설정",
    showHideApiKey: "API Key 표시 또는 숨기기",
    advanced: "고급",
    localCache: "로컬 캐시 사용",
    save: "저장",
    testConnection: "연결 테스트",
    fullSettings: "전체 설정",
    ready: "준비됨",
    providerSwitched: "제공자를 전환했습니다",
    languagesUpdated: "언어가 업데이트되었습니다",
    displayModeUpdated: "표시 모드가 업데이트되었습니다",
    startedTranslatingPage: "현재 페이지 번역을 시작했습니다",
    restoredOriginal: "원문을 복원했습니다",
    selectionCommandSent: "선택 번역을 보냈습니다",
    editableCommandSent: "입력 번역을 보냈습니다",
    glmProvider: "Zhipu GLM Coding"
  },
  fr: {
    optionsPageTitle: "Paramètres Amazing Translate",
    settingsTitle: "Paramètres de traduction",
    saveSettings: "Enregistrer",
    providerSection: "Fournisseur",
    sourceLanguage: "Langue source",
    targetLanguage: "Langue cible",
    translateCurrentPage: "Traduire la page actuelle",
    restoreOriginal: "Restaurer l'original",
    settings: "Paramètres",
    ready: "Prêt",
    connectionSuccess: "Connexion réussie"
  },
  de: {
    optionsPageTitle: "Amazing Translate Einstellungen",
    settingsTitle: "Übersetzungseinstellungen",
    saveSettings: "Einstellungen speichern",
    providerSection: "Anbieter",
    sourceLanguage: "Ausgangssprache",
    targetLanguage: "Zielsprache",
    translateCurrentPage: "Aktuelle Seite übersetzen",
    restoreOriginal: "Original wiederherstellen",
    settings: "Einstellungen",
    ready: "Bereit",
    connectionSuccess: "Verbindung erfolgreich"
  },
  es: {
    optionsPageTitle: "Configuración de Amazing Translate",
    settingsTitle: "Configuración de traducción",
    saveSettings: "Guardar configuración",
    providerSection: "Proveedor",
    sourceLanguage: "Idioma de origen",
    targetLanguage: "Idioma de destino",
    translateCurrentPage: "Traducir página actual",
    restoreOriginal: "Restaurar original",
    settings: "Configuración",
    ready: "Listo",
    connectionSuccess: "Conexión correcta"
  },
  ru: {
    optionsPageTitle: "Настройки Amazing Translate",
    settingsTitle: "Настройки перевода",
    saveSettings: "Сохранить настройки",
    providerSection: "Провайдер",
    sourceLanguage: "Исходный язык",
    targetLanguage: "Целевой язык",
    translateCurrentPage: "Перевести текущую страницу",
    restoreOriginal: "Восстановить оригинал",
    settings: "Настройки",
    ready: "Готово",
    connectionSuccess: "Подключение успешно"
  }
};

const LANGUAGE_LABELS: Record<UiLanguage, Record<LanguageOptionValue, string>> = {
  en: { auto: "Auto detect", "zh-Hans": "Simplified Chinese", "zh-Hant": "Traditional Chinese", en: "English", ja: "Japanese", ko: "Korean", fr: "French", de: "German", es: "Spanish", ru: "Russian" },
  "zh-Hans": { auto: "自动识别", "zh-Hans": "简体中文", "zh-Hant": "繁体中文", en: "英语", ja: "日语", ko: "韩语", fr: "法语", de: "德语", es: "西班牙语", ru: "俄语" },
  "zh-Hant": { auto: "自動識別", "zh-Hans": "簡體中文", "zh-Hant": "繁體中文", en: "英文", ja: "日文", ko: "韓文", fr: "法文", de: "德文", es: "西班牙文", ru: "俄文" },
  ja: { auto: "自動検出", "zh-Hans": "簡体字中国語", "zh-Hant": "繁体字中国語", en: "英語", ja: "日本語", ko: "韓国語", fr: "フランス語", de: "ドイツ語", es: "スペイン語", ru: "ロシア語" },
  ko: { auto: "자동 감지", "zh-Hans": "중국어 간체", "zh-Hant": "중국어 번체", en: "영어", ja: "일본어", ko: "한국어", fr: "프랑스어", de: "독일어", es: "스페인어", ru: "러시아어" },
  fr: { auto: "Détection auto", "zh-Hans": "Chinois simplifié", "zh-Hant": "Chinois traditionnel", en: "Anglais", ja: "Japonais", ko: "Coréen", fr: "Français", de: "Allemand", es: "Espagnol", ru: "Russe" },
  de: { auto: "Automatisch erkennen", "zh-Hans": "Chinesisch vereinfacht", "zh-Hant": "Chinesisch traditionell", en: "Englisch", ja: "Japanisch", ko: "Koreanisch", fr: "Französisch", de: "Deutsch", es: "Spanisch", ru: "Russisch" },
  es: { auto: "Detectar automáticamente", "zh-Hans": "Chino simplificado", "zh-Hant": "Chino tradicional", en: "Inglés", ja: "Japonés", ko: "Coreano", fr: "Francés", de: "Alemán", es: "Español", ru: "Ruso" },
  ru: { auto: "Автоопределение", "zh-Hans": "Китайский упрощенный", "zh-Hant": "Китайский традиционный", en: "Английский", ja: "Японский", ko: "Корейский", fr: "Французский", de: "Немецкий", es: "Испанский", ru: "Русский" }
};

export const uiLanguageForTarget = (targetLanguage = "zh-Hans"): UiLanguage => {
  const language = targetLanguage.toLowerCase();
  if (language.startsWith("zh-hant") || language.startsWith("zh-tw") || language.startsWith("zh-hk")) return "zh-Hant";
  if (language.startsWith("zh")) return "zh-Hans";
  if (language.startsWith("ja")) return "ja";
  if (language.startsWith("ko")) return "ko";
  if (language.startsWith("fr")) return "fr";
  if (language.startsWith("de")) return "de";
  if (language.startsWith("es")) return "es";
  if (language.startsWith("ru")) return "ru";
  return "en";
};

export const t = (targetLanguage: string | undefined, key: UiTextKey, values: Record<string, string | number> = {}): string => {
  const language = uiLanguageForTarget(targetLanguage);
  let text = TEXT[language][key] || EN[key];
  for (const [name, value] of Object.entries(values)) text = text.replaceAll(`{${name}}`, String(value));
  return text;
};

export const languageLabel = (value: string, targetLanguage = "zh-Hans"): string => {
  const language = uiLanguageForTarget(targetLanguage);
  return LANGUAGE_LABELS[language][value as LanguageOptionValue] || value;
};

export const providerLabel = (value: ProviderId, targetLanguage = "zh-Hans"): string =>
  value === "deepseek" ? "DeepSeek" : t(targetLanguage, "glmProvider");

export const applyI18n = (root: ParentNode, targetLanguage = "zh-Hans"): void => {
  root.querySelectorAll<HTMLElement>("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n as UiTextKey | undefined;
    if (key) element.textContent = t(targetLanguage, key);
  });

  root.querySelectorAll<HTMLElement>("[data-i18n-title]").forEach((element) => {
    const key = element.dataset.i18nTitle as UiTextKey | undefined;
    if (key) element.setAttribute("title", t(targetLanguage, key));
  });

  root.querySelectorAll<HTMLElement>("[data-i18n-aria-label]").forEach((element) => {
    const key = element.dataset.i18nAriaLabel as UiTextKey | undefined;
    if (key) element.setAttribute("aria-label", t(targetLanguage, key));
  });

  if (root.nodeType === 9) {
    const documentRoot = root as Document;
    documentRoot.documentElement.lang = uiLanguageForTarget(targetLanguage);
  }
};

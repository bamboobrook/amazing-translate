export type ProviderId = "deepseek" | "glm";

export type DisplayMode = "below" | "replace";

export interface ProviderConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface ExtensionSettings {
  provider: ProviderId;
  sourceLanguage: string;
  targetLanguage: string;
  displayMode: DisplayMode;
  maxBatchChars: number;
  cacheEnabled: boolean;
  providers: Record<ProviderId, ProviderConfig>;
}

export interface TextBlock {
  id: string;
  text: string;
}

export interface TranslationResult {
  id: string;
  text: string;
}

export interface TranslateRequest {
  type: "TRANSLATE_BATCH";
  blocks: TextBlock[];
}

export interface TranslateResponse {
  translations: TranslationResult[];
  cached: number;
}

export interface TestProviderRequest {
  type: "TEST_PROVIDER";
}

export interface SettingsRequest {
  type: "GET_SETTINGS" | "SAVE_SETTINGS";
  settings?: ExtensionSettings;
}

export interface ClearCacheRequest {
  type: "CLEAR_CACHE";
}

export interface PageCommandRequest {
  type: "TRANSLATE_PAGE" | "RESTORE_PAGE" | "TRANSLATE_SELECTION" | "TRANSLATE_EDITABLE";
}

export type RuntimeRequest =
  | TranslateRequest
  | TestProviderRequest
  | SettingsRequest
  | ClearCacheRequest
  | PageCommandRequest;

export interface RuntimeOk<T = unknown> {
  ok: true;
  data: T;
}

export interface RuntimeErr {
  ok: false;
  error: string;
}

export type RuntimeResponse<T = unknown> = RuntimeOk<T> | RuntimeErr;

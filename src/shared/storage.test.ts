import { webcrypto } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS } from "./defaults";
import { makeCacheKey, mergeSettings } from "./storage";

describe("mergeSettings", () => {
  it("keeps default provider details when partial settings are stored", () => {
    const merged = mergeSettings({ provider: "glm", providers: { glm: { apiKey: "key", model: "custom", baseUrl: "https://example.test" } } } as any);
    expect(merged.provider).toBe("glm");
    expect(merged.providers.deepseek.model).toBe(DEFAULT_SETTINGS.providers.deepseek.model);
    expect(merged.providers.glm.apiKey).toBe("key");
  });
});

describe("makeCacheKey", () => {
  it("changes when target language changes", async () => {
    const originalCrypto = globalThis.crypto;
    if (!globalThis.crypto?.subtle) vi.stubGlobal("crypto", webcrypto);
    const one = await makeCacheKey("deepseek", "m", "auto", "zh-Hans", "hello");
    const two = await makeCacheKey("deepseek", "m", "auto", "ja", "hello");
    expect(one).not.toBe(two);
    vi.stubGlobal("crypto", originalCrypto);
  });
});

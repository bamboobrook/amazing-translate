import { describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS } from "../shared/defaults";
import { testProvider, translateBatch } from "./provider";

describe("provider", () => {
  it("normalizes OpenAI-compatible JSON responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({ choices: [{ message: { content: JSON.stringify({ translations: [{ id: "a", text: "你好" }] }) } }] }),
          { status: 200 }
        )
      )
    );
    const settings = {
      ...DEFAULT_SETTINGS,
      providers: {
        ...DEFAULT_SETTINGS.providers,
        deepseek: { ...DEFAULT_SETTINGS.providers.deepseek, apiKey: "test" }
      }
    };
    await expect(translateBatch(settings, [{ id: "a", text: "hello" }], "en", "zh-Hans")).resolves.toEqual([
      { id: "a", text: "你好" }
    ]);
  });

  it("reports missing keys before calling fetch", async () => {
    await expect(testProvider(DEFAULT_SETTINGS)).rejects.toThrow(/API Key is missing/);
  });
});

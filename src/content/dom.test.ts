import { describe, expect, it } from "vitest";
import { collectPageBlocks, readEditableText, replaceEditableText } from "./dom";

describe("collectPageBlocks", () => {
  it("collects visible readable blocks and skips code and forms", () => {
    document.body.innerHTML = `
      <main>
        <p>This is a long enough paragraph that should be collected by the extension for translation.</p>
        <pre><code>This code block should never be translated automatically.</code></pre>
        <textarea>This text area should be handled by the editable workflow.</textarea>
        <p>short</p>
      </main>`;
    document.querySelectorAll("p").forEach((node) => {
      Object.defineProperty(node, "innerText", { configurable: true, value: node.textContent });
      node.getBoundingClientRect = () => ({ x: 0, y: 0, width: 400, height: 24, top: 0, right: 400, bottom: 24, left: 0, toJSON: () => ({}) });
    });
    const blocks = collectPageBlocks();
    expect(blocks).toHaveLength(1);
    expect(blocks[0].text).toContain("long enough paragraph");
  });
});

describe("editable helpers", () => {
  it("reads and replaces selected textarea text", () => {
    document.body.innerHTML = `<textarea id="target">Hello world from a browser extension.</textarea>`;
    const textarea = document.getElementById("target") as HTMLTextAreaElement;
    textarea.focus();
    textarea.setSelectionRange(0, 11);
    expect(readEditableText(textarea)).toBe("Hello world");
    replaceEditableText(textarea, "你好，世界");
    expect(textarea.value).toContain("你好，世界");
    expect(textarea.value).toContain("from a browser extension");
  });
});

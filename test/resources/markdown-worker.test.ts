import { expose } from "comlink";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { Api } from "../../src/resources/markdown-worker";

vi.mock("comlink", () => ({ expose: vi.fn() }));

let renderMarkdown: Api["renderMarkdown"];

const render = async (content: string) =>
  (await renderMarkdown(content, {})).join("");

beforeAll(async () => {
  await import("../../src/resources/markdown-worker");
  renderMarkdown = vi.mocked(expose).mock.calls[0][0].renderMarkdown;
});

describe("renderMarkdown", () => {
  describe("picture", () => {
    const picture = [
      "<picture>",
      '  <source media="(prefers-color-scheme: dark)" srcset="https://example.com/dark.jpg">',
      '  <img src="https://example.com/light.jpg" alt="Chart" width="800">',
      "</picture>",
    ].join("\n");

    it("renders picture and source elements", async () => {
      const html = await render(picture);
      expect(html).toContain("<picture>");
      expect(html).toContain("</picture>");
      expect(html).toContain(
        '<source media="(prefers-color-scheme: dark)" srcset="https://example.com/dark.jpg">'
      );
      expect(html).toContain('src="https://example.com/light.jpg"');
      expect(html).not.toContain("&lt;");
    });

    it("keeps type and sizes on source", async () => {
      const html = await render(
        '<picture><source type="image/webp" sizes="50vw" srcset="https://example.com/a.webp 1x, https://example.com/b.webp 2x"><img src="https://example.com/a.png"></picture>'
      );
      expect(html).toContain('type="image/webp"');
      expect(html).toContain('sizes="50vw"');
      expect(html).toContain(
        'srcset="https://example.com/a.webp 1x, https://example.com/b.webp 2x"'
      );
    });

    it("renders source inside video", async () => {
      const html = await render(
        '<video controls><source src="https://example.com/a.mp4" type="video/mp4"></video>'
      );
      expect(html).toContain(
        '<source src="https://example.com/a.mp4" type="video/mp4">'
      );
      expect(html).not.toContain("&lt;");
    });

    it.each([
      // eslint-disable-next-line no-script-url
      "javascript:alert(1)",
      "&#106;avascript:alert(1)",
      "https://example.com/a.jpg 1x, javascript:alert(1) 2x",
    ])("drops srcset with a disallowed URL: %s", async (srcset) => {
      const html = await render(
        `<picture><source srcset="${srcset}"><img src="https://example.com/a.png"></picture>`
      );
      expect(html).toContain("<source>");
      expect(html).not.toContain("srcset");
      expect(html).not.toContain("alert");
    });

    it("does not allow other attributes on source", async () => {
      const html = await render(
        '<picture><source srcset="https://example.com/a.jpg" onerror="alert(1)"></picture>'
      );
      expect(html).not.toContain("onerror");
    });
  });
});

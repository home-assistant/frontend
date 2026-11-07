import { expose } from "comlink";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { Api } from "../../src/resources/markdown-worker";

vi.mock("comlink", () => ({ expose: vi.fn() }));

let renderMarkdown: Api["renderMarkdown"];

const render = async (content: string, allowSvg = false) =>
  (await renderMarkdown(content, {}, { allowSvg })).join("");

// Parse HTML like the browser does, so tests see decoded attribute values
const parse = (html: string) => {
  const template = document.createElement("template");
  template.innerHTML = html;
  return template.content;
};

beforeAll(async () => {
  await import("../../src/resources/markdown-worker");
  renderMarkdown = vi.mocked(expose).mock.calls[0][0].renderMarkdown;
});

describe("renderMarkdown", () => {
  describe("picture", () => {
    it("renders picture and source elements", async () => {
      const html = await render(
        [
          "<picture>",
          '  <source media="(prefers-color-scheme: dark)" srcset="https://example.com/dark.jpg">',
          '  <img src="https://example.com/light.jpg" alt="Chart" width="800">',
          "</picture>",
        ].join("\n")
      );
      const source = parse(html).querySelector("picture > source");
      expect(source?.getAttribute("media")).toBe(
        "(prefers-color-scheme: dark)"
      );
      expect(source?.getAttribute("srcset")).toBe(
        "https://example.com/dark.jpg"
      );
      expect(
        parse(html).querySelector("picture > img")?.getAttribute("src")
      ).toBe("https://example.com/light.jpg");
      expect(html).not.toContain("&lt;");
    });

    it("keeps type and sizes on source", async () => {
      const source = parse(
        await render(
          '<picture><source type="image/webp" sizes="50vw" srcset="https://example.com/a.webp 1x, https://example.com/b.webp 2x"><img src="https://example.com/a.png"></picture>'
        )
      ).querySelector("picture > source");
      expect(source?.getAttribute("type")).toBe("image/webp");
      expect(source?.getAttribute("sizes")).toBe("50vw");
      expect(source?.getAttribute("srcset")).toBe(
        "https://example.com/a.webp 1x, https://example.com/b.webp 2x"
      );
    });

    it("does not allow other attributes on source", async () => {
      const source = parse(
        await render(
          '<picture><source srcset="https://example.com/a.jpg" onerror="alert(1)"></picture>'
        )
      ).querySelector("picture > source");
      expect(source?.getAttributeNames()).toEqual(["srcset"]);
    });
  });

  describe.each([false, true])("srcset (allowSvg: %s)", (allowSvg) => {
    // The <source> the browser gets for a srcset
    const renderSource = async (srcset: string) => {
      const source = parse(
        await render(
          `<picture><source srcset="${srcset}"><img src="https://example.com/fallback.png"></picture>`,
          allowSvg
        )
      ).querySelector("picture > source");
      // Don't let a test pass because the whole element was escaped
      expect(source).not.toBeNull();
      return source!;
    };

    it.each([
      "https://example.com/dark.png",
      "https://example.com/a.jpg 1x, https://example.com/b.jpg 2x",
      "https://example.com/a.jpg 1x,https://example.com/b.jpg 2x",
      "https://example.com/a.jpg 400w,https://example.com/b.jpg 800w",
      "https://example.com/a.jpg 1x,, https://example.com/b.jpg 2x",
      "https://example.com/a.jpg 1.5x",
      "/local/a.jpg 1x,./b.jpg 2x",
      "//example.com/a.jpg 1x,../b.jpg 2x",
      "https://example.com/a.jpg?x=1&amp;y=2 1x, https://example.com/b.jpg?x=1&y=2 2x",
      "https://example.com/a.jpg 1x&#44; https://example.com/b.jpg 2x",
      "https://example.com/javascript:logo.svg 1x",
    ])("keeps %s", async (srcset) => {
      // What the browser reads from the markup as written
      const expected = parse(`<source srcset="${srcset}">`)
        .querySelector("source")!
        .getAttribute("srcset");
      expect((await renderSource(srcset)).getAttribute("srcset")).toBe(
        expected
      );
    });

    it.each([
      // eslint-disable-next-line no-script-url
      "javascript:alert(1)",
      " JaVaScRiPt:alert(1)",
      "&#106;avascript:alert(1)",
      "vbscript:msgbox(1)",
      "https://example.com/a.jpg 1x, javascript:alert(1) 2x",
      "https://example.com/a.jpg 1x,javascript:alert(1) 2x",
      "https://example.com/a.jpg 1x&#44; javascript:alert(1) 2x",
      "https://example.com/a.jpg 1x,&#1;javascript:alert(1) 2x",
      "https://example.com/a.jpg 1x,blob:https://example.com/id 2x",
      // xss decodes these once and the browser would decode them again
      "https://example.com/a.jpg 1x&#38;#44;java&#38;#115;cript:alert(1) 2x",
      "https://example.com/a.jpg 1x&comma;java&#38;#115;cript:alert(1) 2x",
      "https://example.com/a.jpg 1x&comma;data:text/html&comma;x 2x",
      "data:&#38;#105;mage/png 1x",
      // A comma inside parentheses does not end a descriptor
      "https://example.com/a.jpg 1x(,https://example.com/b)x,data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg== 2x",
    ])("drops srcset with a disallowed URL: %s", async (srcset) => {
      expect((await renderSource(srcset)).hasAttribute("srcset")).toBe(false);
    });

    // Splitting at every comma and space is stricter than the browser, so
    // these valid but rare forms are dropped and the <img> fallback shows.
    it.each([
      // A comma inside a URL
      "https://res.cloudinary.com/demo/image/upload/w_400,c_fill/a.jpg 1x",
      "data:image/png;base64,aGVsbG8= 1x",
      // A comma inside a parenthesized descriptor
      "https://example.com/a.jpg (ignored, x),https://example.com/b.jpg 2x",
      // Named references other than `&amp;` are not decoded
      "https://example.com/a.jpg 1x&comma;https://example.com/b.jpg 2x",
    ])("drops srcset the strict check can't split: %s", async (srcset) => {
      expect((await renderSource(srcset)).hasAttribute("srcset")).toBe(false);
    });

    it("keeps an undecoded named reference as text", async () => {
      // If `&comma;` became a comma here, the browser would see two URLs
      expect(
        (
          await renderSource(
            "https://example.com/a.jpg&comma;javascript:alert(1) 1x"
          )
        ).getAttribute("srcset")
      ).toBe("https://example.com/a.jpg&comma;javascript:alert(1) 1x");
    });

    it("keeps quotes and angle brackets inside the attribute", async () => {
      const content = parse(
        await render(
          '<picture><source srcset="https://example.com/a.jpg?q=&quot;&#62;&#60;b&#62; 1x"></picture>',
          allowSvg
        )
      );
      const source = content.querySelector("picture > source");
      expect(source?.getAttributeNames()).toEqual(["srcset"]);
      expect(source?.getAttribute("srcset")).toBe(
        'https://example.com/a.jpg?q="><b> 1x'
      );
      expect(content.querySelector("b")).toBeNull();
    });

    it("does not let an encoded quote add an attribute", async () => {
      const source = await renderSource(
        "https://example.com/a.jpg&quot; onerror=&quot;alert(1)"
      );
      expect(source.hasAttribute("onerror")).toBe(false);
    });
  });

  describe.each(["audio", "video"])("source src in %s", (tag) => {
    const renderSrc = async (src: string) =>
      parse(await render(`<${tag} controls><source src="${src}"></${tag}>`))
        .querySelector(`${tag} > source`)
        ?.getAttribute("src");

    it("keeps an https src", async () => {
      expect(await renderSrc("https://example.com/a.mp4")).toBe(
        "https://example.com/a.mp4"
      );
    });

    it.each([
      // eslint-disable-next-line no-script-url
      "javascript:alert(1)",
      "vbscript:msgbox(1)",
      "data:text/html,x",
      "blob:https://example.com/id",
    ])("empties a disallowed src: %s", async (src) => {
      expect(await renderSrc(src)).toBe("");
    });
  });
});

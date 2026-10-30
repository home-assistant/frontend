import { expose } from "comlink";
import { describe, expect, it, vi } from "vitest";
import { rewriteHtmlUrls } from "../../../src/common/dom/rewrite-html-urls";
import type { RepositoryInfo } from "../../../src/data/marketplace/repository";
import {
  markdownWithRepositoryContext,
  repositoryUrl,
} from "../../../src/panels/marketplace/tools/markdown";
import type { Api } from "../../../src/resources/markdown-worker";

vi.mock("comlink", () => ({ expose: vi.fn() }));

const repository = {
  id: "42",
  full_name: "owner/repo",
  available_version: "v1.0.0",
  default_branch: "main",
} as RepositoryInfo;

describe("repositoryUrl", () => {
  const url = repositoryUrl(repository);

  it.each([
    {
      name: "a file shown on GitHub from raw",
      input: "https://github.com/owner/repo/blob/main/card.png",
      output: "https://raw.githubusercontent.com/owner/repo/main/card.png",
    },
    {
      name: "a markdown document shown on GitHub as it is",
      input: "https://github.com/owner/repo/blob/main/GUIDE.md",
      output: "https://github.com/owner/repo/blob/main/GUIDE.md",
    },
    {
      name: "a relative document at GitHub",
      input: "docs/setup.md",
      output: "https://github.com/owner/repo/blob/v1.0.0/docs/setup.md",
    },
    {
      name: "a relative file at raw",
      input: "images/card.png",
      output:
        "https://raw.githubusercontent.com/owner/repo/v1.0.0/images/card.png",
    },
    {
      name: "a file from the root of the repository, not of the host",
      input: "/images/card.png",
      output:
        "https://raw.githubusercontent.com/owner/repo/v1.0.0/images/card.png",
    },
    {
      name: "a file in the same folder",
      input: "./card.png",
      output: "https://raw.githubusercontent.com/owner/repo/v1.0.0/card.png",
    },
    {
      name: "an anchor as it is",
      input: "#installation",
      output: "#installation",
    },
    {
      name: "an absolute address as it is",
      input: "https://example.com/page",
      output: "https://example.com/page",
    },
    {
      name: "an absolute address after a space",
      input: " https://example.com/setup",
      output: "https://example.com/setup",
    },
    {
      name: "an address with a scheme of its own as it is",
      input: "mailto:maintainer@example.com",
      output: "mailto:maintainer@example.com",
    },
  ])("points $name", ({ input, output }) => {
    expect(url(input)).toBe(output);
  });

  it("uses the default branch for a repository without releases", () => {
    expect(
      repositoryUrl({ ...repository, available_version: "" })("card.png")
    ).toBe("https://raw.githubusercontent.com/owner/repo/main/card.png");
  });

  it("uses the installed version for an installed repository", () => {
    expect(
      repositoryUrl({
        ...repository,
        installed: true,
        installed_version: "v0.9.0",
      })("old.png")
    ).toBe("https://raw.githubusercontent.com/owner/repo/v0.9.0/old.png");
  });

  it("only serves GitHub files from raw without a repository", () => {
    const withoutRepository = repositoryUrl();

    expect(withoutRepository("docs/setup.md")).toBe("docs/setup.md");
    expect(
      withoutRepository("https://github.com/owner/repo/blob/main/card.png")
    ).toBe("https://raw.githubusercontent.com/owner/repo/main/card.png");
  });
});

describe("markdownWithRepositoryContext", () => {
  it("keeps HTML in code as written", () => {
    const input = '`<img src="images/card.png">`';

    expect(markdownWithRepositoryContext(input, repository)).toBe(input);
  });

  it("links issue references to the repository", () => {
    expect(markdownWithRepositoryContext("Fixed in #12.", repository)).toBe(
      "Fixed in [#12](https://github.com/owner/repo/issues/12)."
    );
  });

  it("links issue references to another repository", () => {
    expect(
      markdownWithRepositoryContext("See other/project#3.", repository)
    ).toBe("See [other/project#3](https://github.com/other/project/issues/3).");
  });

  it("keeps absolute links", () => {
    const input = "[site](https://example.com/page)";

    expect(markdownWithRepositoryContext(input, repository)).toBe(input);
  });

  it("keeps relative links without a repository", () => {
    const input = "[setup](docs/setup.md) and #12";

    expect(markdownWithRepositoryContext(input)).toBe(input);
  });

  it("keeps fenced code blocks as written", () => {
    const input = [
      "```",
      "color: #123456;",
      "[setup](docs/setup.md)",
      "```",
    ].join("\n");

    expect(markdownWithRepositoryContext(input, repository)).toBe(input);
  });

  it("keeps tilde fenced code blocks as written", () => {
    const input = ["~~~", "Fixed in #12.", "~~~"].join("\n");

    expect(markdownWithRepositoryContext(input, repository)).toBe(input);
  });

  it("keeps fenced code blocks with a language tag as written", () => {
    const input = ["```yaml", "color: '#123456'", "```"].join("\n");

    expect(markdownWithRepositoryContext(input, repository)).toBe(input);
  });

  it.each([
    {
      name: "fenced",
      input: ["> ```yaml", "> color: '#123456'", "> ```"].join("\n"),
    },
    {
      name: "tilde fenced",
      input: ["> ~~~", "> color: '#123456'", "> ~~~"].join("\n"),
    },
    {
      name: "indented",
      input: ["> Like this:", ">", ">     color: '#123456'"].join("\n"),
    },
  ])("keeps $name code in a quote as written", ({ input }) => {
    // Copied into a configuration, a link would break it
    expect(markdownWithRepositoryContext(input, repository)).toBe(input);
  });

  it("keeps a longer fence open past a shorter one", () => {
    const input = ["````", "```", "#12", "```", "````"].join("\n");

    expect(markdownWithRepositoryContext(input, repository)).toBe(input);
  });

  it("keeps an unclosed fence as code to the end", () => {
    const input = ["Before #1.", "```", "#12", "[setup](docs/setup.md)"].join(
      "\n"
    );

    expect(markdownWithRepositoryContext(input, repository)).toBe(
      [
        "Before [#1](https://github.com/owner/repo/issues/1).",
        "```",
        "#12",
        "[setup](docs/setup.md)",
      ].join("\n")
    );
  });

  it("rewrites around fenced code blocks", () => {
    const input = ["See #1.", "```", "#12", "```", "See #2."].join("\n");

    expect(markdownWithRepositoryContext(input, repository)).toBe(
      [
        "See [#1](https://github.com/owner/repo/issues/1).",
        "```",
        "#12",
        "```",
        "See [#2](https://github.com/owner/repo/issues/2).",
      ].join("\n")
    );
  });

  it("keeps inline code spans as written", () => {
    expect(
      markdownWithRepositoryContext("Use `#12` as in #12.", repository)
    ).toBe("Use `#12` as in [#12](https://github.com/owner/repo/issues/12).");
  });

  it("keeps inline code spans with longer backtick runs as written", () => {
    expect(
      markdownWithRepositoryContext("Use `` a`#12 `` here.", repository)
    ).toBe("Use `` a`#12 `` here.");
  });

  it("rewrites after an unmatched backtick", () => {
    expect(markdownWithRepositoryContext("A ` and #12.", repository)).toBe(
      "A ` and [#12](https://github.com/owner/repo/issues/12)."
    );
  });

  it("leaves the addresses of links for the rendered README", () => {
    const input = "[guide](guide.md) [website](https://example.com)";

    expect(markdownWithRepositoryContext(input, repository)).toBe(input);
  });

  it("does not link an issue reference that is already a link", () => {
    const input = "Fixed [#123](https://github.com/owner/repo/issues/123).";

    expect(markdownWithRepositoryContext(input, repository)).toBe(input);
  });

  it("does not link an issue reference in an entity or a tag", () => {
    const input = '&#123; <img alt="#12" src="https://example.com/a.png">';

    expect(markdownWithRepositoryContext(input, repository)).toBe(input);
  });

  it("does not link an issue reference inside an address", () => {
    const input = "See https://example.com/page#123 for details.";

    expect(markdownWithRepositoryContext(input, repository)).toBe(input);
  });

  it("keeps indented code blocks as they are", () => {
    const input = "Configuration:\n\n    color: '#123456'\n    value: 1\n";

    expect(markdownWithRepositoryContext(input, repository)).toBe(input);
  });

  it("does not link an issue reference in a badge", () => {
    const input = "[![#12](badge.svg)](docs/setup.md#12)";

    expect(markdownWithRepositoryContext(input, repository)).toBe(input);
  });

  it("rewrites the indented continuation of a list item", () => {
    expect(
      markdownWithRepositoryContext(
        "- Changes\n\n    Fixed #12, see [setup](docs/setup.md)",
        repository
      )
    ).toBe(
      "- Changes\n\n    Fixed [#12](https://github.com/owner/repo/issues/12), see [setup](docs/setup.md)"
    );
  });

  it("keeps indented code inside a list item", () => {
    const input = "- Configure the card:\n\n      color: '#123456'";

    expect(markdownWithRepositoryContext(input, repository)).toBe(input);
  });

  it("keeps indented code inside a nested list item", () => {
    const input = "1. Install\n   - Add:\n\n         color: '#123456'";

    expect(markdownWithRepositoryContext(input, repository)).toBe(input);
  });

  it("keeps indented code after a list has ended", () => {
    const input = "- Item\n\nText\n\n    color: '#123456'";

    expect(markdownWithRepositoryContext(input, repository)).toBe(input);
  });

  it("keeps text that looks like a placeholder", () => {
    const input = "Private \uE0000\uE000 and \u00001\u0000 characters";

    expect(markdownWithRepositoryContext(input, repository)).toBe(input);
  });

  it.each([
    { name: "one long word", input: "a".repeat(100_000) },
    { name: "a long word with dots", input: "a.".repeat(50_000) },
    { name: "many unclosed tags", input: "<a ".repeat(30_000) },
    { name: "many unclosed links", input: "[a](".repeat(30_000) },
    { name: "a long scheme", input: `${"a".repeat(100_000)}:` },
  ])("keeps up with a README of $name", ({ input }) => {
    const start = performance.now();

    expect(markdownWithRepositoryContext(input, repository)).toBe(input);
    // Searching the rest of it again from every position takes seconds
    expect(performance.now() - start).toBeLessThan(1000);
  });

  it("keeps up with a README full of code spans", () => {
    const input = "`a` ".repeat(80_000);
    const start = performance.now();

    expect(markdownWithRepositoryContext(input, repository)).toBe(input);
    // Scanning all of them again for every one takes seconds
    expect(performance.now() - start).toBeLessThan(1000);
  });
});

describe("rewriteHtmlUrls with the README of a repository", () => {
  const toReadme = repositoryUrl(repository);
  const raw = "https://raw.githubusercontent.com/owner/repo/v1.0.0";

  const srcsetOf = (input: string) =>
    rewriteHtmlUrls(`<source srcset="${input}">`, toReadme).match(
      /srcset="([^"]*)"/
    )?.[1];

  it.each([
    {
      name: "relative addresses into the repository",
      input: "./images/logo.png 1x, images/logo@2x.png 2x",
      output: `${raw}/images/logo.png 1x, ${raw}/images/logo@2x.png 2x`,
    },
    {
      name: "a file shown on GitHub to raw",
      input:
        "https://github.com/owner/repo/blob/main/logo.png, https://github.com/other/repo/blob/v2/logo@2x.png 2x",
      output:
        "https://raw.githubusercontent.com/owner/repo/main/logo.png, https://raw.githubusercontent.com/other/repo/v2/logo@2x.png 2x",
    },
    {
      // Never requested from Home Assistant, same as the src of an image
      name: "an address at the root of the host into the repository",
      input: "/api/states 1x, /local/x.png 2x",
      output: `${raw}/api/states 1x, ${raw}/local/x.png 2x`,
    },
    {
      name: "relative and absolute addresses together",
      input: "a.png 100w, https://example.com/b.png 200w, /c.png 300w",
      output: `${raw}/a.png 100w, https://example.com/b.png 200w, ${raw}/c.png 300w`,
    },
  ])("points $name", ({ input, output }) => {
    expect(srcsetOf(input)).toBe(output);
    expect(
      rewriteHtmlUrls(`<img src="${input.split(" ")[0]}">`, toReadme)
    ).toBe(`<img src="${output.split(" ")[0]}">`);
  });

  it("points the src of the source of a video", () => {
    expect(
      rewriteHtmlUrls(
        '<video><source src="/api/camera_proxy/camera.x"></video>',
        toReadme
      )
    ).toBe(`<video><source src="${raw}/api/camera_proxy/camera.x"></video>`);
  });

  it("shows the dark logo of a README from the repository", async () => {
    await import("../../../src/resources/markdown-worker");
    const { renderMarkdown } = vi.mocked(expose).mock.calls[0][0] as Api;
    const html = (
      await renderMarkdown(
        [
          "<picture>",
          '  <source media="(prefers-color-scheme: dark)" srcset="./images/logo-dark.png">',
          '  <img src="./images/logo-light.png" alt="Logo">',
          "</picture>",
        ].join("\n"),
        {}
      )
    ).join("");

    const template = document.createElement("template");
    template.innerHTML = rewriteHtmlUrls(html, toReadme);
    const picture = template.content.querySelector("picture")!;
    expect(picture.querySelector("source")?.getAttribute("media")).toBe(
      "(prefers-color-scheme: dark)"
    );
    expect(picture.querySelector("source")?.getAttribute("srcset")).toBe(
      `${raw}/images/logo-dark.png`
    );
    expect(picture.querySelector("img")?.getAttribute("src")).toBe(
      `${raw}/images/logo-light.png`
    );
  });
});

import { describe, expect, it } from "vitest";
import type { RepositoryInfo } from "../../../src/data/marketplace/repository";
import { markdownWithRepositoryContext } from "../../../src/panels/marketplace/tools/markdown";

const repository = {
  id: "42",
  full_name: "owner/repo",
  available_version: "v1.0.0",
  default_branch: "main",
} as RepositoryInfo;

describe("markdownWithRepositoryContext", () => {
  it("serves files linked on GitHub from raw", () => {
    expect(
      markdownWithRepositoryContext(
        "![card](https://github.com/owner/repo/blob/main/card.png)"
      )
    ).toBe(
      "![card](https://raw.githubusercontent.com/owner/repo/main/card.png)"
    );
  });

  it("keeps GitHub links to markdown documents", () => {
    const input = "[guide](https://github.com/owner/repo/blob/main/GUIDE.md)";

    expect(markdownWithRepositoryContext(input)).toBe(input);
  });

  it("points relative documents at GitHub for the available version", () => {
    expect(
      markdownWithRepositoryContext("[setup](docs/setup.md)", repository)
    ).toBe("[setup](https://github.com/owner/repo/blob/v1.0.0/docs/setup.md)");
  });

  it("points relative files at raw for the available version", () => {
    expect(
      markdownWithRepositoryContext("![card](/images/card.png)", repository)
    ).toBe(
      "![card](https://raw.githubusercontent.com/owner/repo/v1.0.0/images/card.png)"
    );
  });

  it("uses the default branch for a repository without releases", () => {
    expect(
      markdownWithRepositoryContext("![card](card.png)", {
        ...repository,
        available_version: "",
      })
    ).toBe(
      "![card](https://raw.githubusercontent.com/owner/repo/main/card.png)"
    );
  });

  it("keeps anchors on the repository page", () => {
    expect(
      markdownWithRepositoryContext("[install](#installation)", repository)
    ).toBe("[install](/marketplace/repository/42#installation)");
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

  it("rewrites links with inline code in the text", () => {
    expect(
      markdownWithRepositoryContext("[`setup`](docs/setup.md)", repository)
    ).toBe(
      "[`setup`](https://github.com/owner/repo/blob/v1.0.0/docs/setup.md)"
    );
  });

  it("rewrites after an unmatched backtick", () => {
    expect(markdownWithRepositoryContext("A ` and #12.", repository)).toBe(
      "A ` and [#12](https://github.com/owner/repo/issues/12)."
    );
  });

  it("resolves an installed README against the installed version", () => {
    expect(
      markdownWithRepositoryContext("![old](old.png)", {
        ...repository,
        installed: true,
        installed_version: "v0.9.0",
      })
    ).toBe(
      "![old](https://raw.githubusercontent.com/owner/repo/v0.9.0/old.png)"
    );
  });

  it("rewrites a relative link followed by an absolute link", () => {
    expect(
      markdownWithRepositoryContext(
        "[guide](guide.md) [website](https://example.com)",
        repository
      )
    ).toBe(
      "[guide](https://github.com/owner/repo/blob/v1.0.0/guide.md) [website](https://example.com)"
    );
  });

  it("keeps links with a scheme of their own", () => {
    const input = "[Email](mailto:maintainer@example.com)";

    expect(markdownWithRepositoryContext(input, repository)).toBe(input);
  });

  it("does not link an issue reference that is already a link", () => {
    const input = "Fixed [#123](https://github.com/owner/repo/issues/123).";

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

  it("rewrites both the image and the link of a badge", () => {
    expect(
      markdownWithRepositoryContext(
        "[![badge](badge.svg)](docs/setup.md)",
        repository
      )
    ).toBe(
      "[![badge](https://raw.githubusercontent.com/owner/repo/v1.0.0/badge.svg)](https://github.com/owner/repo/blob/v1.0.0/docs/setup.md)"
    );
  });

  it("rewrites the indented continuation of a list item", () => {
    expect(
      markdownWithRepositoryContext(
        "- Changes\n\n    Fixed #12, see [setup](docs/setup.md)",
        repository
      )
    ).toBe(
      "- Changes\n\n    Fixed [#12](https://github.com/owner/repo/issues/12), see [setup](https://github.com/owner/repo/blob/v1.0.0/docs/setup.md)"
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
});

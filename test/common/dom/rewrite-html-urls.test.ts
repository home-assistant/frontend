import { describe, expect, it } from "vitest";
import { rewriteHtmlUrls } from "../../../src/common/dom/rewrite-html-urls";

const toRepository = (url: string) => `https://example.com/repo/${url}`;

describe("rewriteHtmlUrls", () => {
  it.each([
    {
      name: "a link",
      input: '<a href="docs/setup.md">Setup</a>',
      output: '<a href="https://example.com/repo/docs/setup.md">Setup</a>',
    },
    {
      name: "an image",
      input: '<img src="images/card.png" width="400">',
      output:
        '<img src="https://example.com/repo/images/card.png" width="400">',
    },
    {
      // What markdown renders for an unquoted attribute and a reference link
      name: "an unquoted image",
      input: "<img src=images/card.png>",
      output: '<img src="https://example.com/repo/images/card.png">',
    },
    {
      name: "a link with an entity in it, as the browser reads it",
      input: '<a href="docs&#47;setup.md">Setup</a>',
      output: '<a href="https://example.com/repo/docs/setup.md">Setup</a>',
    },
  ])("rewrites $name", ({ input, output }) => {
    expect(rewriteHtmlUrls(input, toRepository)).toBe(output);
  });

  it("leaves what has no address alone", () => {
    const input = '<a name="top">Top</a><p class="docs">Text</p>';

    expect(rewriteHtmlUrls(input, toRepository)).toBe(input);
  });

  it("rewrites the image of a badge and the link around it", () => {
    expect(
      rewriteHtmlUrls(
        '<a href="docs/setup.md"><img src="badge.svg"></a>',
        toRepository
      )
    ).toBe(
      '<a href="https://example.com/repo/docs/setup.md"><img src="https://example.com/repo/badge.svg"></a>'
    );
  });
});

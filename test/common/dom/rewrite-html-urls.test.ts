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

  it.each([
    {
      name: "a source of a video",
      input: '<video controls><source src="clip.mp4" type="video/mp4"></video>',
      output:
        '<video controls=""><source src="https://example.com/repo/clip.mp4" type="video/mp4"></video>',
    },
    {
      name: "a source of an audio",
      input: '<audio controls><source src="./sound.ogg"></audio>',
      output:
        '<audio controls=""><source src="https://example.com/repo/./sound.ogg"></audio>',
    },
    {
      name: "the srcset of a picture source",
      input: '<picture><source srcset="dark.png"></picture>',
      output:
        '<picture><source srcset="https://example.com/repo/dark.png"></picture>',
    },
    {
      name: "every address in a srcset and keeps the descriptors",
      input:
        '<source srcset="small.png 480w,large.png  1080w ,, huge.png 2x" sizes="50vw">',
      output:
        '<source srcset="https://example.com/repo/small.png 480w, https://example.com/repo/large.png 1080w, https://example.com/repo/huge.png 2x" sizes="50vw">',
    },
    {
      name: "a srcset with an entity in it, as the browser reads it",
      input: '<source srcset="img&#47;a.png 1x">',
      output: '<source srcset="https://example.com/repo/img/a.png 1x">',
    },
  ])("rewrites $name", ({ input, output }) => {
    expect(rewriteHtmlUrls(input, toRepository)).toBe(output);
  });
});

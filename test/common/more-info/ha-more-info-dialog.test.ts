/* @vitest-environment jsdom */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const SRC_PATH = resolve(
  process.cwd(),
  "src/dialogs/more-info/ha-more-info-dialog.ts"
);

function loadSource(): string {
  const txt = readFileSync(SRC_PATH, "utf8");
  expect(txt.length).toBeGreaterThan(0);
  return txt;
}

describe("<ha-more-info-dialog> – source assertions (no bundler)", () => {
  it("contains an accessible dialog heading linkage via aria-labelledby", () => {
    const src = loadSource();
    // <ha-dialog ... aria-labelledby="moreInfoTitle"
    const re = /<ha-dialog[\s\S]*?aria-labelledby=["']moreInfoTitle["']/m;
    expect(re.test(src)).toBe(true);
  });

  it("renders a screen-reader live region for announcements", () => {
    const src = loadSource();
    // <span class="sr-only" aria-live="polite"
    const hasSrOnly =
      /<span[^>]*class=["'][^"']*\bsr-only\b[^"']*["'][^>]*>/m.test(src);
    const hasPolite = /<span[^>]*aria-live=["']polite["'][^>]*>/m.test(src);
    expect(hasSrOnly && hasPolite).toBe(true);
  });

  it("includes the size toggle control with a stable id", () => {
    const src = loadSource();
    // id="sizeToggle"
    expect(/id=["']sizeToggle["']/.test(src)).toBe(true);
  });

  it("makes the title focusable for initial focus management", () => {
    const src = loadSource();
    // <span id="moreInfoTitle" ... tabindex="-1">
    const re = /id=["']moreInfoTitle["'][^>]*\btabindex=["']-1["']/m;
    expect(re.test(src)).toBe(true);
  });

  it("implements announce logic that updates the live region message", () => {
    const src = loadSource();
    // _announceSizeChange( ... this._srMessage = ...
    const hasMethod = /_announceSizeChange\s*\(/.test(src);
    const updatesMessage = /this\._srMessage\s*=/.test(src);
    expect(hasMethod && updatesMessage).toBe(true);
  });
});

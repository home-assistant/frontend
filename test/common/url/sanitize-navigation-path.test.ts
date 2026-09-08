import { describe, expect, it } from "vitest";

import { sanitizeNavigationPath } from "../../../src/common/url/sanitize-navigation-path";

describe("sanitizeNavigationPath", () => {
  it("keeps paths on the current origin", () => {
    expect(sanitizeNavigationPath("/")).toEqual("/");
    expect(sanitizeNavigationPath("/config/areas")).toEqual("/config/areas");
    expect(sanitizeNavigationPath("/energy?historyBack=1")).toEqual(
      "/energy?historyBack=1"
    );
    expect(sanitizeNavigationPath("config/areas")).toEqual("config/areas");
    expect(sanitizeNavigationPath(`${location.origin}/lovelace/0`)).toEqual(
      `${location.origin}/lovelace/0`
    );
  });

  /* eslint-disable no-script-url */
  it("rejects URIs with their own scheme", () => {
    expect(sanitizeNavigationPath("javascript:alert(1)")).toBeUndefined();
    expect(sanitizeNavigationPath("JavaScript:alert(1)")).toBeUndefined();
    // the URL parser strips tabs and newlines, just like the browser does for href
    expect(sanitizeNavigationPath("java\tscript:alert(1)")).toBeUndefined();
    expect(sanitizeNavigationPath(" javascript:alert(1)")).toBeUndefined();
    expect(
      sanitizeNavigationPath("data:text/html,<script>alert(1)</script>")
    ).toBeUndefined();
    expect(sanitizeNavigationPath("vbscript:msgbox(1)")).toBeUndefined();
  });
  /* eslint-enable no-script-url */

  it("rejects other origins", () => {
    expect(sanitizeNavigationPath("https://example.com/")).toBeUndefined();
    expect(sanitizeNavigationPath("//example.com/")).toBeUndefined();
    expect(sanitizeNavigationPath("\\\\example.com/")).toBeUndefined();
  });

  it("rejects missing values", () => {
    expect(sanitizeNavigationPath(undefined)).toBeUndefined();
    expect(sanitizeNavigationPath(null)).toBeUndefined();
  });
});

import { describe, expect, it } from "vitest";

import "../../../src/panels/lovelace/cards/hui-iframe-card";
import "../../../src/panels/lovelace/special-rows/hui-weblink-row";

/* eslint-disable no-script-url */
const UNSAFE_URLS = [
  "javascript:alert(1)",
  "JaVaScRiPt:alert(1)",
  "java\tscript:alert(1)",
  "data:text/html,<script>alert(1)</script>",
  "vbscript:msgbox(1)",
];
/* eslint-enable no-script-url */

const SAFE_URLS = [
  "https://example.com/page",
  "http://192.168.1.5:8080/",
  "mailto:someone@example.com",
  "/local/page.html",
];

describe("hui-weblink-row config", () => {
  const row = () => document.createElement("hui-weblink-row") as any;

  it.each(SAFE_URLS)("accepts %s", (url) => {
    expect(() => row().setConfig({ url })).not.toThrow();
  });

  it.each(UNSAFE_URLS)("rejects %s", (url) => {
    expect(() => row().setConfig({ url })).toThrow("Invalid URL");
  });
});

describe("hui-iframe-card config", () => {
  const card = () => document.createElement("hui-iframe-card") as any;

  it.each(SAFE_URLS)("accepts %s", (url) => {
    expect(() => card().setConfig({ type: "iframe", url })).not.toThrow();
  });

  it.each(UNSAFE_URLS)("rejects %s", (url) => {
    expect(() => card().setConfig({ type: "iframe", url })).toThrow(
      "Invalid URL"
    );
  });
});

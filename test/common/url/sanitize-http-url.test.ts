import { describe, expect, it } from "vitest";

import {
  homeAssistantUrlToPath,
  isHomeAssistantUrl,
  sanitizeLinkUrl,
  sanitizeHttpUrl,
} from "../../../src/common/url/sanitize-http-url";

describe("sanitizeHttpUrl", () => {
  it("keeps http and https URLs", () => {
    expect(
      sanitizeHttpUrl("https://www.home-assistant.io/integrations/hue")
    ).toEqual("https://www.home-assistant.io/integrations/hue");
    expect(sanitizeHttpUrl("http://192.168.1.5:8080/setup")).toEqual(
      "http://192.168.1.5:8080/setup"
    );
  });

  /* eslint-disable no-script-url */
  it("rejects URIs that can execute script", () => {
    expect(sanitizeHttpUrl("javascript:alert(1)")).toBeUndefined();
    expect(sanitizeHttpUrl("JavaScript:alert(1)")).toBeUndefined();
    expect(sanitizeHttpUrl("java\tscript:alert(1)")).toBeUndefined();
    expect(sanitizeHttpUrl(" javascript:alert(1)")).toBeUndefined();
    expect(
      sanitizeHttpUrl("data:text/html,<script>alert(1)</script>")
    ).toBeUndefined();
    expect(sanitizeHttpUrl("vbscript:msgbox(1)")).toBeUndefined();
  });
  /* eslint-enable no-script-url */

  it("rejects other schemes and unparseable values", () => {
    expect(sanitizeHttpUrl("homeassistant://config/system")).toBeUndefined();
    expect(sanitizeHttpUrl("file:///etc/passwd")).toBeUndefined();
    expect(sanitizeHttpUrl("about:blank")).toBeUndefined();
    expect(sanitizeHttpUrl("/config/system")).toBeUndefined();
    expect(sanitizeHttpUrl("not a url")).toBeUndefined();
  });

  it("rejects missing values", () => {
    expect(sanitizeHttpUrl(undefined)).toBeUndefined();
    expect(sanitizeHttpUrl(null)).toBeUndefined();
    expect(sanitizeHttpUrl("")).toBeUndefined();
  });
});

describe("isHomeAssistantUrl", () => {
  it("detects the Home Assistant scheme", () => {
    expect(isHomeAssistantUrl("homeassistant://config/system")).toBe(true);
    expect(isHomeAssistantUrl("https://www.home-assistant.io/")).toBe(false);
    expect(isHomeAssistantUrl(undefined)).toBe(false);
  });
});

describe("homeAssistantUrlToPath", () => {
  it("rewrites a deep link to an in-app path", () => {
    expect(homeAssistantUrlToPath("homeassistant://config/system")).toEqual(
      "/config/system"
    );
    expect(homeAssistantUrlToPath("homeassistant://config/network")).toEqual(
      "/config/network"
    );
  });

  it("rejects a deep link that leaves the frontend", () => {
    // A plain scheme rewrite would turn this into "//example.com".
    expect(
      homeAssistantUrlToPath("homeassistant:///example.com")
    ).toBeUndefined();
    expect(
      homeAssistantUrlToPath("homeassistant:///\\example.com")
    ).toBeUndefined();
  });

  it("rejects anything that is not a deep link", () => {
    expect(homeAssistantUrlToPath("https://example.com/")).toBeUndefined();
    expect(homeAssistantUrlToPath(undefined)).toBeUndefined();
  });
});

describe("sanitizeLinkUrl", () => {
  it("handles both external links and deep links", () => {
    expect(sanitizeLinkUrl("https://example.com/docs")).toEqual(
      "https://example.com/docs"
    );
    expect(sanitizeLinkUrl("homeassistant://config/system")).toEqual(
      "/config/system"
    );
    // eslint-disable-next-line no-script-url
    expect(sanitizeLinkUrl("javascript:alert(1)")).toBeUndefined();
    expect(sanitizeLinkUrl("homeassistant:///example.com")).toBeUndefined();
  });
});

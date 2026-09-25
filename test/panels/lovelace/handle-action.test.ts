import { afterEach, describe, expect, it, vi } from "vitest";

import { handleAction } from "../../../src/panels/lovelace/common/handle-action";
import type { HomeAssistant } from "../../../src/types";

const hass = { localize: (key: string) => key } as unknown as HomeAssistant;

const openUrl = (url: string) => {
  const open = vi.spyOn(window, "open").mockImplementation(() => null);
  open.mockClear();
  handleAction(
    document.createElement("div"),
    hass,
    { tap_action: { action: "url", url_path: url } },
    "tap"
  );
  return open.mock.calls[0]?.[0];
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("handleAction url", () => {
  it("opens a configured URL", () => {
    expect(openUrl("https://example.com/page")).toEqual(
      "https://example.com/page"
    );
    expect(openUrl("mailto:someone@example.com")).toEqual(
      "mailto:someone@example.com"
    );
  });

  /* eslint-disable no-script-url */
  it("does not open a URL that runs script", () => {
    expect(openUrl("javascript:alert(1)")).toEqual("about:blank");
    expect(openUrl("JaVaScRiPt:alert(1)")).toEqual("about:blank");
    expect(openUrl("data:text/html,<script>alert(1)</script>")).toEqual(
      "about:blank"
    );
  });
  /* eslint-enable no-script-url */
});

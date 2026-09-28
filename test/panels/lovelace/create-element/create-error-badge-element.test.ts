import { describe, expect, it, vi } from "vitest";
import type { HuiErrorBadge } from "../../../../src/panels/lovelace/badges/hui-error-badge";
import { createBadgeElement } from "../../../../src/panels/lovelace/create-element/create-badge-element";
import { createHeadingBadgeElement } from "../../../../src/panels/lovelace/create-element/create-heading-badge-element";
import type { HuiErrorHeadingBadge } from "../../../../src/panels/lovelace/heading-badges/hui-error-heading-badge";

vi.hoisted(() => {
  Object.assign(globalThis, {
    __STATIC_PATH__: "/",
    __HASS_URL__: "",
    __BUILD__: "modern",
    __VERSION__: "test",
    __BACKWARDS_COMPAT__: false,
    __SUPERVISOR__: false,
    __NAMESPACE__: "frontend",
  });
});

describe("error badge factories", () => {
  it("creates a configured error badge on the first call", async () => {
    const element = createBadgeElement({
      type: "error",
      error: "test error",
    }) as HuiErrorBadge;

    expect(element.localName).toBe("hui-error-badge");
    expect((element as any)._config.error).toBe("test error");
  });

  it("creates a configured error heading badge on the first call", async () => {
    const element = createHeadingBadgeElement({
      type: "error",
      error: "test heading error",
    }) as HuiErrorHeadingBadge;

    expect(element.localName).toBe("hui-error-heading-badge");
    expect((element as any)._config.error).toBe("test heading error");
  });
});

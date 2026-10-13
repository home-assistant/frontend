import { describe, expect, it, vi } from "vitest";
import { validateCardConfig } from "../../gallery/src/common/validate-card-config";

vi.hoisted(() => {
  Object.assign(globalThis, {
    __STATIC_PATH__: "/",
    __BUILD__: "modern",
    __VERSION__: "test",
    __BACKWARDS_COMPAT__: false,
    __SUPERVISOR__: false,
    __NAMESPACE__: "frontend",
  });
});

describe("validateCardConfig", () => {
  it("accepts valid card configs", async () => {
    await expect(
      validateCardConfig({
        type: "button",
        entity: "light.bed_light",
        tap_action: {
          action: "perform-action",
          perform_action: "light.toggle",
        },
      })
    ).resolves.toBeUndefined();
  });

  it.each([
    {
      type: "entity-filter",
    },
    {
      type: "picture",
    },
  ])("rejects invalid $type card configs", async (config) => {
    await expect(validateCardConfig(config)).rejects.toThrow();
  });
});

import type { HassEntity } from "home-assistant-js-websocket";
import { describe, expect, it, vi } from "vitest";
import type { HomeAssistant } from "../../src/types";

vi.hoisted(() => {
  Object.assign(globalThis, { __BACKWARDS_COMPAT__: false });
});

const { attributeIcon } = await import("../../src/data/icons");

const ICONS = {
  entity: {
    member_platform: {
      light: {
        member_key: {
          state_attributes: {
            effect: {
              default: "mdi:member-default",
              state: { candle: "mdi:candle" },
            },
          },
        },
      },
    },
  },
  entity_component: {
    light: {
      _: {
        default: "mdi:lightbulb",
        state_attributes: {
          effect: { default: "mdi:circle-medium", state: {} },
        },
      },
    },
  },
};

const connection = {
  haVersion: "2026.11.0",
  sendMessagePromise: async (message: {
    category: "entity" | "entity_component";
  }) => ({ resources: ICONS[message.category] }),
} as unknown as HomeAssistant["connection"];

const config = {
  components: ["light", "member_platform"],
} as unknown as HomeAssistant["config"];

const entities = {
  "light.group": { platform: "group" },
  "light.member": {
    platform: "member_platform",
    translation_key: "member_key",
  },
} as unknown as HomeAssistant["entities"];

const groupState = {
  entity_id: "light.group",
  attributes: { entity_id: ["light.member"] },
} as unknown as HassEntity;

describe("attributeIcon", () => {
  it("uses the icon of a group member for the value", async () => {
    expect(
      await attributeIcon(
        config,
        connection,
        entities,
        groupState,
        "effect",
        "candle"
      )
    ).toBe("mdi:candle");
  });

  it("does not use the default icon of a group member", async () => {
    expect(
      await attributeIcon(
        config,
        connection,
        entities,
        groupState,
        "effect",
        "fire"
      )
    ).toBe("mdi:circle-medium");
  });
});

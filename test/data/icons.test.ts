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
            level: {
              default: "mdi:member-default",
              range: { "0": "mdi:level-low", "50": "mdi:level-high" },
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
    integration?: string;
  }) => {
    if (message.integration === "failing_platform") {
      throw new Error("Icons not available");
    }
    return { resources: ICONS[message.category] };
  },
} as unknown as HomeAssistant["connection"];

const config = {
  components: ["light", "member_platform", "failing_platform"],
} as unknown as HomeAssistant["config"];

const entities = {
  "light.group": { platform: "group" },
  "light.member": {
    platform: "member_platform",
    translation_key: "member_key",
  },
  "light.failing_member": {
    platform: "failing_platform",
    translation_key: "failing_key",
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

  it("uses the range icon of a group member for a numeric value", async () => {
    expect(
      await attributeIcon(
        config,
        connection,
        entities,
        groupState,
        "level",
        "60"
      )
    ).toBe("mdi:level-high");
  });

  it("continues when the icons of a group member fail to load", async () => {
    const state = {
      entity_id: "light.group",
      attributes: { entity_id: ["light.failing_member", "light.member"] },
    } as unknown as HassEntity;

    expect(
      await attributeIcon(
        config,
        connection,
        entities,
        state,
        "effect",
        "candle"
      )
    ).toBe("mdi:candle");
    expect(
      await attributeIcon(config, connection, entities, state, "effect", "fire")
    ).toBe("mdi:circle-medium");
  });
});

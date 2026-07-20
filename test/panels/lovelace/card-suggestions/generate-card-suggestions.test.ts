import type { HassEntity } from "home-assistant-js-websocket";
import { afterEach, describe, expect, it } from "vitest";
import { customCards } from "../../../../src/data/lovelace_custom_cards";
import type { CustomCardEntry } from "../../../../src/data/lovelace_custom_cards";
import {
  CARD_SUGGESTION_PROVIDERS,
  generateCardSuggestions,
} from "../../../../src/panels/lovelace/card-suggestions";
import type { CardSuggestionProvider } from "../../../../src/panels/lovelace/card-suggestions/types";
import type { HomeAssistant } from "../../../../src/types";

const makeState = (
  entityId: string,
  state = "on",
  attributes: Record<string, unknown> = {}
): HassEntity => ({
  entity_id: entityId,
  state,
  attributes,
  last_changed: "",
  last_updated: "",
  context: { id: "", parent_id: null, user_id: null },
});

const makeHass = (states: HassEntity[]): HomeAssistant =>
  ({
    states: Object.fromEntries(states.map((s) => [s.entity_id, s])),
    localize: (key: string) => key,
  }) as unknown as HomeAssistant;

const registerTestProviders = (
  providers: Record<string, CardSuggestionProvider>
): (() => void) => {
  const keys = Object.keys(providers);
  for (const key of keys) {
    CARD_SUGGESTION_PROVIDERS[key] = providers[key];
  }
  return () => {
    for (const key of keys) {
      delete CARD_SUGGESTION_PROVIDERS[key];
    }
  };
};

const registerCustomCards = (entries: CustomCardEntry[]): (() => void) => {
  customCards.push(...entries);
  return () => {
    const types = new Set(entries.map((e) => e.type));
    for (let i = customCards.length - 1; i >= 0; i--) {
      if (types.has(customCards[i].type)) customCards.splice(i, 1);
    }
  };
};

describe("generateCardSuggestions", () => {
  let cleanupProviders: (() => void) | undefined;
  let cleanupCustom: (() => void) | undefined;

  afterEach(() => {
    cleanupProviders?.();
    cleanupProviders = undefined;
    cleanupCustom?.();
    cleanupCustom = undefined;
  });

  it("suggests nothing when no entity is picked", () => {
    expect(generateCardSuggestions(makeHass([]), undefined)).toEqual({
      core: [],
      custom: [],
    });
  });

  it("suggests nothing when the picked entity doesn't exist", () => {
    expect(generateCardSuggestions(makeHass([]), "light.ghost")).toEqual({
      core: [],
      custom: [],
    });
  });

  it("returns the entity-specific suggestions for a known entity", () => {
    const hass = makeHass([
      makeState("light.a", "on", { supported_color_modes: ["onoff"] }),
    ]);
    const suggestions = generateCardSuggestions(hass, "light.a");
    expect(suggestions.core.some((s) => s.config.type === "tile")).toBe(true);
  });

  it("accepts null, a single suggestion, or a list from each provider", () => {
    cleanupProviders = registerTestProviders({
      "test-null": { getEntitySuggestion: () => null },
      "test-single": {
        getEntitySuggestion: (_hass, entityId) => ({
          label: "Single",
          config: { type: "custom:test-single", entity: entityId },
        }),
      },
      "test-array": {
        getEntitySuggestion: (_hass, entityId) => [
          {
            label: "Array A",
            config: { type: "custom:test-array-a", entity: entityId },
          },
          {
            label: "Array B",
            config: { type: "custom:test-array-b", entity: entityId },
          },
        ],
      },
    });

    const hass = makeHass([makeState("sensor.a", "1")]);
    const types = generateCardSuggestions(hass, "sensor.a").core.map(
      (s) => s.config.type
    );

    expect(types).toContain("custom:test-single");
    expect(types).toContain("custom:test-array-a");
    expect(types).toContain("custom:test-array-b");
  });

  it("keeps working when a provider throws", () => {
    cleanupProviders = registerTestProviders({
      "test-throws": {
        getEntitySuggestion: () => {
          throw new Error("boom");
        },
      },
    });

    const hass = makeHass([makeState("sensor.a", "1")]);
    const types = generateCardSuggestions(hass, "sensor.a").core.map(
      (s) => s.config.type
    );
    expect(types).toContain("tile");
  });

  it("collects suggestions from custom cards into the custom bucket", () => {
    cleanupCustom = registerCustomCards([
      {
        type: "my-custom-card",
        name: "My Custom Card",
        getEntitySuggestion: (_hass, entityId) => ({
          config: { type: "custom:my-custom-card", entity: entityId },
        }),
      },
    ]);
    const hass = makeHass([makeState("light.a")]);
    const result = generateCardSuggestions(hass, "light.a");
    expect(result.custom.map((s) => s.config.type)).toContain(
      "custom:my-custom-card"
    );
    expect(
      result.core.every((s) => s.config.type !== "custom:my-custom-card")
    ).toBe(true);
  });

  it("keeps working when a custom card throws", () => {
    cleanupCustom = registerCustomCards([
      {
        type: "broken-card",
        getEntitySuggestion: () => {
          throw new Error("boom");
        },
      },
    ]);
    const hass = makeHass([makeState("light.a")]);
    const result = generateCardSuggestions(hass, "light.a");
    expect(result.custom).toEqual([]);
    // core path still produces tile suggestions
    expect(result.core.some((s) => s.config.type === "tile")).toBe(true);
  });
});

import type { HassEntity } from "home-assistant-js-websocket";
import { afterEach, describe, expect, it } from "vitest";
import { CARD_SUGGESTION_PROVIDERS } from "../../../../src/panels/lovelace/card-suggestions/registry";
import type { CardSuggestionProvider } from "../../../../src/panels/lovelace/card-suggestions/types";
import { generateCardSuggestions } from "../../../../src/panels/lovelace/common/card-suggestions";
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

describe("generateCardSuggestions", () => {
  let cleanupProviders: (() => void) | undefined;

  afterEach(() => {
    cleanupProviders?.();
    cleanupProviders = undefined;
  });

  it("suggests nothing when no entities are picked", () => {
    expect(generateCardSuggestions(makeHass([]), [])).toEqual([]);
  });

  it("suggests nothing when the picked entity doesn't exist", () => {
    expect(generateCardSuggestions(makeHass([]), ["light.ghost"])).toEqual([]);
  });

  it("ignores unknown entities when picking multiple", () => {
    const hass = makeHass([
      makeState("light.a", "on", { supported_color_modes: ["onoff"] }),
    ]);
    // "light.ghost" has no state — only light.a remains, single-entity path.
    const suggestions = generateCardSuggestions(hass, [
      "light.a",
      "light.ghost",
    ]);
    expect(suggestions.some((s) => s.id === "tile")).toBe(true);
    expect(suggestions.every((s) => s.id !== "tile-cards")).toBe(true);
  });

  it("suggests a grid and an entities card when picking multiple entities", () => {
    const hass = makeHass([
      makeState("light.a", "on"),
      makeState("light.b", "on"),
      makeState("light.c", "on"),
    ]);

    const suggestions = generateCardSuggestions(hass, [
      "light.a",
      "light.b",
      "light.c",
    ]);

    expect(suggestions.map((s) => s.id)).toEqual([
      "tile-cards",
      "tile-cards-with-features",
      "entities-card",
    ]);
    expect(suggestions[0].config.type).toBe("grid");
    expect(suggestions[suggestions.length - 1].config).toEqual({
      type: "entities",
      entities: ["light.a", "light.b", "light.c"],
    });
  });

  it("accepts null, a single suggestion, or a list from each provider", () => {
    cleanupProviders = registerTestProviders({
      "test-null": { getEntitySuggestion: () => null },
      "test-single": {
        getEntitySuggestion: (_hass, entityId) => ({
          id: "single",
          label: "Single",
          config: { type: "custom:test-single", entity: entityId },
        }),
      },
      "test-array": {
        getEntitySuggestion: (_hass, entityId) => [
          {
            id: "array-a",
            label: "Array A",
            config: { type: "custom:test-array", entity: entityId },
          },
          {
            id: "array-b",
            label: "Array B",
            config: { type: "custom:test-array", entity: entityId },
          },
        ],
      },
    });

    const hass = makeHass([makeState("sensor.a", "1")]);
    const ids = generateCardSuggestions(hass, ["sensor.a"]).map((s) => s.id);

    expect(ids).toContain("single");
    expect(ids).toContain("array-a");
    expect(ids).toContain("array-b");
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
    const ids = generateCardSuggestions(hass, ["sensor.a"]).map((s) => s.id);
    // Tile still provides its default suggestion for sensor.
    expect(ids).toContain("tile");
  });
});

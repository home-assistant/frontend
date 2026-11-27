import type { HassEntity } from "home-assistant-js-websocket";
import { describe, expect, it } from "vitest";
import { CoverEntityFeature } from "../../../src/data/cover";
import type { ExtEntityRegistryEntry } from "../../../src/data/entity/entity_registry";
import { FanEntityFeature } from "../../../src/data/fan";
import { ValveEntityFeature } from "../../../src/data/valve";
import { getFavoritesDialogHandler } from "../../../src/dialogs/more-info/favorites";
import type { HomeAssistant } from "../../../src/types";

const entity = (
  entity_id: string,
  attributes: HassEntity["attributes"] = {}
): HassEntity =>
  ({
    entity_id,
    state: "on",
    attributes,
    context: { id: "", parent_id: null, user_id: null },
    last_changed: "",
    last_updated: "",
  }) as HassEntity;

const entry = (options: ExtEntityRegistryEntry["options"] = {}) =>
  ({ entity_id: "fan.test", options }) as ExtEntityRegistryEntry;

// The key is enough to tell which labels the menu renders.
const hass = { localize: (key: string) => key } as unknown as HomeAssistant;

const DOMAINS_WITH_RESET: [string, HassEntity][] = [
  [
    "cover",
    entity("cover.test", {
      supported_features: CoverEntityFeature.SET_POSITION,
    }),
  ],
  ["light", entity("light.test", { supported_color_modes: ["hs"] })],
  [
    "valve",
    entity("valve.test", {
      supported_features: ValveEntityFeature.SET_POSITION,
    }),
  ],
  ["timer", entity("timer.test")],
];

describe("getFavoritesDialogHandler", () => {
  it("returns nothing for domains or entities without favorites", () => {
    expect(getFavoritesDialogHandler(entity("switch.test"))).toBeUndefined();
    expect(
      getFavoritesDialogHandler(
        entity("fan.test", { supported_features: FanEntityFeature.OSCILLATE })
      )
    ).toBeUndefined();
  });

  it.each(DOMAINS_WITH_RESET)(
    "keeps the reset option for %s",
    (domain, stateObj) => {
      const handler = getFavoritesDialogHandler(stateObj);
      expect(handler?.domain).toBe(domain);
      expect(handler?.getResetOptions).toBeTypeOf("function");
      expect(handler?.getLabels(hass).reset).toBe(
        `ui.dialogs.more_info_control.${domain}.reset_favorites`
      );
    }
  );

  describe("fan", () => {
    const handler = getFavoritesDialogHandler(
      entity("fan.test", { supported_features: FanEntityFeature.SET_SPEED })
    );

    it("has no reset, since fans have no default favorites", () => {
      expect(handler?.domain).toBe("fan");
      expect(handler?.getResetOptions).toBeUndefined();
      expect(handler?.getLabels(hass).reset).toBeUndefined();
    });

    it("only offers to copy once there are favorites", () => {
      expect(handler?.canCopy?.(entry())).toBe(false);
      expect(
        handler?.canCopy?.(entry({ fan: { favorites: [{ percentage: 50 }] } }))
      ).toBe(true);
    });
  });
});

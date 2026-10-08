import { describe, expect, it } from "vitest";
import { HaCardConditionLocation } from "../../../../../../src/panels/lovelace/editor/conditions/types/ha-card-condition-location";
import type { LocationCondition } from "../../../../../../src/panels/lovelace/common/validate-condition";
import type { HomeAssistant } from "../../../../../../src/types";

const HASS = {
  states: {
    "zone.home": {
      entity_id: "zone.home",
      state: "0",
      attributes: { friendly_name: "Home" },
    },
    "zone.store_1": {
      entity_id: "zone.store_1",
      state: "0",
      attributes: { friendly_name: "Store 1" },
    },
    "zone.store_2": {
      entity_id: "zone.store_2",
      state: "0",
      attributes: { friendly_name: "Store 2" },
    },
    // Shares a zone's name but isn't a zone, so convert must ignore it.
    "person.me": {
      entity_id: "person.me",
      state: "home",
      attributes: { friendly_name: "Store 1" },
    },
  },
} as unknown as HomeAssistant;

const createEditor = (condition: LocationCondition) => {
  const editor = document.createElement(
    "ha-card-condition-location"
  ) as HaCardConditionLocation;
  editor.hass = HASS;
  editor.condition = condition;
  return editor;
};

const nextValue = (editor: HaCardConditionLocation) =>
  new Promise<LocationCondition>((resolve) => {
    editor.addEventListener(
      "value-changed",
      (ev) => resolve((ev as CustomEvent).detail.value),
      { once: true }
    );
  });

const formChange = (value: Partial<LocationCondition>) => ({
  detail: { value: { condition: "location", ...value } },
  stopPropagation: () => undefined,
});

const validate = (condition: unknown) =>
  (HaCardConditionLocation as any).validateUIConfig(condition);

describe("ha-card-condition-location", () => {
  describe("value changes", () => {
    it("keeps only locations for a legacy condition", async () => {
      const editor = createEditor({
        condition: "location",
        locations: ["home"],
      });
      const value = nextValue(editor);
      (editor as any)._valueChanged(formChange({ locations: ["Store 1"] }));
      expect(await value).toEqual({
        condition: "location",
        locations: ["Store 1"],
      });
    });

    it("keeps target and away when editing a mixed legacy condition", async () => {
      const editor = createEditor({
        condition: "location",
        locations: ["home"],
        target: { label_id: "store" },
        away: true,
      });
      const value = nextValue(editor);
      (editor as any)._valueChanged(formChange({ locations: ["Store 1"] }));
      expect(await value).toEqual({
        condition: "location",
        locations: ["Store 1"],
        target: { label_id: "store" },
        away: true,
      });
    });

    it("omits away when it is turned off", async () => {
      const editor = createEditor({ condition: "location", target: {} });
      const value = nextValue(editor);
      (editor as any)._valueChanged(
        formChange({ target: { label_id: "store" }, away: false })
      );
      expect(await value).toEqual({
        condition: "location",
        target: { label_id: "store" },
      });
    });

    it("keeps away when it is turned on", async () => {
      const editor = createEditor({ condition: "location", target: {} });
      const value = nextValue(editor);
      (editor as any)._valueChanged(formChange({ away: true }));
      expect(await value).toEqual({
        condition: "location",
        target: {},
        away: true,
      });
    });
  });

  describe("convert", () => {
    it("maps zone names, home and not_home", async () => {
      const editor = createEditor({
        condition: "location",
        locations: ["home", "Store 2", "not_home"],
      });
      const value = nextValue(editor);
      (editor as any)._convert();
      expect(await value).toEqual({
        condition: "location",
        target: { entity_id: ["zone.home", "zone.store_2"] },
        away: true,
      });
    });

    it("merges into an existing target and away", async () => {
      const editor = createEditor({
        condition: "location",
        locations: ["Store 1"],
        target: { entity_id: "zone.store_2", label_id: "store" },
        away: true,
      });
      const value = nextValue(editor);
      (editor as any)._convert();
      expect(await value).toEqual({
        condition: "location",
        target: {
          entity_id: ["zone.store_2", "zone.store_1"],
          label_id: "store",
        },
        away: true,
      });
    });

    it("drops names that match no zone", async () => {
      const editor = createEditor({
        condition: "location",
        locations: ["Store 1", "Away", "Old store"],
      });
      const value = nextValue(editor);
      (editor as any)._convert();
      expect(await value).toEqual({
        condition: "location",
        target: { entity_id: ["zone.store_1"] },
      });
    });

    it("leaves an empty target when nothing matches", async () => {
      const editor = createEditor({
        condition: "location",
        locations: ["Old store"],
      });
      const value = nextValue(editor);
      (editor as any)._convert();
      expect(await value).toEqual({ condition: "location", target: {} });
    });
  });

  describe("validateUIConfig", () => {
    it.each([
      ["locations", { condition: "location", locations: ["home"] }],
      [
        "target and away",
        {
          condition: "location",
          target: { entity_id: "zone.home", label_id: ["store"] },
          away: true,
        },
      ],
    ])("accepts %s", (_name, condition) => {
      expect(() => validate(condition)).not.toThrow();
    });

    it.each([
      ["a target that is not an object", { target: "zone.home" }],
      ["an unknown target key", { target: { zone_id: "zone.home" } }],
      ["a non-boolean away", { target: {}, away: "yes" }],
    ])("rejects %s", (_name, condition) => {
      expect(() => validate({ condition: "location", ...condition })).toThrow();
    });
  });
});

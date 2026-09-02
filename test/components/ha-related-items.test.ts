import { describe, expect, it } from "vitest";
import type { HassEntity } from "home-assistant-js-websocket";
import "../../src/components/ha-related-items";
import type { HaRelatedItems } from "../../src/components/ha-related-items";
import type { RelatedResult } from "../../src/data/search";
import type { HomeAssistant } from "../../src/types";

const entity = (entityId: string): HassEntity =>
  ({
    entity_id: entityId,
    state: "on",
    attributes: { friendly_name: entityId },
  }) as HassEntity;

const buildElement = (states: string[]) => {
  const el = document.createElement("ha-related-items") as HaRelatedItems;
  el.hass = {
    states: Object.fromEntries(states.map((id) => [id, entity(id)])),
    devices: { known_device: { id: "known_device", name: "Known" } },
    areas: { known_area: { area_id: "known_area", name: "Known" } },
    language: "en",
  } as unknown as HomeAssistant;
  el.itemType = "entity";
  el.itemId = "light.test";
  return el;
};

/**
 * `_getSections` decides whether a section renders at all. It is private, so
 * reach it through an index signature rather than naming the member.
 */
const sectionsOf = (el: HaRelatedItems, related: RelatedResult) =>
  (
    el as unknown as Record<
      string,
      (related: RelatedResult) => Record<string, unknown>
    >
  )._getSections(related);

describe("ha-related-items sections", () => {
  it("keeps a section whose items resolve", () => {
    const el = buildElement(["automation.used"]);

    expect(
      sectionsOf(el, { automation: ["automation.used"] }).automation
    ).toEqual([entity("automation.used")]);
  });

  it("drops a section the backend returned empty", () => {
    const el = buildElement(["automation.used"]);
    const sections = sectionsOf(el, {
      automation: ["automation.used"],
      scene: [],
    });

    expect(sections.scene).toBeUndefined();
  });

  it("drops a section whose items no longer exist", () => {
    const el = buildElement([]);
    const sections = sectionsOf(el, {
      automation: ["automation.deleted"],
      device: ["missing_device"],
      area: ["missing_area"],
    });

    expect(sections.automation).toBeUndefined();
    expect(sections.device).toBeUndefined();
    expect(sections.area).toBeUndefined();
  });

  it("drops an excluded section even when it has items", () => {
    const el = buildElement([]);
    el.exclude = ["device", "area"];
    const sections = sectionsOf(el, {
      device: ["known_device"],
      area: ["known_area"],
    });

    expect(sections.device).toBeUndefined();
    expect(sections.area).toBeUndefined();
  });

  it("reports every section as absent when nothing resolves", () => {
    const el = buildElement([]);
    const sections = sectionsOf(el, { automation: ["automation.deleted"] });

    expect(Object.values(sections).every((items) => !items)).toBe(true);
  });
});

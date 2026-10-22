import { describe, expect, test } from "vitest";

import type { TriggerDescriptions } from "../../../../src/data/trigger";
import type { HomeAssistant } from "../../../../src/types";
import { createMockEntityState, createMockHass } from "../../../fixtures/hass";
import "../../../../src/panels/config/automation/add-automation-element-dialog";

const triggerDescriptions: TriggerDescriptions = {
  "epex.current_hour_crossed_threshold": {
    target: {
      entity: [{ domain: "sensor", translation_key: "epex_current_hour" }],
    },
    fields: {},
  },
};

const manifests = {
  epex: { domain: "epex", integration_type: "entity" },
};

const setupDialog = () => {
  const el = document.createElement("add-automation-element-dialog") as any;
  const state = createMockEntityState("sensor.home_current_hour", "0.15");
  el.hass = createMockHass(
    { "sensor.home_current_hour": state },
    { entities: {} }
  );
  el._params = { type: "trigger" };
  el._manifests = manifests;
  el._triggerDescriptions = triggerDescriptions;
  return el;
};

describe("add automation element dialog active system domains", () => {
  test("activates a domain when its registry entry arrives after the dialog opened", () => {
    const el = setupDialog();

    const before = el._systemDomains;
    expect(before.active.has("epex")).toBe(false);

    const state = createMockEntityState("sensor.home_current_hour", "0.15");
    el.hass = createMockHass(
      { "sensor.home_current_hour": state },
      {
        entities: {
          "sensor.home_current_hour": {
            entity_id: "sensor.home_current_hour",
            translation_key: "epex_current_hour",
          },
        } as unknown as HomeAssistant["entities"],
      }
    );

    const after = el._systemDomains;
    expect(after).not.toBe(before);
    expect(after.active.has("epex")).toBe(true);
  });

  test("returns the same system domains after an unrelated state change", () => {
    const el = setupDialog();

    const before = el._systemDomains;
    expect(before.active.has("epex")).toBe(false);

    const state = createMockEntityState("sensor.home_current_hour", "0.14");
    el.hass = createMockHass(
      { "sensor.home_current_hour": state },
      { entities: {} }
    );

    expect(el._systemDomains).toBe(before);
  });

  test("collection groups recompute when the active system domains change", () => {
    const el = setupDialog();

    const inactive = el._systemDomains;
    const active = {
      active: new Set(["epex"]),
      byEntityDomain: new Map<string, Set<string>>(),
    };
    const domains = new Set(["sensor"]);
    const services = {};
    const conditionDescriptions = {};
    const collections: never[] = [];

    const collectionsWithInactive = el._getCollections(
      "trigger",
      collections,
      domains,
      inactive,
      el.hass.localize,
      services,
      triggerDescriptions,
      conditionDescriptions,
      manifests
    );
    expect(
      el._getCollections(
        "trigger",
        collections,
        domains,
        inactive,
        el.hass.localize,
        services,
        triggerDescriptions,
        conditionDescriptions,
        manifests
      )
    ).toBe(collectionsWithInactive);

    expect(
      el._getCollections(
        "trigger",
        collections,
        domains,
        active,
        el.hass.localize,
        services,
        triggerDescriptions,
        conditionDescriptions,
        manifests
      )
    ).not.toBe(collectionsWithInactive);
  });
});

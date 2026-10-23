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

const createHass = (entities: unknown, stateValue = "0.15"): HomeAssistant =>
  createMockHass(
    {
      "sensor.home_current_hour": createMockEntityState(
        "sensor.home_current_hour",
        stateValue
      ),
    },
    { entities: entities as HomeAssistant["entities"] }
  );

const setupDialog = (entities: unknown = {}) => {
  const el = document.createElement("add-automation-element-dialog") as any;
  el.hass = createHass(entities);
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

    el.hass = createHass({
      "sensor.home_current_hour": {
        entity_id: "sensor.home_current_hour",
        translation_key: "epex_current_hour",
      },
    });

    const after = el._systemDomains;
    expect(after).not.toBe(before);
    expect(after.active.has("epex")).toBe(true);
  });

  // The identity must stay stable while the content is unchanged, otherwise
  // the collection groups rebuild on every state change.
  test("returns the same system domains after an unrelated state change", () => {
    const el = setupDialog();

    const before = el._systemDomains;
    expect(before.active.has("epex")).toBe(false);

    el.hass = createHass({}, "0.14");

    expect(el._systemDomains).toBe(before);
  });
});

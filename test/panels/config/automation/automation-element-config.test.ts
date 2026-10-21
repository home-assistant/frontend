import { describe, expect, it } from "vitest";
import {
  getActionPickerKey,
  getTriggerPickerKey,
  isActionReplaceable,
  isConditionReplaceable,
  isTriggerReplaceable,
} from "../../../../src/panels/config/automation/automation-element-config";
import type { Condition } from "../../../../src/data/automation";
import type { Action } from "../../../../src/data/script";
import type { TriggerDescriptions } from "../../../../src/data/trigger";

describe("replaceable items", () => {
  it("excludes containers, which hold nested items", () => {
    expect(isTriggerReplaceable({ triggers: [] })).toBe(false);
    expect(isConditionReplaceable({ condition: "and", conditions: [] })).toBe(
      false
    );
    expect(
      isConditionReplaceable({ condition: [] } as unknown as Condition)
    ).toBe(false);

    const containers = [
      { choose: [] },
      { if: [], then: [] },
      { parallel: [] },
      { sequence: [] },
      { wait_for_trigger: [] },
      { repeat: { count: 2, sequence: [] } },
      { repeat: { while: [], sequence: [] } },
      // Only reachable through YAML, but still holds a sequence.
      { repeat: { sequence: [] } },
      { condition: "or", conditions: [] },
      { and: [] },
      { condition: [] },
    ] as unknown as Action[];
    containers.forEach((action) =>
      expect(isActionReplaceable(action), JSON.stringify(action)).toBe(false)
    );
  });

  it("includes everything else", () => {
    expect(isTriggerReplaceable({ trigger: "state", entity_id: [] })).toBe(
      true
    );
    expect(
      isConditionReplaceable({ condition: "state", entity_id: "", state: "" })
    ).toBe(true);

    const items = [
      { action: "light.turn_on" },
      { delay: "00:00:05" },
      { condition: "state", entity_id: "", state: "" },
      { variables: {} },
      { stop: "" },
      { event: "test" },
    ] as unknown as Action[];
    items.forEach((action) =>
      expect(isActionReplaceable(action), JSON.stringify(action)).toBe(true)
    );
  });
});

describe("picker keys", () => {
  const descriptions = { sun: { fields: {} } } as TriggerDescriptions;

  it("marks platforms as dynamic, also before their descriptions load", () => {
    expect(getTriggerPickerKey({ trigger: "light.turned_on" }, {})).toBe(
      "__DYNAMIC__light.turned_on"
    );
    expect(getTriggerPickerKey({ trigger: "sun" }, descriptions)).toBe(
      "__DYNAMIC__sun"
    );
    expect(
      getTriggerPickerKey({ trigger: "state", entity_id: [] }, descriptions)
    ).toBe("state");
  });

  it("uses the dialog's keys for actions", () => {
    expect(getActionPickerKey({ action: "light.turn_on" })).toBe(
      "__DYNAMIC__light.turn_on"
    );
    // A templated service has no domain to group it by.
    expect(getActionPickerKey({ action: "{{ service }}" })).toBe("service");
    expect(getActionPickerKey({ delay: "00:00:05" })).toBe("delay");
    expect(
      getActionPickerKey({ condition: "state", entity_id: "", state: "" })
    ).toBe("condition");
  });
});

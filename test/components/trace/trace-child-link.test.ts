import { describe, expect, it } from "vitest";
import { computeChildTraceName } from "../../../src/components/trace/trace-child-link";
import type { HomeAssistant } from "../../../src/types";
import {
  mockEntityEntry,
  mockStateObj,
} from "../../common/entity/context/context-mock";

const hass = {
  states: {
    "script.child_renamed": mockStateObj({
      entity_id: "script.child_renamed",
      attributes: { friendly_name: "Child A" },
    }),
  },
} as unknown as HomeAssistant;

const entityReg = [
  // A script whose entity id was renamed: the trace keeps the config id.
  mockEntityEntry({
    entity_id: "script.child_renamed",
    platform: "script",
    unique_id: "child_a",
  }),
  // An automation with the same config id as the script.
  mockEntityEntry({
    entity_id: "automation.same_id",
    platform: "automation",
    unique_id: "child_a",
  }),
];

describe("computeChildTraceName", () => {
  it("names the script by its config id, not its entity id", () => {
    expect(
      computeChildTraceName(hass, entityReg, {
        domain: "script",
        item_id: "child_a",
        run_id: "run_1",
      })
    ).toBe("Child A");
  });

  it("falls back to the entity id when the entity has no state", () => {
    expect(
      computeChildTraceName(hass, entityReg, {
        domain: "automation",
        item_id: "child_a",
        run_id: "run_2",
      })
    ).toBe("automation.same_id");
  });

  it("has no name for a removed script or an automation without an id", () => {
    expect(
      computeChildTraceName(hass, entityReg, {
        domain: "script",
        item_id: "removed_script",
        run_id: "run_3",
      })
    ).toBeUndefined();
  });
});

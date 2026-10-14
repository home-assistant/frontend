import { describe, expect, it } from "vitest";
import { getNestedConfigFromPath, getTraceUrl } from "../../src/data/trace";

// Trace links from the logbook and from trace steps share this URL. Automation
// ids are free-form, and the automation router decodes the path segment, so
// an unencoded "/", "?" or "#" would open the wrong page or drop the run.
describe("getTraceUrl", () => {
  it("links to the run on the trace page of the item", () => {
    expect(
      getTraceUrl({ domain: "script", item_id: "child_a", run_id: "run_1" })
    ).toBe("/config/script/trace/child_a?run_id=run_1");
  });

  it("encodes an automation id so it survives as one path segment", () => {
    const itemId = "kitchen/lights?on#1 %";
    const url = getTraceUrl({
      domain: "automation",
      item_id: itemId,
      run_id: "run_1",
    });

    const parsed = new URL(url, "http://localhost");
    const segment = parsed.pathname.split("/").pop()!;
    expect(parsed.pathname).toBe(
      "/config/automation/trace/kitchen%2Flights%3Fon%231%20%25"
    );
    expect(decodeURIComponent(segment)).toBe(itemId);
    expect(parsed.searchParams.get("run_id")).toBe("run_1");
  });
});

// Core traces the conditions of an `if` action under `if/condition/<n>` while
// the config keeps them directly in the `if` list, so the path details must
// skip that segment or they hand the whole list to the condition describer.
describe("getNestedConfigFromPath", () => {
  const stateCondition = {
    condition: "state",
    entity_id: "light.a",
    state: "off",
  };
  const ifAction = {
    if: [{ condition: "or", conditions: [stateCondition] }],
    then: [],
  };

  it("resolves the conditions of an if action", () => {
    expect(getNestedConfigFromPath(ifAction, ["if", "condition", "0"])).toBe(
      ifAction.if[0]
    );
  });

  it("keeps the condition for its traced entity ids", () => {
    const path = ["if", "condition", "0", "conditions", "0", "entity_id", "0"];
    expect(getNestedConfigFromPath(ifAction, path)).toBe(stateCondition);

    const listCondition = { ...stateCondition, entity_id: ["light.a"] };
    const listAction = { if: [listCondition], then: [] };
    expect(
      getNestedConfigFromPath(listAction, [
        "if",
        "condition",
        "0",
        "entity_id",
        "0",
      ])
    ).toBe(listCondition);
  });

  it("resolves a template string condition", () => {
    const templateAction = {
      if: ["{{ is_state('light.a', 'off') }}"],
      then: [],
    };
    expect(
      getNestedConfigFromPath(templateAction, ["if", "condition", "0"])
    ).toBe(templateAction.if[0]);
  });

  it("keeps the selected config when the path does not exist", () => {
    expect(getNestedConfigFromPath(ifAction, ["else", "0"])).toBe(ifAction);
  });
});

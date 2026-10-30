import { describe, expect, it } from "vitest";
import {
  getNestedStepConfig,
  getTracedEntityId,
  getTraceUrl,
} from "../../src/data/trace";

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

// The step details of a trace describe nested steps by following their trace
// path through the config of the selected step. Core traces the conditions of
// an `if` action as `if/condition/<index>`, while the config keeps them in `if`.
describe("getNestedStepConfig", () => {
  const stateCondition = {
    condition: "state",
    entity_id: "input_boolean.a",
    state: "off",
  };
  const orCondition = { condition: "or", conditions: [stateCondition] };

  it("follows the conditions of a choose option", () => {
    const config = { choose: [{ conditions: [orCondition], sequence: [] }] };

    expect(getNestedStepConfig(config, "choose/0/conditions/0")).toBe(
      orCondition
    );
    expect(
      getNestedStepConfig(config, "choose/0/conditions/0/conditions/0")
    ).toBe(stateCondition);
  });

  it("follows the conditions of an if action", () => {
    const config = { if: [orCondition], then: [] };

    expect(getNestedStepConfig(config, "if/condition/0")).toBe(orCondition);
    expect(getNestedStepConfig(config, "if/condition/0/conditions/0")).toBe(
      stateCondition
    );
    expect(
      getNestedStepConfig(config, "if/condition/0/conditions/0/entity_id/0")
    ).toBe(stateCondition);
  });

  it("follows an if action with a single condition", () => {
    const config = { if: stateCondition, then: [] };

    expect(getNestedStepConfig(config, "if/condition/0")).toBe(stateCondition);
  });

  it("follows nested conditions of a single condition", () => {
    const config = { if: orCondition, then: [] };

    expect(getNestedStepConfig(config, "if/condition/0/conditions/0")).toBe(
      stateCondition
    );
  });

  it("returns template conditions written as plain strings", () => {
    const template = "{{ is_state('light.a', 'off') }}";

    expect(
      getNestedStepConfig({ if: [template], then: [] }, "if/condition/0")
    ).toBe(template);
    expect(
      getNestedStepConfig({ if: template, then: [] }, "if/condition/0")
    ).toBe(template);
    expect(
      getNestedStepConfig(
        { choose: [{ conditions: [template], sequence: [] }] },
        "choose/0/conditions/0"
      )
    ).toBe(template);
  });

  it("stops at a state condition with a list of entities", () => {
    const condition = {
      condition: "state",
      entity_id: ["light.a", "light.b"],
      state: "off",
    };
    const config = { if: [condition], then: [] };

    expect(getNestedStepConfig(config, "if/condition/0/entity_id/1")).toBe(
      condition
    );
  });
});

describe("getTracedEntityId", () => {
  it("returns the entity checked by an entity_id step", () => {
    const condition = {
      condition: "state",
      entity_id: ["light.a", "light.b"],
      state: "off",
    };

    expect(getTracedEntityId(condition, "if/condition/0/entity_id/1")).toBe(
      "light.b"
    );
    expect(
      getTracedEntityId(
        { condition: "state", entity_id: "light.a", state: "off" },
        "entity_id/0"
      )
    ).toBe("light.a");
  });

  it("handles a single entity and indexes outside the list", () => {
    expect(getTracedEntityId({ entity_id: "light.a" }, "entity_id/1")).toBe(
      "light.a"
    );
    expect(
      getTracedEntityId({ entity_id: ["light.a"] }, "entity_id/1")
    ).toBeUndefined();
  });

  it("ignores steps that are not entity_id steps", () => {
    const condition = { condition: "state", entity_id: "light.a" };

    expect(getTracedEntityId(condition, "if/condition/0")).toBeUndefined();
    expect(
      getTracedEntityId("{{ true }}", "if/condition/0/entity_id/0")
    ).toBeUndefined();
  });
});

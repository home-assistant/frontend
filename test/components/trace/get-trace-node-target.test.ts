import { describe, expect, it } from "vitest";
import { getTraceNodeTarget } from "../../../src/components/trace/get_trace_node_target";

describe("getTraceNodeTarget", () => {
  it("uses the explicit target when present", () => {
    expect(
      getTraceNodeTarget(
        { action: "light.turn_on", target: { area_id: "kitchen" } },
        "action"
      )
    ).toEqual({ area_id: "kitchen" });
  });

  it("shows the device for a device action, not its registry entity id", () => {
    expect(
      getTraceNodeTarget(
        {
          type: "turn_on",
          device_id: "abc123",
          entity_id: "0f2d7c9e1b6a4f3c8d5e2a1b0c9d8e7f",
          domain: "light",
        },
        "action"
      )
    ).toEqual({ device_id: ["abc123"] });
  });

  it("uses entity_id for an action without a device", () => {
    expect(
      getTraceNodeTarget(
        { action: "light.turn_on", entity_id: "light.kitchen" },
        "action"
      )
    ).toEqual({ entity_id: ["light.kitchen"] });
  });

  it("returns undefined for an action without any target", () => {
    expect(getTraceNodeTarget({ delay: 5 }, "action")).toBeUndefined();
  });

  it("uses entity_id for state triggers and conditions", () => {
    expect(
      getTraceNodeTarget(
        { trigger: "state", entity_id: ["light.a", "light.b"] },
        "trigger"
      )
    ).toEqual({ entity_id: ["light.a", "light.b"] });
    expect(
      getTraceNodeTarget(
        { condition: "numeric_state", entity_id: "sensor.temp" },
        "condition"
      )
    ).toEqual({ entity_id: ["sensor.temp"] });
  });

  it("uses device_id for device triggers and conditions", () => {
    expect(
      getTraceNodeTarget(
        { trigger: "device", device_id: "dev1", entity_id: "uuid" },
        "trigger"
      )
    ).toEqual({ device_id: ["dev1"] });
    expect(
      getTraceNodeTarget(
        { condition: "device", device_id: "dev2", entity_id: "uuid" },
        "condition"
      )
    ).toEqual({ device_id: ["dev2"] });
  });

  it("returns undefined for other node types", () => {
    expect(getTraceNodeTarget({ conditions: [] }, "chooseOption")).toBe(
      undefined
    );
    expect(getTraceNodeTarget({ action: "x.y" }, undefined)).toBeUndefined();
  });
});

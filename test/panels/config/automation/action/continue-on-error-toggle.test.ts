import { describe, it, expect } from "vitest";
import type { NonConditionAction } from "../../../../../src/data/script";

/**
 * Helper function that mirrors the toggle logic from ha-automation-action-row.ts
 * This tests the core logic without needing to instantiate the full component.
 */
function toggleContinueOnError(action: NonConditionAction): NonConditionAction {
  const continueOnError = !(action.continue_on_error ?? false);
  if (continueOnError) {
    return { ...action, continue_on_error: true };
  }
  const result = { ...action };
  delete result.continue_on_error;
  return result;
}

describe("continue_on_error toggle", () => {
  it("should enable continue_on_error when currently undefined", () => {
    const action: NonConditionAction = {
      action: "light.turn_on",
      target: { entity_id: "light.bedroom" },
    };

    const result = toggleContinueOnError(action);

    expect(result.continue_on_error).toBe(true);
    expect(result.action).toBe("light.turn_on");
  });

  it("should enable continue_on_error when currently false", () => {
    const action: NonConditionAction = {
      action: "light.turn_on",
      continue_on_error: false,
    };

    const result = toggleContinueOnError(action);

    expect(result.continue_on_error).toBe(true);
  });

  it("should remove continue_on_error when currently true", () => {
    const action: NonConditionAction = {
      action: "light.turn_on",
      target: { entity_id: "light.bedroom" },
      continue_on_error: true,
    };

    const result = toggleContinueOnError(action);

    expect(result.continue_on_error).toBeUndefined();
    expect(result.action).toBe("light.turn_on");
    expect(result.target).toEqual({ entity_id: "light.bedroom" });
  });

  it("should preserve other action properties when toggling on", () => {
    const action: NonConditionAction = {
      alias: "Turn on bedroom light",
      action: "light.turn_on",
      target: { entity_id: "light.bedroom" },
      data: { brightness: 255 },
      enabled: true,
    };

    const result = toggleContinueOnError(action);

    expect(result.continue_on_error).toBe(true);
    expect(result.alias).toBe("Turn on bedroom light");
    expect(result.action).toBe("light.turn_on");
    expect(result.target).toEqual({ entity_id: "light.bedroom" });
    expect(result.data).toEqual({ brightness: 255 });
    expect(result.enabled).toBe(true);
  });

  it("should preserve other action properties when toggling off", () => {
    const action: NonConditionAction = {
      alias: "Turn on bedroom light",
      action: "light.turn_on",
      target: { entity_id: "light.bedroom" },
      continue_on_error: true,
      enabled: false,
    };

    const result = toggleContinueOnError(action);

    expect(result.continue_on_error).toBeUndefined();
    expect(result.alias).toBe("Turn on bedroom light");
    expect(result.enabled).toBe(false);
  });

  it("should work with delay action", () => {
    const action: NonConditionAction = {
      delay: "00:00:05",
    };

    const result = toggleContinueOnError(action);

    expect(result.continue_on_error).toBe(true);
    expect((result as any).delay).toBe("00:00:05");
  });

  it("should work with event action", () => {
    const action: NonConditionAction = {
      event: "custom_event",
      event_data: { key: "value" },
    };

    const result = toggleContinueOnError(action);

    expect(result.continue_on_error).toBe(true);
    expect((result as any).event).toBe("custom_event");
  });
});

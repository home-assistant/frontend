import type { HassEntity } from "home-assistant-js-websocket";
import { describe, expect, it } from "vitest";
import {
  supportsTimerActionsCardFeature,
  TIMER_ACTIONS_BUTTON,
} from "../../../../src/panels/lovelace/card-features/hui-timer-actions-card-feature";
import type { HomeAssistant } from "../../../../src/types";

const entity = (entityId: string, state = "idle"): HassEntity =>
  ({
    entity_id: entityId,
    state,
    attributes: {},
    last_changed: "",
    last_updated: "",
    context: { id: "", parent_id: null, user_id: null },
  }) as HassEntity;

const hassWith = (...entities: HassEntity[]): HomeAssistant =>
  ({
    states: Object.fromEntries(entities.map((e) => [e.entity_id, e])),
  }) as unknown as HomeAssistant;

describe("supportsTimerActionsCardFeature", () => {
  it("supports a timer entity", () => {
    const stateObj = entity("timer.test");
    const hass = hassWith(stateObj);
    expect(
      supportsTimerActionsCardFeature(hass, { entity_id: stateObj.entity_id })
    ).toBe(true);
  });

  it("does not support other domains", () => {
    const stateObj = entity("switch.test");
    const hass = hassWith(stateObj);
    expect(
      supportsTimerActionsCardFeature(hass, { entity_id: stateObj.entity_id })
    ).toBe(false);
  });

  it("does not support a context with no entity_id", () => {
    const hass = hassWith();
    expect(supportsTimerActionsCardFeature(hass, {})).toBe(false);
  });
});

describe("TIMER_ACTIONS_BUTTON", () => {
  it("shows start when the timer is idle or paused", () => {
    for (const state of ["idle", "paused"]) {
      const button = TIMER_ACTIONS_BUTTON.start(entity("timer.test", state));
      expect(button.translationKey).toBe("start");
      expect(button.serviceName).toBe("start");
      expect(button.disabled).toBe(false);
    }
  });

  it("shows restart when the timer is active", () => {
    const button = TIMER_ACTIONS_BUTTON.start(entity("timer.test", "active"));
    expect(button.translationKey).toBe("restart");
    expect(button.serviceName).toBe("start");
    expect(button.disabled).toBe(false);
  });

  it("only enables pause when the timer is active", () => {
    expect(
      TIMER_ACTIONS_BUTTON.pause(entity("timer.test", "active")).disabled
    ).toBe(false);
    expect(
      TIMER_ACTIONS_BUTTON.pause(entity("timer.test", "paused")).disabled
    ).toBe(true);
    expect(
      TIMER_ACTIONS_BUTTON.pause(entity("timer.test", "idle")).disabled
    ).toBe(true);
  });

  it("disables cancel and finish when the timer is idle", () => {
    for (const action of ["cancel", "finish"]) {
      expect(
        TIMER_ACTIONS_BUTTON[action](entity("timer.test", "idle")).disabled
      ).toBe(true);
      expect(
        TIMER_ACTIONS_BUTTON[action](entity("timer.test", "active")).disabled
      ).toBe(false);
      expect(
        TIMER_ACTIONS_BUTTON[action](entity("timer.test", "paused")).disabled
      ).toBe(false);
    }
  });
});

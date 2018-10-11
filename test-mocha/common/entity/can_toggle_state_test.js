import { assert } from "chai";

import canToggleState from "../../../src/common/entity/can_toggle_state";

describe("canToggleState", () => {
  const hass = {
    services: {
      light: {
        turn_on: null, // Service keys only need to be present for test
        turn_off: null,
      },
    },
  };

  it("Detects lights toggle", () => {
    const stateObj = {
      entity_id: "light.bla",
      state: "on",
    };
    assert.isTrue(canToggleState(hass, stateObj));
  });

  it("Detects group with toggle", () => {
    const stateObj = {
      entity_id: "group.bla",
      state: "on",
    };
    assert.isTrue(canToggleState(hass, stateObj));
  });

  it("Detects group without toggle", () => {
    const stateObj = {
      entity_id: "group.devices",
      state: "home",
    };
    assert.isFalse(canToggleState(hass, stateObj));
  });

  it("Detects climate with toggle", () => {
    const stateObj = {
      entity_id: "climate.bla",
      attributes: {
        supported_features: 4096,
      },
    };
    assert.isTrue(canToggleState(hass, stateObj));
  });

  it("Detects climate without toggle", () => {
    const stateObj = {
      entity_id: "climate.bla",
    };
    assert.isFalse(canToggleState(hass, stateObj));
  });
});

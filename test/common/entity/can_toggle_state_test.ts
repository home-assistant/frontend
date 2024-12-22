import { assert } from "chai";

import { canToggleState } from "../../../src/common/entity/can_toggle_state";

describe("canToggleState", () => {
  const hass: any = {
    services: {
      light: {
        turn_on: null, // Service keys only need to be present for test
        turn_off: null,
      },
    },
    states: {
      "light.bla": { entity_id: "light.bla" },
      "light.test": { entity_id: "light.test" },
    },
  };

  it("Detects lights toggle", () => {
    const stateObj: any = {
      entity_id: "light.bla",
      state: "on",
    };
    assert.isTrue(canToggleState(hass, stateObj));
  });

  it("Detects group with toggle", () => {
    const stateObj: any = {
      entity_id: "group.bla",
      state: "on",
      attributes: {
        entity_id: ["light.bla", "light.test"],
      },
    };

    assert.isTrue(canToggleState(hass, stateObj));
  });

  it("Detects group without toggle", () => {
    const stateObj: any = {
      entity_id: "group.devices",
      state: "home",
    };
    assert.isFalse(canToggleState(hass, stateObj));
  });

  it("Detects climate with toggle", () => {
    const stateObj: any = {
      entity_id: "climate.bla",
      attributes: {
        supported_features: 4096,
      },
    };
    assert.isTrue(canToggleState(hass, stateObj));
  });

  it("Detects climate without toggle", () => {
    const stateObj: any = {
      entity_id: "climate.bla",
      attributes: {
        supported_features: 0,
      },
    };
    assert.isFalse(canToggleState(hass, stateObj));
  });
});

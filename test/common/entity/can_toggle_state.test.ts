import { assert, describe, it } from "vitest";

import { canToggleState } from "../../../src/common/entity/can_toggle_state";
import { ClimateEntityFeature } from "../../../src/data/climate";
import { CoverEntityFeature } from "../../../src/data/cover";

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
        supported_features:
          ClimateEntityFeature.TURN_ON + ClimateEntityFeature.TURN_OFF,
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

  it("Detects tilt only cover with toggle", () => {
    const stateObj: any = {
      entity_id: "cover.blinds",
      attributes: {
        supported_features:
          CoverEntityFeature.OPEN_TILT + CoverEntityFeature.CLOSE_TILT,
      },
    };
    assert.isTrue(canToggleState(hass, stateObj));
  });

  it("Detects cover with toggle", () => {
    const stateObj: any = {
      entity_id: "cover.blinds",
      attributes: {
        supported_features: CoverEntityFeature.OPEN + CoverEntityFeature.CLOSE,
      },
    };
    assert.isTrue(canToggleState(hass, stateObj));
  });

  it("Detects cover without toggle", () => {
    const stateObj: any = {
      entity_id: "cover.blinds",
      attributes: {
        supported_features: 0,
      },
    };
    assert.isFalse(canToggleState(hass, stateObj));
  });

  // Tilt actions it does not support must not be offered either.
  it("Detects cover that only stops its tilt without toggle", () => {
    const stateObj: any = {
      entity_id: "cover.blinds",
      attributes: {
        supported_features: CoverEntityFeature.STOP_TILT,
      },
    };
    assert.isFalse(canToggleState(hass, stateObj));
  });

  it("Detects cover that only opens its tilt without toggle", () => {
    const stateObj: any = {
      entity_id: "cover.blinds",
      attributes: {
        supported_features: CoverEntityFeature.OPEN_TILT,
      },
    };
    assert.isFalse(canToggleState(hass, stateObj));
  });

  it("Detects group with missing entity", () => {
    const stateObj: any = {
      entity_id: "group.bla",
      state: "on",
      attributes: {
        entity_id: ["light.non_existing"],
      },
    };

    assert.isFalse(canToggleState(hass, stateObj));
  });

  it("Detects group with off state", () => {
    const stateObj: any = {
      entity_id: "group.bla",
      state: "off",
      attributes: {
        entity_id: ["light.test"],
      },
    };

    assert.isTrue(canToggleState(hass, stateObj));
  });
});

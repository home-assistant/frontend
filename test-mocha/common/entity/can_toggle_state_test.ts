import { assert } from "chai";

import canToggleState from "../../../src/common/entity/can_toggle_state";
import { HomeAssistant } from "../../../src/types";
import { HassEntity } from "home-assistant-js-websocket";

describe("canToggleState", () => {
  // @ts-ignore
  // tslint:disable-next-line
  const hass = <HomeAssistant>{
    services: {
      light: {
        turn_on: null, // Service keys only need to be present for test
        turn_off: null,
      },
    },
  };

  it("Detects lights toggle", () => {
    // tslint:disable-next-line
    const stateObj = <HassEntity>{
      entity_id: "light.bla",
      state: "on",
    };
    assert.isTrue(canToggleState(hass, stateObj));
  });

  it("Detects group with toggle", () => {
    // tslint:disable-next-line
    const stateObj = <HassEntity>{
      entity_id: "group.bla",
      state: "on",
    };
    assert.isTrue(canToggleState(hass, stateObj));
  });

  it("Detects group without toggle", () => {
    // tslint:disable-next-line
    const stateObj = <HassEntity>{
      entity_id: "group.devices",
      state: "home",
    };
    assert.isFalse(canToggleState(hass, stateObj));
  });

  it("Detects climate with toggle", () => {
    // tslint:disable-next-line
    const stateObj = <HassEntity>{
      entity_id: "climate.bla",
      attributes: {
        supported_features: 4096,
      },
    };
    assert.isTrue(canToggleState(hass, stateObj));
  });

  it("Detects climate without toggle", () => {
    // tslint:disable-next-line
    const stateObj = <HassEntity>{
      entity_id: "climate.bla",
    };
    assert.isFalse(canToggleState(hass, stateObj));
  });
});

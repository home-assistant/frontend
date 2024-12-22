import { assert } from "chai";

import { stateCardType } from "../../../src/common/entity/state_card_type";

describe("stateCardType", () => {
  const hass: any = {
    services: {
      light: {
        turn_on: null, // Service keys only need to be present for test
        turn_off: null,
      },
    },
  };

  it("Returns display for unavailable states", () => {
    const stateObj: any = {
      state: "unavailable",
    };
    assert.strictEqual(stateCardType(hass, stateObj), "display");
  });

  it("Returns media_player for media_player states", () => {
    const stateObj: any = {
      entity_id: "media_player.bla",
    };
    assert.strictEqual(stateCardType(hass, stateObj), "media_player");
  });

  it("Returns toggle for states that can toggle", () => {
    const stateObj: any = {
      entity_id: "light.bla",
      attributes: {},
    };
    assert.strictEqual(stateCardType(hass, stateObj), "toggle");
  });

  it("Returns display for states with hidden control", () => {
    const stateObj: any = {
      entity_id: "light.bla",
      attributes: {
        control: "hidden",
      },
    };
    assert.strictEqual(stateCardType(hass, stateObj), "display");
  });

  it("Returns display for entities that cannot toggle", () => {
    const stateObj: any = {
      entity_id: "sensor.bla",
    };
    assert.strictEqual(stateCardType(hass, stateObj), "display");
  });
});

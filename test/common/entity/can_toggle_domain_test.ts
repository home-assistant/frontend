import { assert } from "chai";

import { canToggleDomain } from "../../../src/common/entity/can_toggle_domain";

describe("canToggleDomain", () => {
  const hass: any = {
    services: {
      light: {
        turn_on: null, // Service keys only need to be present for test
        turn_off: null,
      },
      lock: {
        lock: null,
        unlock: null,
      },
      sensor: {
        custom_service: null,
      },
    },
  };

  it("Detects lights toggle", () => {
    assert.isTrue(canToggleDomain(hass, "light"));
  });

  it("Detects locks toggle", () => {
    assert.isTrue(canToggleDomain(hass, "lock"));
  });

  it("Detects sensors do not toggle", () => {
    assert.isFalse(canToggleDomain(hass, "sensor"));
  });

  it("Detects binary sensors do not toggle", () => {
    assert.isFalse(canToggleDomain(hass, "binary_sensor"));
  });
});

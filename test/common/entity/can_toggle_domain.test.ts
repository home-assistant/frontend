import { assert, describe, it } from "vitest";

import { canToggleDomain } from "../../../src/common/entity/can_toggle_domain";
import type { HomeAssistant } from "../../../src/types";

describe("canToggleDomain", () => {
  const hass: any = {
    services: {
      light: {
        turn_on: null, // Service keys only need to be present for test
        turn_off: null,
      },
      sensor: {
        custom_service: null,
      },
    },
  };

  it("Detects lights toggle", () => {
    assert.isTrue(canToggleDomain(hass, "light"));
  });

  it("Detects sensors do not toggle", () => {
    assert.isFalse(canToggleDomain(hass, "sensor"));
  });

  it("Detects binary sensors do not toggle", () => {
    assert.isFalse(canToggleDomain(hass, "binary_sensor"));
  });

  it("Detects covers toggle", () => {
    assert.isTrue(
      canToggleDomain(
        {
          services: {
            cover: {
              open_cover: null,
            },
          },
        } as unknown as HomeAssistant,
        "cover"
      )
    );
    assert.isFalse(
      canToggleDomain(
        {
          services: {
            cover: {
              open: null,
            },
          },
        } as unknown as HomeAssistant,
        "cover"
      )
    );
  });

  it("Detects lock toggle", () => {
    assert.isTrue(
      canToggleDomain(
        {
          services: {
            lock: {
              lock: null,
            },
          },
        } as unknown as HomeAssistant,
        "lock"
      )
    );
    assert.isFalse(
      canToggleDomain(
        {
          services: {
            lock: {
              unlock: null,
            },
          },
        } as unknown as HomeAssistant,
        "lock"
      )
    );
  });
});

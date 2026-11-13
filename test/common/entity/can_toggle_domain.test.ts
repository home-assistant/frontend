import { assert, describe, it } from "vitest";

import type { HassServices } from "home-assistant-js-websocket";
import { canToggleDomain } from "../../../src/common/entity/can_toggle_domain";

describe("canToggleDomain", () => {
  const services: any = {
    light: {
      turn_on: null, // Service keys only need to be present for test
      turn_off: null,
    },
    sensor: {
      custom_service: null,
    },
  };

  it("Detects lights toggle", () => {
    assert.isTrue(canToggleDomain(services, "light"));
  });

  it("Detects sensors do not toggle", () => {
    assert.isFalse(canToggleDomain(services, "sensor"));
  });

  it("Detects binary sensors do not toggle", () => {
    assert.isFalse(canToggleDomain(services, "binary_sensor"));
  });

  it("Detects covers toggle", () => {
    assert.isTrue(
      canToggleDomain(
        {
          cover: {
            open_cover: null,
            close_cover: null,
          },
        } as unknown as HassServices,
        "cover"
      )
    );
    assert.isFalse(
      canToggleDomain(
        {
          cover: {
            open: null,
          },
        } as unknown as HassServices,
        "cover"
      )
    );
  });

  it("Detects lock toggle", () => {
    assert.isTrue(
      canToggleDomain(
        {
          lock: {
            lock: null,
            unlock: null,
          },
        } as unknown as HassServices,
        "lock"
      )
    );
    assert.isFalse(
      canToggleDomain(
        {
          lock: {
            unlock: null,
          },
        } as unknown as HassServices,
        "lock"
      )
    );
  });
  it("Scene can toggle", () => {
    assert.isTrue(
      canToggleDomain(
        {
          scene: {
            turn_on: null,
          },
        } as unknown as HassServices,
        "scene"
      )
    );
  });
  it("Button can toggle", () => {
    assert.isTrue(
      canToggleDomain(
        {
          button: {
            press: null,
          },
        } as unknown as HassServices,
        "button"
      )
    );
  });
  it("Any domain can toggle with supported actions", () => {
    assert.isTrue(
      canToggleDomain(
        {
          custom_component: {
            turn_on: null,
            turn_off: null,
          },
        } as unknown as HassServices,
        "custom_component"
      )
    );
    assert.isFalse(
      canToggleDomain(
        {
          custom_component: {
            turn_on: null,
          },
        } as unknown as HassServices,
        "custom_component"
      )
    );
  });
});

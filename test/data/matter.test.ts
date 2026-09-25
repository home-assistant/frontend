import { describe, expect, it } from "vitest";
import type { MatterCommissioningParameters } from "../../src/data/matter";
import {
  canShareMatterDevice,
  matterShareRemainingSeconds,
} from "../../src/data/matter";

const codesOnly: MatterCommissioningParameters = {
  setup_pin_code: 20202021,
  setup_manual_code: "34970112332",
  setup_qr_code: "MT:-24J0AFN00KA0648G00",
};

const withFields: MatterCommissioningParameters = {
  ...codesOnly,
  discriminator: 3840,
  vendor_id: 0xfff1,
  product_id: 0x8000,
  commissioning_timeout: 300,
};

describe("canShareMatterDevice", () => {
  it("shares to Apple Home with the codes alone", () => {
    expect(canShareMatterDevice("apple_home", codesOnly)).toBe(true);
    expect(canShareMatterDevice("apple_home", withFields)).toBe(true);
  });

  it("needs the structured fields for the Android share sheet", () => {
    expect(canShareMatterDevice("app_chooser", codesOnly)).toBe(false);
    expect(
      canShareMatterDevice("app_chooser", { ...codesOnly, discriminator: null })
    ).toBe(false);
    expect(canShareMatterDevice("app_chooser", withFields)).toBe(true);
  });

  it("offers nothing without a target or an open window", () => {
    expect(canShareMatterDevice(undefined, withFields)).toBe(false);
    expect(canShareMatterDevice("apple_home", undefined)).toBe(false);
  });
});

describe("matterShareRemainingSeconds", () => {
  const requestedAt = 1_000_000;

  it("is unknown without a timeout or a start", () => {
    expect(
      matterShareRemainingSeconds(undefined, requestedAt, requestedAt)
    ).toBe(undefined);
    expect(matterShareRemainingSeconds(null, requestedAt, requestedAt)).toBe(
      undefined
    );
    expect(matterShareRemainingSeconds(300, undefined, requestedAt)).toBe(
      undefined
    );
  });

  it("counts down in whole seconds", () => {
    expect(matterShareRemainingSeconds(300, requestedAt, requestedAt)).toBe(
      300
    );
    expect(
      matterShareRemainingSeconds(300, requestedAt, requestedAt + 60_500)
    ).toBe(239);
  });

  it("never exceeds the window when the clock went back", () => {
    expect(
      matterShareRemainingSeconds(300, requestedAt, requestedAt - 10_000)
    ).toBe(300);
  });

  it("drops below one second once the window closed", () => {
    expect(
      matterShareRemainingSeconds(300, requestedAt, requestedAt + 300_000)
    ).toBeLessThan(1);
  });
});

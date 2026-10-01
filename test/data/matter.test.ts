import { describe, expect, it } from "vitest";
import type { MatterCommissioningParameters } from "../../src/data/matter";
import {
  matterShareRemainingSeconds,
  matterShareTargetExternal,
} from "../../src/data/matter";
import type { ExternalConfig } from "../../src/external_app/external_messaging";
import type { HomeAssistant } from "../../src/types";

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

const hassWith = (config?: Partial<ExternalConfig>): HomeAssistant =>
  ({
    auth: { external: config ? { config } : undefined },
  }) as unknown as HomeAssistant;

describe("matterShareTargetExternal", () => {
  it("shares to Apple Home with the setup code alone", () => {
    const hass = hassWith({ canShareMatterDeviceToAppleHome: true });
    expect(matterShareTargetExternal(hass, codesOnly)).toBe("apple_home");
    expect(matterShareTargetExternal(hass, withFields)).toBe("apple_home");
  });

  it("needs the window's fields for the app chooser", () => {
    const hass = hassWith({ canShareMatterDeviceToOtherApps: true });
    expect(matterShareTargetExternal(hass, codesOnly)).toBe(undefined);
    expect(
      matterShareTargetExternal(hass, { ...codesOnly, discriminator: null })
    ).toBe(undefined);
    expect(matterShareTargetExternal(hass, withFields)).toBe("app_chooser");
  });

  // Proven to be needed: with this case missing, deleting the discriminator gate left all other
  // assertions green, because every fixture without a discriminator also lacked the timeout.
  it("needs the window's discriminator for the app chooser", () => {
    const hass = hassWith({ canShareMatterDeviceToOtherApps: true });
    expect(
      matterShareTargetExternal(hass, { ...withFields, discriminator: null })
    ).toBe(undefined);
    expect(
      matterShareTargetExternal(hass, {
        ...withFields,
        discriminator: undefined,
      })
    ).toBe(undefined);
  });

  // The chooser opens a window of its own and needs a length for it, which only the server can report.
  it("needs the window's timeout for the app chooser", () => {
    const hass = hassWith({ canShareMatterDeviceToOtherApps: true });
    expect(
      matterShareTargetExternal(hass, {
        ...withFields,
        commissioning_timeout: null,
      })
    ).toBe(undefined);
    expect(
      matterShareTargetExternal(hass, {
        ...withFields,
        commissioning_timeout: undefined,
      })
    ).toBe(undefined);
  });

  // Apple Home reads the setup code, so it is offered for a window the server reported nothing else for.
  it("still offers Apple Home without the window's timeout", () => {
    expect(
      matterShareTargetExternal(
        hassWith({ canShareMatterDeviceToAppleHome: true }),
        { ...withFields, commissioning_timeout: null }
      )
    ).toBe("apple_home");
  });

  // 0 is a legal 12-bit discriminator, so the gate asks whether the server reported one, not whether
  // the value is truthy.
  it("offers the app chooser for a discriminator of zero", () => {
    expect(
      matterShareTargetExternal(
        hassWith({ canShareMatterDeviceToOtherApps: true }),
        { ...withFields, discriminator: 0 }
      )
    ).toBe("app_chooser");
  });

  // At most one capability is meant to be true; Apple Home wins if an app breaks that.
  it("prefers Apple Home when an app reports both capabilities", () => {
    expect(
      matterShareTargetExternal(
        hassWith({
          canShareMatterDeviceToAppleHome: true,
          canShareMatterDeviceToOtherApps: true,
        }),
        withFields
      )
    ).toBe("apple_home");
  });

  it("offers nothing without an app, a capability or an open window", () => {
    expect(matterShareTargetExternal(hassWith(), withFields)).toBe(undefined);
    expect(matterShareTargetExternal(hassWith({}), withFields)).toBe(undefined);
    expect(
      matterShareTargetExternal(
        hassWith({ canShareMatterDeviceToAppleHome: true }),
        undefined
      )
    ).toBe(undefined);
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

  // A reported timeout of 0 is a closed window, not an unknown one: the only input the null check moved.
  it("reports a timeout of zero as no time left", () => {
    expect(matterShareRemainingSeconds(0, requestedAt, requestedAt)).toBe(0);
  });

  it("counts down in whole seconds", () => {
    expect(matterShareRemainingSeconds(300, requestedAt, requestedAt)).toBe(
      300
    );
    expect(
      matterShareRemainingSeconds(300, requestedAt, requestedAt + 60_500)
    ).toBe(239);
  });

  // Zero is a real timestamp, so the guard asks whether a window is open, not whether the value is truthy.
  it("counts from a requestedAt of zero", () => {
    expect(matterShareRemainingSeconds(300, 0, 10_000)).toBe(290);
  });

  it("never exceeds the window when the clock went back", () => {
    expect(
      matterShareRemainingSeconds(300, requestedAt, requestedAt - 10_000)
    ).toBe(300);
  });

  it("drops below one second once the window closed", () => {
    expect(
      matterShareRemainingSeconds(300, requestedAt, requestedAt + 300_000)
    ).toBe(0);
  });
});

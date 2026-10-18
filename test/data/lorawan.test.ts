import { describe, expect, it } from "vitest";
import { strongestLoRaWANReception } from "../../src/data/lorawan";

describe("strongestLoRaWANReception", () => {
  it("keeps RSSI and SNR from the same gateway", () => {
    const weak = { gateway_id: "garden", rssi: -98, snr: 12 };
    const strong = { gateway_id: "home", rssi: -61, snr: 4 };
    expect(strongestLoRaWANReception([weak, strong])).toBe(strong);
  });

  it("ignores missing RSSI without treating zero as missing", () => {
    const zero = { gateway_id: "home", rssi: 0, snr: null };
    expect(
      strongestLoRaWANReception([
        { gateway_id: "unknown", rssi: null, snr: 4 },
        zero,
      ])
    ).toBe(zero);
  });

  it("has no strongest reception when no RSSI was received", () => {
    expect(strongestLoRaWANReception([])).toBeUndefined();
    expect(
      strongestLoRaWANReception([{ gateway_id: "unknown", rssi: null, snr: 4 }])
    ).toBeUndefined();
  });
});

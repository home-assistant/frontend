import { describe, expect, it } from "vitest";

import type { BluetoothScannerState } from "../../src/data/bluetooth";
import { isScannerStateMismatch } from "../../src/data/bluetooth";

const state = (
  overrides: Partial<BluetoothScannerState>
): BluetoothScannerState => ({
  source: "AA:BB:CC:DD:EE:FF",
  adapter: "hci0",
  current_mode: null,
  requested_mode: null,
  ...overrides,
});

describe("isScannerStateMismatch", () => {
  it("is never a mismatch when requested mode is auto", () => {
    expect(
      isScannerStateMismatch(
        state({ requested_mode: "auto", current_mode: "passive" })
      )
    ).toBe(false);
    expect(
      isScannerStateMismatch(
        state({ requested_mode: "auto", current_mode: "active" })
      )
    ).toBe(false);
    expect(
      isScannerStateMismatch(
        state({ requested_mode: "auto", current_mode: null })
      )
    ).toBe(false);
  });

  it("flags a mismatch when requested and current differ", () => {
    expect(
      isScannerStateMismatch(
        state({ requested_mode: "active", current_mode: "passive" })
      )
    ).toBe(true);
    expect(
      isScannerStateMismatch(
        state({ requested_mode: "passive", current_mode: "active" })
      )
    ).toBe(true);
    expect(
      isScannerStateMismatch(
        state({ requested_mode: "active", current_mode: null })
      )
    ).toBe(true);
  });

  it("is not a mismatch when requested and current agree", () => {
    expect(
      isScannerStateMismatch(
        state({ requested_mode: "active", current_mode: "active" })
      )
    ).toBe(false);
    expect(
      isScannerStateMismatch(
        state({ requested_mode: "passive", current_mode: "passive" })
      )
    ).toBe(false);
  });
});

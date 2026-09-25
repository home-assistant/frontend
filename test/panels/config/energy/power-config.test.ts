import { describe, expect, it } from "vitest";

import { isPowerConfigValid } from "../../../../src/panels/config/energy/dialogs/power-config";

describe("isPowerConfigValid", () => {
  it("accepts any config when no power sensor is configured", () => {
    expect(isPowerConfigValid("none", {})).toBe(true);
    expect(isPowerConfigValid("none", { stat_rate: "sensor.power" })).toBe(
      true
    );
  });

  it("requires a rate statistic for the standard type", () => {
    expect(isPowerConfigValid("standard", {})).toBe(false);
    expect(isPowerConfigValid("standard", { stat_rate: "" })).toBe(false);
    expect(isPowerConfigValid("standard", { stat_rate: "sensor.power" })).toBe(
      true
    );
    expect(
      isPowerConfigValid("standard", { stat_rate_inverted: "sensor.power" })
    ).toBe(false);
  });

  it("requires an inverted rate statistic for the inverted type", () => {
    expect(isPowerConfigValid("inverted", {})).toBe(false);
    expect(isPowerConfigValid("inverted", { stat_rate: "sensor.power" })).toBe(
      false
    );
    expect(
      isPowerConfigValid("inverted", { stat_rate_inverted: "sensor.power" })
    ).toBe(true);
  });

  it("requires both statistics for the two sensors type", () => {
    expect(isPowerConfigValid("two_sensors", {})).toBe(false);
    expect(
      isPowerConfigValid("two_sensors", { stat_rate_from: "sensor.power_from" })
    ).toBe(false);
    expect(
      isPowerConfigValid("two_sensors", { stat_rate_to: "sensor.power_to" })
    ).toBe(false);
    expect(
      isPowerConfigValid("two_sensors", {
        stat_rate_from: "sensor.power_from",
        stat_rate_to: "sensor.power_to",
      })
    ).toBe(true);
  });

  it("rejects unknown power types", () => {
    expect(
      isPowerConfigValid("unexpected" as never, { stat_rate: "sensor.power" })
    ).toBe(false);
  });
});

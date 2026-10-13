import { assert, describe, it } from "vitest";
import { getPowerHelperEntityId } from "../../../../src/panels/config/energy/dialogs/power-config";

describe("getPowerHelperEntityId", () => {
  it("returns the helper for an inverted config", () => {
    const powerConfig = { stat_rate_inverted: "sensor.battery_power" };
    assert.strictEqual(
      getPowerHelperEntityId(
        {
          stat_rate: "sensor.battery_power_inverted",
          power_config: powerConfig,
        },
        { ...powerConfig }
      ),
      "sensor.battery_power_inverted"
    );
  });

  it("returns the helper for a two sensor config", () => {
    const powerConfig = {
      stat_rate_from: "sensor.discharge",
      stat_rate_to: "sensor.charge",
    };
    assert.strictEqual(
      getPowerHelperEntityId(
        {
          stat_rate: "sensor.energy_battery_discharge_charge_net_power",
          power_config: powerConfig,
        },
        { ...powerConfig }
      ),
      "sensor.energy_battery_discharge_charge_net_power"
    );
  });

  it("returns nothing for a standard config, as no helper is created", () => {
    const powerConfig = { stat_rate: "sensor.battery_power" };
    assert.isUndefined(
      getPowerHelperEntityId(
        { stat_rate: "sensor.battery_power", power_config: powerConfig },
        { ...powerConfig }
      )
    );
  });

  it("returns nothing for a legacy config without power_config", () => {
    assert.isUndefined(
      getPowerHelperEntityId({ stat_rate: "sensor.battery_power" }, {})
    );
  });

  it("returns nothing when the config was edited", () => {
    assert.isUndefined(
      getPowerHelperEntityId(
        {
          stat_rate: "sensor.battery_power_inverted",
          power_config: { stat_rate_inverted: "sensor.battery_power" },
        },
        { stat_rate_inverted: "sensor.other_battery_power" }
      )
    );
  });

  it("returns nothing for an unsaved source", () => {
    assert.isUndefined(
      getPowerHelperEntityId(undefined, {
        stat_rate_inverted: "sensor.battery_power",
      })
    );
  });
});

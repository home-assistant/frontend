import { render } from "lit";
import { assert, describe, it } from "vitest";
import "../../../../src/panels/config/energy/dialogs/ha-energy-power-config";
import type { HaEnergyPowerConfig } from "../../../../src/panels/config/energy/dialogs/ha-energy-power-config";
import type { PowerConfig } from "../../../../src/data/energy";
import {
  getPowerHelperEntityId,
  type PowerType,
} from "../../../../src/panels/config/energy/dialogs/power-config";

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

// Renders the template directly so the async unit lookup in willUpdate is
// skipped. localize echoes the key back.
const renderPickers = (powerType: PowerType, powerConfig: PowerConfig) => {
  const el = document.createElement(
    "ha-energy-power-config"
  ) as HaEnergyPowerConfig;
  el.hass = { localize: (key: string) => key } as any;
  el.powerType = powerType;
  el.powerConfig = powerConfig;

  const container = document.createElement("div");
  render((el as any).render(), container);

  return [...container.querySelectorAll("ha-statistic-picker")].map(
    (picker: any) => ({
      required: picker.required,
      invalid: picker.invalid,
      errorMessage: picker.errorMessage,
    })
  );
};

describe("ha-energy-power-config required power statistic", () => {
  it("renders no picker when no power sensor is configured", () => {
    assert.lengthOf(renderPickers("none", {}), 0);
  });

  it("marks an empty standard statistic as required and invalid", () => {
    assert.deepEqual(renderPickers("standard", {}), [
      {
        required: true,
        invalid: true,
        errorMessage: "ui.common.error_required",
      },
    ]);
  });

  it("keeps the statistic required but valid once it is set", () => {
    const [picker] = renderPickers("standard", { stat_rate: "sensor.power" });
    assert.isTrue(picker.required);
    assert.isFalse(picker.invalid);
  });

  it("marks an empty inverted statistic as required and invalid", () => {
    const [picker] = renderPickers("inverted", {});
    assert.isTrue(picker.required);
    assert.isTrue(picker.invalid);
  });

  it("does not flag the inverted statistic when it is set", () => {
    const [picker] = renderPickers("inverted", {
      stat_rate_inverted: "sensor.power",
    });
    assert.isFalse(picker.invalid);
  });

  it("flags both two sensor statistics while they are empty", () => {
    const pickers = renderPickers("two_sensors", {});
    assert.lengthOf(pickers, 2);
    assert.deepEqual(
      pickers.map((p) => p.invalid),
      [true, true]
    );
  });

  // The two sensor statistics exclude each other, so they keep their clear
  // button — and therefore no required marker — to stay swappable.
  it("does not mark the two sensor statistics as required", () => {
    const pickers = renderPickers("two_sensors", {});
    assert.deepEqual(
      pickers.map((p) => p.required),
      [false, false]
    );
  });

  it("flags only the statistic that is still missing", () => {
    const pickers = renderPickers("two_sensors", {
      stat_rate_from: "sensor.power_from",
    });
    assert.deepEqual(
      pickers.map((p) => p.invalid),
      [false, true]
    );
  });

  it("clears both flags once the two sensor pair is complete", () => {
    const pickers = renderPickers("two_sensors", {
      stat_rate_from: "sensor.power_from",
      stat_rate_to: "sensor.power_to",
    });
    assert.deepEqual(
      pickers.map((p) => p.invalid),
      [false, false]
    );
  });
});

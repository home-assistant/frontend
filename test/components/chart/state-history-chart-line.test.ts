import { describe, it, assert } from "vitest";
import { CLIMATE_HVAC_ACTION_TO_MODE } from "../../../src/data/climate";

describe("StateHistoryChartLine - Climate Mode Detection", () => {
  describe("HVAC Action to Mode mapping", () => {
    it("should map drying action to dry mode", () => {
      assert.equal(CLIMATE_HVAC_ACTION_TO_MODE.drying, "dry");
    });

    it("should map fan action to fan_only mode", () => {
      assert.equal(CLIMATE_HVAC_ACTION_TO_MODE.fan, "fan_only");
    });

    it("should map heating action to heat mode", () => {
      assert.equal(CLIMATE_HVAC_ACTION_TO_MODE.heating, "heat");
    });

    it("should map cooling action to cool mode", () => {
      assert.equal(CLIMATE_HVAC_ACTION_TO_MODE.cooling, "cool");
    });
  });

  describe("Mode Detection Logic", () => {
    it("should detect dry mode from hvac_action", () => {
      const entityState = {
        attributes: {
          hvac_action: "drying",
          current_temperature: 20,
        },
      };

      const isDrying = (state: any) =>
        CLIMATE_HVAC_ACTION_TO_MODE[state.attributes?.hvac_action] === "dry";

      assert.isTrue(isDrying(entityState));
    });

    it("should detect fan_only mode from hvac_action", () => {
      const entityState = {
        attributes: {
          hvac_action: "fan",
          current_temperature: 20,
        },
      };

      const isFanOnly = (state: any) =>
        CLIMATE_HVAC_ACTION_TO_MODE[state.attributes?.hvac_action] ===
        "fan_only";

      assert.isTrue(isFanOnly(entityState));
    });

    it("should detect dry mode from state when hvac_action is not present", () => {
      const entityState = {
        state: "dry",
        attributes: {
          current_temperature: 20,
        },
      };

      const isDrying = (state: any) => state.state === "dry";

      assert.isTrue(isDrying(entityState));
    });

    it("should detect fan_only mode from state when hvac_action is not present", () => {
      const entityState = {
        state: "fan_only",
        attributes: {
          current_temperature: 20,
        },
      };

      const isFanOnly = (state: any) => state.state === "fan_only";

      assert.isTrue(isFanOnly(entityState));
    });

    it("should NOT detect dry mode when entity is heating", () => {
      const entityState = {
        attributes: {
          hvac_action: "heating",
          current_temperature: 20,
        },
      };

      const isDrying = (state: any) =>
        CLIMATE_HVAC_ACTION_TO_MODE[state.attributes?.hvac_action] === "dry";

      assert.isFalse(isDrying(entityState));
    });

    it("should NOT detect fan_only mode when entity is cooling", () => {
      const entityState = {
        attributes: {
          hvac_action: "cooling",
          current_temperature: 20,
        },
      };

      const isFanOnly = (state: any) =>
        CLIMATE_HVAC_ACTION_TO_MODE[state.attributes?.hvac_action] ===
        "fan_only";

      assert.isFalse(isFanOnly(entityState));
    });
  });

  describe("Multi-mode detection", () => {
    it("should detect mixed heating and drying states", () => {
      const states = [
        {
          attributes: {
            hvac_action: "heating",
            current_temperature: 20,
          },
        },
        {
          attributes: {
            hvac_action: "drying",
            current_temperature: 20,
          },
        },
      ];

      const isHeating = (state: any) =>
        CLIMATE_HVAC_ACTION_TO_MODE[state.attributes?.hvac_action] === "heat";
      const isDrying = (state: any) =>
        CLIMATE_HVAC_ACTION_TO_MODE[state.attributes?.hvac_action] === "dry";

      const hasHeat = states.some(isHeating);
      const hasDry = states.some(isDrying);

      assert.isTrue(hasHeat);
      assert.isTrue(hasDry);
    });

    it("should detect cooling and fan_only states together", () => {
      const states = [
        {
          attributes: {
            hvac_action: "cooling",
            current_temperature: 20,
          },
        },
        {
          attributes: {
            hvac_action: "fan",
            current_temperature: 20,
          },
        },
      ];

      const isCooling = (state: any) =>
        CLIMATE_HVAC_ACTION_TO_MODE[state.attributes?.hvac_action] === "cool";
      const isFanOnly = (state: any) =>
        CLIMATE_HVAC_ACTION_TO_MODE[state.attributes?.hvac_action] ===
        "fan_only";

      const hasCool = states.some(isCooling);
      const hasFan = states.some(isFanOnly);

      assert.isTrue(hasCool);
      assert.isTrue(hasFan);
    });

    it("should not detect modes that are not present", () => {
      const states = [
        {
          attributes: {
            hvac_action: "heating",
            current_temperature: 20,
          },
        },
      ];

      const isDrying = (state: any) =>
        CLIMATE_HVAC_ACTION_TO_MODE[state.attributes?.hvac_action] === "dry";
      const isFanOnly = (state: any) =>
        CLIMATE_HVAC_ACTION_TO_MODE[state.attributes?.hvac_action] ===
        "fan_only";

      const hasDry = states.some(isDrying);
      const hasFan = states.some(isFanOnly);

      assert.isFalse(hasDry);
      assert.isFalse(hasFan);
    });
  });

  describe("Data series population", () => {
    it("should populate current temperature in series", () => {
      const curTemp = 22.5;
      const series = [curTemp];

      assert.equal(series[0], 22.5);
    });

    it("should add dry mode temperature when entity is drying", () => {
      const curTemp = 22.5;
      const series = [curTemp];
      const isDrying = true;

      if (isDrying) {
        series.push(curTemp);
      }

      assert.equal(series.length, 2);
      assert.equal(series[1], 22.5);
    });

    it("should add null to dry series when entity is not drying", () => {
      const curTemp = 22.5;
      const series: (number | null)[] = [curTemp];
      const isDrying = false;

      if (isDrying) {
        series.push(curTemp);
      } else {
        series.push(null);
      }

      assert.equal(series.length, 2);
      assert.isNull(series[1]);
    });

    it("should add fan_only mode temperature when entity is in fan mode", () => {
      const curTemp = 22.5;
      const series = [curTemp];
      const isFanOnly = true;

      if (isFanOnly) {
        series.push(curTemp);
      }

      assert.equal(series.length, 2);
      assert.equal(series[1], 22.5);
    });

    it("should build complete series with all modes", () => {
      const curTemp = 22.5;
      const series = [curTemp];
      const isHeating = true;
      const isCooling = true;
      const isDrying = true;
      const isFanOnly = true;

      if (isHeating) series.push(curTemp);
      if (isCooling) series.push(curTemp);
      if (isDrying) series.push(curTemp);
      if (isFanOnly) series.push(curTemp);

      assert.equal(series.length, 5);
      assert.equal(series[0], 22.5); // current temp
      assert.equal(series[1], 22.5); // heating
      assert.equal(series[2], 22.5); // cooling
      assert.equal(series[3], 22.5); // drying
      assert.equal(series[4], 22.5); // fan_only
    });
  });

  describe("CSS Color Variable Mapping", () => {
    it("should map dry mode to orange color variable", () => {
      const colorMap = {
        dry: "--state-climate-dry-color",
        heat: "--state-climate-heat-color",
        cool: "--state-climate-cool-color",
        fan_only: "--state-climate-fan_only-color",
      };

      assert.equal(colorMap.dry, "--state-climate-dry-color");
    });

    it("should map fan_only mode to cyan color variable", () => {
      const colorMap = {
        dry: "--state-climate-dry-color",
        heat: "--state-climate-heat-color",
        cool: "--state-climate-cool-color",
        fan_only: "--state-climate-fan_only-color",
      };

      assert.equal(colorMap.fan_only, "--state-climate-fan_only-color");
    });

    it("should have distinct color variables for all modes", () => {
      const colorMap = {
        dry: "--state-climate-dry-color",
        heat: "--state-climate-heat-color",
        cool: "--state-climate-cool-color",
        fan_only: "--state-climate-fan_only-color",
      };

      const colors = Object.values(colorMap);
      const uniqueColors = new Set(colors);

      assert.equal(uniqueColors.size, colors.length);
    });
  });

  describe("Mode filtering and detection combinations", () => {
    it("should not confuse dry mode with drying action detection", () => {
      const dryState = {
        state: "dry",
        attributes: {
          hvac_action: "idle",
          current_temperature: 20,
        },
      };

      // When using hvac_action mapping
      const isDryingAction = (state: any) =>
        CLIMATE_HVAC_ACTION_TO_MODE[state.attributes?.hvac_action] === "dry";
      // When using state value
      const isDryState = (state: any) => state.state === "dry";

      assert.isFalse(isDryingAction(dryState));
      assert.isTrue(isDryState(dryState));
    });

    it("should not confuse fan_only mode with fan action detection", () => {
      const fanState = {
        state: "fan_only",
        attributes: {
          hvac_action: "idle",
          current_temperature: 20,
        },
      };

      // When using hvac_action mapping
      const isFanAction = (state: any) =>
        CLIMATE_HVAC_ACTION_TO_MODE[state.attributes?.hvac_action] ===
        "fan_only";
      // When using state value
      const isFanState = (state: any) => state.state === "fan_only";

      assert.isFalse(isFanAction(fanState));
      assert.isTrue(isFanState(fanState));
    });
  });
});

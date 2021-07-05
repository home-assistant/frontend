import { assert } from "chai";
import { computeStateDisplay } from "../../../src/common/entity/compute_state_display";
import { UNKNOWN } from "../../../src/data/entity";
import {
  FrontendLocaleData,
  NumberFormat,
  TimeFormat,
} from "../../../src/data/translation";

let localeData: FrontendLocaleData;

describe("computeStateDisplay", () => {
  // Mock Localize function for testing
  const localize = (message, ...args) =>
    message + (args.length ? ": " + args.join(",") : "");

  beforeEach(() => {
    localeData = {
      language: "en",
      number_format: NumberFormat.comma_decimal,
      time_format: TimeFormat.am_pm,
    };
  });

  it("Localizes binary sensor defaults", () => {
    const stateObj: any = {
      entity_id: "binary_sensor.test",
      state: "off",
      attributes: {},
    };
    assert.strictEqual(
      computeStateDisplay(localize, stateObj, localeData),
      "component.binary_sensor.state._.off"
    );
  });

  it("Localizes binary sensor device class", () => {
    const stateObj: any = {
      entity_id: "binary_sensor.test",
      state: "off",
      attributes: {
        device_class: "moisture",
      },
    };
    assert.strictEqual(
      computeStateDisplay(localize, stateObj, localeData),
      "component.binary_sensor.state.moisture.off"
    );
  });

  it("Localizes binary sensor invalid device class", () => {
    const altLocalize = (message, ...args) => {
      if (message === "state.binary_sensor.invalid_device_class.off") {
        return "";
      }
      return localize(message, ...args);
    };
    const stateObj: any = {
      entity_id: "binary_sensor.test",
      state: "off",
      attributes: {
        device_class: "invalid_device_class",
      },
    };
    assert.strictEqual(
      computeStateDisplay(altLocalize, stateObj, localeData),
      "component.binary_sensor.state.invalid_device_class.off"
    );
  });

  it("Localizes sensor value with units", () => {
    const stateObj: any = {
      entity_id: "sensor.test",
      state: "123",
      attributes: {
        unit_of_measurement: "m",
      },
    };
    assert.strictEqual(
      computeStateDisplay(localize, stateObj, localeData),
      "123 m"
    );
  });

  it("Localizes and formats numeric sensor value with units", () => {
    const stateObj: any = {
      entity_id: "sensor.test",
      state: "1234.5",
      attributes: {
        unit_of_measurement: "m",
      },
    };
    assert.strictEqual(
      computeStateDisplay(localize, stateObj, localeData),
      "1,234.5 m"
    );
  });

  it("Localizes unknown sensor value with units", () => {
    const altLocalize = (message, ...args) => {
      if (message === "state.sensor.unknown") {
        return "";
      }
      return localize(message, ...args);
    };
    const stateObj: any = {
      entity_id: "sensor.test",
      state: UNKNOWN,
      attributes: {
        unit_of_measurement: "m",
      },
    };
    assert.strictEqual(
      computeStateDisplay(altLocalize, stateObj, localeData),
      "state.default.unknown"
    );
  });

  it("Localizes unavailable sensor value with units", () => {
    const altLocalize = (message, ...args) => {
      if (message === "state.sensor.unavailable") {
        return "";
      }
      return localize(message, ...args);
    };
    const stateObj: any = {
      entity_id: "sensor.test",
      state: "unavailable",
      attributes: {
        unit_of_measurement: "m",
      },
    };
    assert.strictEqual(
      computeStateDisplay(altLocalize, stateObj, localeData),
      "state.default.unavailable"
    );
  });

  it("Localizes sensor value with component translation", () => {
    const altLocalize = (message, ...args) => {
      if (message !== "component.sensor.state._.custom_state") {
        return "";
      }
      return localize(message, ...args);
    };
    const stateObj: any = {
      entity_id: "sensor.test",
      state: "custom_state",
      attributes: {},
    };
    assert.strictEqual(
      computeStateDisplay(altLocalize, stateObj, localeData),
      "component.sensor.state._.custom_state"
    );
  });

  describe("Localizes input_datetime with full date time", () => {
    const stateObj: any = {
      entity_id: "input_datetime.test",
      state: "123",
      attributes: {
        has_date: true,
        has_time: true,
        year: 2017,
        month: 11,
        day: 18,
        hour: 23,
        minute: 12,
        second: 13,
      },
    };
    it("Uses am/pm time format", () => {
      assert.strictEqual(
        computeStateDisplay(localize, stateObj, localeData),
        "November 18, 2017, 11:12 PM"
      );
    });
    it("Uses 24h time format", () => {
      localeData.time_format = TimeFormat.twenty_four;
      assert.strictEqual(
        computeStateDisplay(localize, stateObj, localeData),
        "November 18, 2017, 23:12"
      );
    });
  });

  it("Localizes input_datetime with date", () => {
    const stateObj: any = {
      entity_id: "input_datetime.test",
      state: "123",
      attributes: {
        has_date: true,
        has_time: false,
        year: 2017,
        month: 11,
        day: 18,
        hour: 23,
        minute: 12,
        second: 13,
      },
    };
    assert.strictEqual(
      computeStateDisplay(localize, stateObj, localeData),
      "November 18, 2017"
    );
  });

  describe("Localizes input_datetime with time", () => {
    const stateObj: any = {
      entity_id: "input_datetime.test",
      state: "123",
      attributes: {
        has_date: false,
        has_time: true,
        year: 2017,
        month: 11,
        day: 18,
        hour: 23,
        minute: 12,
        second: 13,
      },
    };
    it("Uses am/pm time format", () => {
      localeData.time_format = TimeFormat.am_pm;
      assert.strictEqual(
        computeStateDisplay(localize, stateObj, localeData),
        "11:12 PM"
      );
    });
    it("Uses 24h time format", () => {
      localeData.time_format = TimeFormat.twenty_four;
      assert.strictEqual(
        computeStateDisplay(localize, stateObj, localeData),
        "23:12"
      );
    });
  });

  describe("Localizes input_datetime state parameter with full date time", () => {
    const stateObj: any = {
      entity_id: "input_datetime.test",
      state: "123",
      attributes: {
        has_date: true,
        has_time: true,
        year: 2021,
        month: 6,
        day: 13,
        hour: 15,
        minute: 26,
        second: 36,
      },
    };
    it("Uses am/pm time format", () => {
      assert.strictEqual(
        computeStateDisplay(
          localize,
          stateObj,
          localeData,
          "2021-07-04 15:40:03"
        ),
        "July 4, 2021, 3:40 PM"
      );
    });
    it("Uses 24h time format", () => {
      localeData.time_format = TimeFormat.twenty_four;
      assert.strictEqual(
        computeStateDisplay(
          localize,
          stateObj,
          localeData,
          "2021-07-04 15:40:03"
        ),
        "July 4, 2021, 15:40"
      );
    });
  });

  it("Localizes input_datetime state parameter with date", () => {
    const stateObj: any = {
      entity_id: "input_datetime.test",
      state: "123",
      attributes: {
        has_date: true,
        has_time: false,
        year: 2021,
        month: 6,
        day: 13,
        hour: 15,
        minute: 26,
        second: 36,
      },
    };
    assert.strictEqual(
      computeStateDisplay(localize, stateObj, localeData, "2021-07-04"),
      "July 4, 2021"
    );
  });

  describe("Localizes input_datetime state parameter with time", () => {
    const stateObj: any = {
      entity_id: "input_datetime.test",
      state: "123",
      attributes: {
        has_date: false,
        has_time: true,
        year: 2021,
        month: 6,
        day: 13,
        hour: 15,
        minute: 26,
        second: 36,
      },
    };
    it("Uses am/pm time format", () => {
      localeData.time_format = TimeFormat.am_pm;
      assert.strictEqual(
        computeStateDisplay(localize, stateObj, localeData, "17:05:07"),
        "5:05 PM"
      );
    });
    it("Uses 24h time format", () => {
      localeData.time_format = TimeFormat.twenty_four;
      assert.strictEqual(
        computeStateDisplay(localize, stateObj, localeData, "17:05:07"),
        "17:05"
      );
    });
  });

  it("Localizes unavailable", () => {
    const altLocalize = (message, ...args) => {
      if (message === "state.sensor.unavailable") {
        return "";
      }
      return localize(message, ...args);
    };
    const stateObj: any = {
      entity_id: "sensor.test",
      state: "unavailable",
      attributes: {},
    };
    assert.strictEqual(
      computeStateDisplay(altLocalize, stateObj, localeData),
      "state.default.unavailable"
    );
  });

  it("Localizes custom state", () => {
    const altLocalize = () =>
      // No matches can be found
      "";
    const stateObj: any = {
      entity_id: "sensor.test",
      state: "My Custom State",
      attributes: {},
    };
    assert.strictEqual(
      computeStateDisplay(altLocalize, stateObj, localeData),
      "My Custom State"
    );
  });
});

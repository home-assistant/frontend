import { describe, expect, it } from "vitest";
import { computeStateToParts } from "../../../src/common/entity/compute_state_display";
import {
  unitFromParts,
  unitPosition,
  valueFromParts,
} from "../../../src/common/entity/value_parts";
import type { FrontendLocaleData } from "../../../src/data/translation";
import {
  DateFormat,
  FirstWeekday,
  NumberFormat,
  TimeFormat,
  TimeZone,
} from "../../../src/data/translation";
import { demoConfig } from "../../../src/fake_data/demo_config";
import type { ValuePart } from "../../../src/types";

describe("valueFromParts", () => {
  it("keeps the sign and drops the unit when the symbol leads", () => {
    const parts: ValuePart[] = [
      { type: "value", value: "-" },
      { type: "unit", value: "$" },
      { type: "value", value: "12.00" },
    ];
    expect(valueFromParts(parts)).toBe("-12.00");
  });

  it("keeps the sign and drops the unit when the symbol trails", () => {
    const parts: ValuePart[] = [
      { type: "value", value: "-12,00" },
      { type: "literal", value: " " },
      { type: "unit", value: "€" },
    ];
    expect(valueFromParts(parts)).toBe("-12,00");
  });

  it("trims the literal left behind by a leading unit", () => {
    const parts: ValuePart[] = [
      { type: "unit", value: "€" },
      { type: "literal", value: " " },
      { type: "value", value: "-12,00" },
    ];
    expect(valueFromParts(parts)).toBe("-12,00");
  });

  it("returns the value unchanged when there is no unit", () => {
    const parts: ValuePart[] = [{ type: "value", value: "21" }];
    expect(valueFromParts(parts)).toBe("21");
  });
});

describe("unitFromParts", () => {
  it("returns the unit value", () => {
    const parts: ValuePart[] = [
      { type: "value", value: "21" },
      { type: "literal", value: " " },
      { type: "unit", value: "°C" },
    ];
    expect(unitFromParts(parts)).toBe("°C");
  });

  it("returns an empty string when there is no unit", () => {
    const parts: ValuePart[] = [{ type: "value", value: "21" }];
    expect(unitFromParts(parts)).toBe("");
  });
});

describe("unitPosition", () => {
  it("is before when the symbol sits between the sign and digits ($-12)", () => {
    const parts: ValuePart[] = [
      { type: "value", value: "-" },
      { type: "unit", value: "$" },
      { type: "value", value: "12.00" },
    ];
    expect(unitPosition(parts)).toBe("before");
  });

  it("is before when the symbol leads (€ -12)", () => {
    const parts: ValuePart[] = [
      { type: "unit", value: "€" },
      { type: "literal", value: " " },
      { type: "value", value: "-12,00" },
    ];
    expect(unitPosition(parts)).toBe("before");
  });

  it("is after when the symbol trails (-12 €)", () => {
    const parts: ValuePart[] = [
      { type: "value", value: "-12,00" },
      { type: "literal", value: " " },
      { type: "unit", value: "€" },
    ];
    expect(unitPosition(parts)).toBe("after");
  });
});

describe("negative monetary parts", () => {
  const localize = ((message: string) => message) as any;
  const localeData: FrontendLocaleData = {
    language: "en",
    number_format: NumberFormat.comma_decimal,
    time_format: TimeFormat.am_pm,
    date_format: DateFormat.language,
    time_zone: TimeZone.local,
    first_weekday: FirstWeekday.language,
  };
  const stateObj: any = {
    entity_id: "sensor.balance",
    state: "-12",
    attributes: { device_class: "monetary", unit_of_measurement: "USD" },
  };

  it("keep the sign with the value and expose the symbol as the unit", () => {
    const parts = computeStateToParts(
      localize,
      stateObj,
      localeData,
      demoConfig,
      {}
    );
    expect(valueFromParts(parts)).toBe("-12.00");
    expect(unitFromParts(parts)).toBe("$");
  });
});

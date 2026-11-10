import { describe, expect, it } from "vitest";
import {
  sortWeekdays,
  weekdaysFromFirst,
} from "../../../src/common/datetime/sort_weekdays";
import {
  FirstWeekday,
  type FrontendLocaleData,
} from "../../../src/data/translation";

const sundayLocale = {
  language: "en-US",
  first_weekday: FirstWeekday.sunday,
} as FrontendLocaleData;
const mondayLocale = {
  language: "en-US",
  first_weekday: FirstWeekday.monday,
} as FrontendLocaleData;

describe("weekdaysFromFirst", () => {
  it("starts the week on the locale's first weekday", () => {
    expect(weekdaysFromFirst(sundayLocale)).toEqual([
      "sun",
      "mon",
      "tue",
      "wed",
      "thu",
      "fri",
      "sat",
    ]);
    expect(weekdaysFromFirst(mondayLocale)).toEqual([
      "mon",
      "tue",
      "wed",
      "thu",
      "fri",
      "sat",
      "sun",
    ]);
  });
});

describe("sortWeekdays", () => {
  it("sorts selected weekdays in week order", () => {
    expect(sortWeekdays(mondayLocale, ["mon", "wed", "tue", "fri"])).toEqual([
      "mon",
      "tue",
      "wed",
      "fri",
    ]);
  });

  it("places sunday according to the locale's first weekday", () => {
    expect(sortWeekdays(sundayLocale, ["sat", "sun", "mon"])).toEqual([
      "sun",
      "mon",
      "sat",
    ]);
    expect(sortWeekdays(mondayLocale, ["sat", "sun", "mon"])).toEqual([
      "mon",
      "sat",
      "sun",
    ]);
  });

  it("keeps unknown values after the weekdays without reordering them", () => {
    expect(sortWeekdays(mondayLocale, ["b", "tue", "a", "mon"])).toEqual([
      "mon",
      "tue",
      "b",
      "a",
    ]);
  });

  it("does not mutate the input", () => {
    const days = ["wed", "mon"];
    sortWeekdays(mondayLocale, days);
    expect(days).toEqual(["wed", "mon"]);
  });
});

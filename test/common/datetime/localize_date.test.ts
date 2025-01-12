import { describe, it, expect } from "vitest";
import {
  localizeWeekdays,
  localizeMonths,
} from "../../../src/common/datetime/localize_date";

describe("localizeWeekdays", () => {
  it("should return long weekday names in English", () => {
    const weekdays = localizeWeekdays("en-US", false);
    expect(weekdays).toEqual([
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ]);
  });

  it("should return short weekday names in English", () => {
    const weekdays = localizeWeekdays("en-US", true);
    expect(weekdays).toEqual(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
  });

  // Add more tests for different languages if needed
});

describe("localizeMonths", () => {
  it("should return long month names in English", () => {
    const months = localizeMonths("en-US", false);
    expect(months).toEqual([
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ]);
  });

  it("should return short month names in English", () => {
    const months = localizeMonths("en-US", true);
    expect(months).toEqual([
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ]);
  });
});

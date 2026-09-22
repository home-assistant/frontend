import { describe, expect, it } from "vitest";
import {
  getCalendarColors,
  normalizeSubscriptionEventData,
} from "../../src/data/calendar";
import type { Calendar, CalendarEventApiData } from "../../src/data/calendar";

const style = {
  getPropertyValue: (prop: string) => (prop === "--color-1" ? "#4269d0" : ""),
} as CSSStyleDeclaration;

describe("getCalendarColors", () => {
  it("picks dark text for a light background", () => {
    expect(getCalendarColors("#ffe066", 0, style)).toEqual({
      backgroundColor: "#ffe066",
      textColor: "#000000",
    });
  });

  it("picks light text for a dark background", () => {
    expect(getCalendarColors("#00679e", 0, style)).toEqual({
      backgroundColor: "#00679e",
      textColor: "#ffffff",
    });
  });

  it("falls back to the color for the index", () => {
    expect(getCalendarColors(undefined, 0, style)).toEqual({
      backgroundColor: "#4269d0",
      textColor: "#ffffff",
    });
    expect(getCalendarColors("not a color", 0, style).backgroundColor).toBe(
      "#4269d0"
    );
  });

  it("reads a theme color from the element it is rendered on", () => {
    const themed = {
      getPropertyValue: (prop: string) =>
        prop === "--blue-color" ? "#ffe066" : "",
    } as CSSStyleDeclaration;
    // Resolving against the document instead would read the named color blue
    expect(getCalendarColors("blue", 0, themed)).toEqual({
      backgroundColor: "var(--blue-color)",
      textColor: "#000000",
    });
  });

  it("leaves the text color unset for a background it cannot measure", () => {
    const empty = {
      getPropertyValue: () => "",
    } as unknown as CSSStyleDeclaration;
    expect(getCalendarColors(undefined, 0, empty).textColor).toBeUndefined();
    expect(
      getCalendarColors("color-mix(in srgb, white 90%, black)", 0, style)
        .textColor
    ).toBeUndefined();
    expect(
      getCalendarColors("rgba(255, 255, 255, 0.1)", 0, style).textColor
    ).toBeUndefined();
  });
});

const calendar: Calendar = {
  entity_id: "calendar.test",
  backgroundColor: "#4269d0",
  textColor: "#ffffff",
};

const event: CalendarEventApiData = {
  summary: "Event",
  start: { dateTime: "2026-01-05T10:00:00+01:00" },
  end: { dateTime: "2026-01-05T11:00:00+01:00" },
};

describe("normalizeSubscriptionEventData", () => {
  it("keeps the calendar's colors for an event that has none", () => {
    expect(normalizeSubscriptionEventData(event, calendar)).toMatchObject({
      backgroundColor: "#4269d0",
      borderColor: "#4269d0",
      textColor: "#ffffff",
    });
  });

  it("lets a color on the event override the calendar's", () => {
    expect(
      normalizeSubscriptionEventData({ ...event, color: "#ffe066" }, calendar)
    ).toMatchObject({
      backgroundColor: "#ffe066",
      borderColor: "#ffe066",
      textColor: "#000000",
    });
  });

  it("accepts the CSS3 color name that rfc7986 defines", () => {
    expect(
      normalizeSubscriptionEventData({ ...event, color: "turquoise" }, calendar)
    ).toMatchObject({ backgroundColor: "turquoise", textColor: "#000000" });
  });

  it("reads a name a theme also defines as the CSS color it is", () => {
    // Resolving it as a theme color instead would paint the event in the
    // theme's blue rather than the blue the calendar declared
    expect(
      normalizeSubscriptionEventData({ ...event, color: "blue" }, calendar)
    ).toMatchObject({ backgroundColor: "blue", textColor: "#ffffff" });
  });

  it.each([
    ["an unusable value", "not a color"],
    ["no color at all", null],
  ])("keeps the calendar's colors for %s", (_name, color) => {
    expect(
      normalizeSubscriptionEventData({ ...event, color }, calendar)
    ).toMatchObject({ backgroundColor: "#4269d0", textColor: "#ffffff" });
  });

  it("leaves the text color unset for an event color it cannot measure", () => {
    expect(
      normalizeSubscriptionEventData(
        { ...event, color: "rgba(255, 255, 255, 0.1)" },
        calendar
      )
    ).toMatchObject({
      backgroundColor: "rgba(255, 255, 255, 0.1)",
      textColor: undefined,
    });
  });
});

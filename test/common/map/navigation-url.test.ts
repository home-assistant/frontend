import { afterEach, describe, expect, it } from "vitest";
import { navigationUrl } from "../../../src/common/map/navigation-url";

const MAC_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1";

const setNavigator = (userAgent: string, maxTouchPoints = 0) => {
  Object.defineProperty(navigator, "userAgent", {
    value: userAgent,
    configurable: true,
  });
  Object.defineProperty(navigator, "maxTouchPoints", {
    value: maxTouchPoints,
    configurable: true,
  });
};

describe("navigationUrl", () => {
  afterEach(() => {
    delete (navigator as any).userAgent;
    delete (navigator as any).maxTouchPoints;
  });

  it("opens Apple Maps on iPhone", () => {
    setNavigator(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Home Assistant/2024.1"
    );
    expect(navigationUrl(52.37, 4.9)).toBe(
      "https://maps.apple.com/directions?destination=52.37,4.9"
    );
  });

  it("opens Apple Maps on an iPad that reports a desktop user agent", () => {
    setNavigator(MAC_UA, 5);
    expect(navigationUrl(52.37, -4.9)).toBe(
      "https://maps.apple.com/directions?destination=52.37,-4.9"
    );
  });

  it("uses a geo URI on Android", () => {
    setNavigator("Mozilla/5.0 (Linux; Android 14) Home Assistant/2024.1");
    expect(navigationUrl(52.37, 4.9)).toBe("geo:52.37,4.9?q=52.37,4.9");
  });

  it("falls back to OpenStreetMap directions on a Mac", () => {
    setNavigator(MAC_UA);
    expect(navigationUrl(52.37, -4.9)).toBe(
      "https://www.openstreetmap.org/directions?to=52.37%2C-4.9#map=15/52.37/-4.9"
    );
  });
});

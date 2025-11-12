import { describe, expect, test } from "vitest";
import { setDefaultBrowserPanel, setDefaultUserPanel } from "../../src/data/panel";

describe("panel event functions", () => {
  test("setDefaultBrowserPanel fires correct event", () => {
    const element = document.createElement("div");
    let eventFired = false;
    let eventDetail: any;

    element.addEventListener("hass-default-browser-panel", (ev: Event) => {
      eventFired = true;
      eventDetail = (ev as CustomEvent).detail;
    });

    setDefaultBrowserPanel(element, "custom-dashboard");

    expect(eventFired).toBe(true);
    expect(eventDetail).toEqual({ defaultPanel: "custom-dashboard" });
  });

  test("setDefaultUserPanel fires correct event", () => {
    const element = document.createElement("div");
    let eventFired = false;
    let eventDetail: any;

    element.addEventListener("hass-default-user-panel", (ev: Event) => {
      eventFired = true;
      eventDetail = (ev as CustomEvent).detail;
    });

    setDefaultUserPanel(element, "user-dashboard");

    expect(eventFired).toBe(true);
    expect(eventDetail).toEqual({ defaultPanel: "user-dashboard" });
  });

  test("setDefaultUserPanel handles undefined", () => {
    const element = document.createElement("div");
    let eventFired = false;
    let eventDetail: any;

    element.addEventListener("hass-default-user-panel", (ev: Event) => {
      eventFired = true;
      eventDetail = (ev as CustomEvent).detail;
    });

    setDefaultUserPanel(element, undefined);

    expect(eventFired).toBe(true);
    expect(eventDetail).toEqual({ defaultPanel: undefined });
  });
});

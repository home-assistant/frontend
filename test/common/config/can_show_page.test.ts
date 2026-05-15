import { describe, it, expect } from "vitest";
import {
  canShowPage,
  isLoadedIntegration,
  isNotLoadedIntegration,
  isCore,
} from "../../../src/common/config/can_show_page";
import type { PageNavigation } from "../../../src/layouts/hass-tabs-subpage";
import type { HomeAssistant } from "../../../src/types";

describe("canShowPage", () => {
  it("should return true if the page can be shown", () => {
    const hass = {
      config: { components: ["test_component"] },
    } as unknown as HomeAssistant;
    const page = {
      component: "test_component",
      core: true,
    } as unknown as PageNavigation;
    expect(canShowPage(hass, page)).toBe(true);
  });

  it("should return false if the page cannot be shown", () => {
    const hass = {
      config: { components: ["test_component"] },
    } as unknown as HomeAssistant;
    const page = {
      component: "other_component",
      core: false,
    } as unknown as PageNavigation;
    expect(canShowPage(hass, page)).toBe(false);
  });
});

describe("isLoadedIntegration", () => {
  it("should return true if the integration is loaded", () => {
    const hass = {
      config: { components: ["test_component"] },
    } as unknown as HomeAssistant;
    const page = { component: "test_component" } as unknown as PageNavigation;
    expect(isLoadedIntegration(hass, page)).toBe(true);
  });

  it("should return false if the integration is not loaded", () => {
    const hass = {
      config: { components: ["test_component"] },
    } as unknown as HomeAssistant;
    const page = { component: "other_component" } as unknown as PageNavigation;
    expect(isLoadedIntegration(hass, page)).toBe(false);
  });
});

describe("isNotLoadedIntegration", () => {
  it("should return true if the integration is not loaded", () => {
    const hass = {
      config: { components: ["test_component"] },
    } as unknown as HomeAssistant;
    const page = {
      not_component: "other_component",
    } as unknown as PageNavigation;
    expect(isNotLoadedIntegration(hass, page)).toBe(true);
  });

  it("should return false if the integration is loaded", () => {
    const hass = {
      config: { components: ["test_component"] },
    } as unknown as HomeAssistant;
    const page = {
      not_component: "test_component",
    } as unknown as PageNavigation;
    expect(isNotLoadedIntegration(hass, page)).toBe(false);
  });
});

describe("isCore", () => {
  it("should return true if the page is core", () => {
    const page = { core: true } as unknown as PageNavigation;
    expect(isCore(page)).toBe(true);
  });

  it("should return false if the page is not core", () => {
    const page = { core: false } as unknown as PageNavigation;
    expect(isCore(page)).toBe(false);
  });
});

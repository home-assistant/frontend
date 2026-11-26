import { describe, expect, it } from "vitest";
import type { LocalizeFunc } from "../../src/common/translations/localize";
import {
  inIntegrationCategory,
  integrationCategoryIcon,
  integrationCategoryName,
} from "../../src/data/integration_category";

describe("integrationCategoryName", () => {
  const localize = ((key: string) => key) as LocalizeFunc;

  it("names a category and a subcategory", () => {
    expect(integrationCategoryName(localize, "energy")).toBe(
      "component.homeassistant.integration_category.energy.name"
    );
    expect(integrationCategoryName(localize, "energy.solar_batteries")).toBe(
      "component.homeassistant.integration_category.energy.subcategory.solar_batteries.name"
    );
  });
});

describe("integrationCategoryIcon", () => {
  const icons = {
    energy: {
      default: "mdi:lightning-bolt",
      subcategory: { solar_batteries: { default: "mdi:solar-power" } },
    },
  };

  it("finds the icon of a category and of a subcategory", () => {
    expect(integrationCategoryIcon(icons, "energy")).toBe("mdi:lightning-bolt");
    expect(integrationCategoryIcon(icons, "energy.solar_batteries")).toBe(
      "mdi:solar-power"
    );
  });

  it("has none for an unknown category, or without icons", () => {
    expect(integrationCategoryIcon(icons, "water")).toBeUndefined();
    expect(integrationCategoryIcon(icons, "energy.unknown")).toBeUndefined();
    expect(integrationCategoryIcon(undefined, "energy")).toBeUndefined();
  });
});

describe("inIntegrationCategory", () => {
  it.each([
    [["energy.solar_batteries"], "energy", true],
    [["energy.solar_batteries"], "energy.solar_batteries", true],
    [["energy"], "energy.solar_batteries", false],
    // Only a whole slug matches, not one that starts the same
    [["energy_storage"], "energy", false],
    [undefined, "energy", false],
  ])("%j is in %s: %s", (categories, slug, expected) => {
    expect(inIntegrationCategory(categories, slug)).toBe(expected);
  });
});

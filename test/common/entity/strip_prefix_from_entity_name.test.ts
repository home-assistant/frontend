import { describe, expect, it } from "vitest";
import {
  isDeviceName,
  stripPrefixFromEntityName,
} from "../../../src/common/entity/strip_prefix_from_entity_name";

describe("stripPrefixFromEntityName", () => {
  it.each([
    ["Kitchen light", "Kitchen", "Light"],
    ["Kitchen: light", "Kitchen", "Light"],
    ["Kitchen - light", "Kitchen", "- light"],
    ["KITCHEN light", "kitchen", "Light"],
    ["Kitchen Shelves Left", "Kitchen", "Shelves Left"],
    ["Harry’s Bedroom 1", "Harry's Bedroom", "1"],
    ["Harry’s Bedroom TV Lights", "Harry's Bedroom", "TV Lights"],
    ["Kitchen iPhone charger", "Kitchen", "iPhone charger"],
    ["Kitchenette light", "Kitchen", undefined],
    ["Kitchen", "Kitchen", undefined],
    ["Kitchen ", "Kitchen", undefined],
  ])("strips %s with prefix %s to %s", (name, prefix, expected) => {
    expect(stripPrefixFromEntityName(name, prefix)).toBe(expected);
  });

  describe.each(["'", "’"])("prefix with %s", (prefixApostrophe) => {
    describe.each(["'", "’"])("name with %s", (nameApostrophe) => {
      it.each([
        [" ", "Light"],
        [": ", "Light"],
        [" - ", "- light"],
      ])("strips the area prefix followed by %s", (suffix, expected) => {
        expect(
          stripPrefixFromEntityName(
            `Harry${nameApostrophe}s bedroom${suffix}light`,
            `Harry${prefixApostrophe}s bedroom`
          )
        ).toBe(expected);
      });
    });
  });

  it("preserves apostrophes in the remaining name", () => {
    expect(
      stripPrefixFromEntityName(
        "Harry’s bedroom reader’s lamp",
        "Harry's bedroom"
      )
    ).toBe("Reader’s lamp");
  });

  it("does not strip a prefix with a missing apostrophe", () => {
    expect(
      stripPrefixFromEntityName("Harrys bedroom light", "Harry's bedroom")
    ).toBeUndefined();
  });
});

describe("isDeviceName", () => {
  it.each([
    ["Kitchen", "Kitchen", true],
    ["KITCHEN", "Kitchen", true],
    ["Kitchen -", "Kitchen", true],
    ["Kitchen:", "Kitchen", true],
    ["Kitchen Light", "Kitchen", false],
    ["Kitchenette", "Kitchen", false],
    ["Kitchen", "", false],
  ])("%s with device %s is %s", (entityName, deviceName, expected) => {
    expect(isDeviceName(entityName, deviceName)).toBe(expected);
  });
});

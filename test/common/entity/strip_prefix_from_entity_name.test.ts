import { describe, expect, it } from "vitest";
import { isDeviceName } from "../../../src/common/entity/strip_prefix_from_entity_name";

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

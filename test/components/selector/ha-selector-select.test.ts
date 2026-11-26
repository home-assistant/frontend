import { describe, expect, it } from "vitest";
import {
  fromPickerId,
  toPickerId,
} from "../../../src/components/ha-selector/ha-selector-select";

describe("picker IDs", () => {
  it("are never empty, so the picker can select every option", () => {
    expect(toPickerId("")).not.toBe("");
    expect(toPickerId(0)).toBe("0");
    expect(toPickerId("a")).toBe("a");
  });

  it("map back to the option value", () => {
    expect(fromPickerId(toPickerId(""))).toBe("");
    expect(fromPickerId(toPickerId("a"))).toBe("a");
    expect(fromPickerId(undefined)).toBeUndefined();
  });
});

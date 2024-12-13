import { describe, it, expect } from "vitest";
import {
  labDarken,
  labBrighten,
  type LabColor,
} from "../../../src/common/color/lab";

describe("labDarken", () => {
  it("should darken the color by the default amount", () => {
    const lab: LabColor = [50, 20, 30];
    const result = labDarken(lab);
    expect(result).toEqual([32, 20, 30]);
  });

  it("should darken the color by a specified amount", () => {
    const lab: LabColor = [50, 20, 30];
    const result = labDarken(lab, 2);
    expect(result).toEqual([14, 20, 30]);
  });
});

describe("labBrighten", () => {
  it("should brighten the color by the default amount", () => {
    const lab: LabColor = [50, 20, 30];
    const result = labBrighten(lab);
    expect(result).toEqual([68, 20, 30]);
  });

  it("should brighten the color by a specified amount", () => {
    const lab: LabColor = [50, 20, 30];
    const result = labBrighten(lab, 2);
    expect(result).toEqual([86, 20, 30]);
  });
});

import { describe, expect, it } from "vitest";
import { normalizeDuration } from "../../../src/common/datetime/normalize_duration";

describe("normalizeDuration", () => {
  it("keeps the flag and the components when the flag is present", () => {
    expect(
      normalizeDuration({ negative: true, hours: 1, minutes: 30 })
    ).toEqual({ negative: true, hours: 1, minutes: 30 });
    expect(normalizeDuration({ negative: false, hours: 1 })).toEqual({
      negative: false,
      hours: 1,
    });
  });

  it("derives the flag from legacy components sharing a sign", () => {
    expect(normalizeDuration({ hours: -1, minutes: -30 })).toEqual({
      negative: true,
      hours: 1,
      minutes: 30,
    });
    expect(normalizeDuration({ hours: 0, minutes: 0 })).toEqual({
      negative: false,
      hours: 0,
      minutes: 0,
    });
  });
});

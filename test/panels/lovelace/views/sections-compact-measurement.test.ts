import { afterEach, expect, it, vi } from "vitest";
import { measureSectionFootprint } from "../../../../src/panels/lovelace/views/sections-compact-measurement";

afterEach(() => vi.restoreAllMocks());

it("includes computed fractional margins without duplicating theme padding", () => {
  const element = document.createElement("div");
  element.style.marginTop = "7.5px";
  element.style.marginBottom = "9.25px";
  // The border box already includes background padding; margins are separate.
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue({
    height: 216,
  } as DOMRect);
  expect(measureSectionFootprint(element)).toEqual({
    height: 232.75,
    margin: 16.75,
  });
});

it("handles containers without margins", () => {
  const element = document.createElement("div");
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue({
    height: 200,
  } as DOMRect);
  expect(measureSectionFootprint(element)).toEqual({ height: 200, margin: 0 });
});

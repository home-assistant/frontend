import { describe, it, expect, vi, afterEach } from "vitest";
import isPwa from "../../../src/common/config/is_pwa";

describe("isPwa", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return true if the display mode is standalone", () => {
    const mockMatchMedia = vi.fn(() => ({ matches: true })) as any;
    window.matchMedia = mockMatchMedia;

    expect(isPwa()).toBe(true);
    expect(mockMatchMedia).toHaveBeenCalledWith("(display-mode: standalone)");
  });

  it("should return false if the display mode is not standalone", () => {
    const mockMatchMedia = vi.fn(() => ({ matches: false })) as any;
    window.matchMedia = mockMatchMedia;
    expect(isPwa()).toBe(false);

    expect(mockMatchMedia).toHaveBeenCalledWith("(display-mode: standalone)");
  });
});

import { describe, expect, it } from "vitest";
import type { KioskElement } from "../../src/data/kiosk_mode";
import {
  DEFAULT_KIOSK_ELEMENTS_HIDDEN,
  KIOSK_ELEMENTS,
  NO_KIOSK_ELEMENTS_HIDDEN,
  resolveKioskElementsHidden,
} from "../../src/data/kiosk_mode";

const hidden = (params: Parameters<typeof resolveKioskElementsHidden>[0]) =>
  [...resolveKioskElementsHidden(params)].sort();

describe("resolveKioskElementsHidden", () => {
  it("hides nothing when kiosk mode is off, whatever the client listed", () => {
    expect(
      resolveKioskElementsHidden({
        enable: false,
        excludedElements: ["sidebar"],
      })
    ).toBe(NO_KIOSK_ELEMENTS_HIDDEN);
  });

  it("falls back to the default set when no elements are named", () => {
    expect(resolveKioskElementsHidden({ enable: true })).toBe(
      DEFAULT_KIOSK_ELEMENTS_HIDDEN
    );
  });

  it("hides exactly the excluded elements", () => {
    expect(
      hidden({
        enable: true,
        excludedElements: ["sidebar_button", "dashboard_edit_button"],
      })
    ).toEqual(["dashboard_edit_button", "sidebar_button"]);
  });

  it("hides everything but the included elements", () => {
    const shown: KioskElement[] = ["sidebar", "dashboard_tabs"];
    expect(hidden({ enable: true, includedElements: shown })).toEqual(
      KIOSK_ELEMENTS.filter((element) => !shown.includes(element)).sort()
    );
  });

  it("hides everything when the included list is empty", () => {
    expect(hidden({ enable: true, includedElements: [] })).toEqual(
      [...KIOSK_ELEMENTS].sort()
    );
  });

  // A newer client may name elements this frontend has never heard of; the rest
  // of its request still has to be honored.
  it("ignores unknown element names in either list", () => {
    expect(
      hidden({ enable: true, excludedElements: ["sidebar", "from_the_future"] })
    ).toEqual(["sidebar"]);
    expect(
      hidden({
        enable: true,
        includedElements: [...KIOSK_ELEMENTS, "from_the_future"],
      })
    ).toEqual([]);
  });
});

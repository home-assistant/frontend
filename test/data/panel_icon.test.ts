import { mdiCalendar, mdiMap } from "@mdi/js";
import { describe, expect, it } from "vitest";
import { getPanelIconPath } from "../../src/data/panel";
import type { PanelInfo } from "../../src/types";

const panel = (url_path: string, icon: string | null) =>
  ({ url_path, icon, component_name: "lovelace" }) as PanelInfo;

describe("getPanelIconPath", () => {
  it("uses the bundled path for a stock icon", () => {
    expect(getPanelIconPath(panel("calendar", "mdi:calendar"))).toBe(
      mdiCalendar
    );
    expect(getPanelIconPath(panel("map", "mdi:map"))).toBe(mdiMap);
  });

  it("uses the bundled path when the panel has no icon", () => {
    expect(getPanelIconPath(panel("calendar", null))).toBe(mdiCalendar);
  });

  it("leaves an icon the user picked alone", () => {
    expect(
      getPanelIconPath(panel("calendar", "mdi:calendar-star"))
    ).toBeUndefined();
    expect(getPanelIconPath(panel("map", "mdi:earth"))).toBeUndefined();
  });

  it("has no bundled path for other panels", () => {
    expect(
      getPanelIconPath(panel("lovelace", "mdi:view-dashboard"))
    ).toBeUndefined();
  });
});

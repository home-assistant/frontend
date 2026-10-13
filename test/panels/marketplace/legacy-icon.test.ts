import { mdiStore } from "@mdi/js";
import { afterEach, describe, expect, it } from "vitest";
import type { CustomIconsWindow } from "../../../src/data/custom_icons";
import { customIcons } from "../../../src/data/custom_icons";

describe("the hacs icon set", () => {
  afterEach(() => {
    delete (window as CustomIconsWindow).customIcons!.hacs;
  });

  it("shows the Marketplace icon for hacs:hacs on dashboards", async () => {
    expect(await customIcons.hacs.getIcon("hacs")).toEqual({ path: mdiStore });
  });

  it("leaves the icons of a HACS that is still around alone", async () => {
    const own = { getIcon: async () => ({ path: "M0 0" }) };
    (window as CustomIconsWindow).customIcons!.hacs = own;

    expect(customIcons.hacs).toBe(own);
  });
});

import { describe, expect, it } from "vitest";
import type { LovelaceRawConfig } from "../../../../../src/data/lovelace/config/types";
import {
  replaceDashboardInPath,
  replaceDashboardLinks,
} from "../../../../../src/panels/config/lovelace/dashboards/replace-dashboard-links";

describe("replaceDashboardInPath", () => {
  it.each([
    ["/dashboard-old", "/dashboard-new"],
    ["/dashboard-old/lights", "/dashboard-new/lights"],
    ["/dashboard-old/dashboard-old", "/dashboard-new/dashboard-old"],
    ["/dashboard-old?edit=1", "/dashboard-new?edit=1"],
    ["/dashboard-old#popup", "/dashboard-new#popup"],
    [
      "/dashboard-old/0?more-info-entity-id=light.kitchen#x",
      "/dashboard-new/0?more-info-entity-id=light.kitchen#x",
    ],
  ])("replaces the dashboard in %s", (path, expected) => {
    expect(replaceDashboardInPath(path, "dashboard-old", "dashboard-new")).toBe(
      expected
    );
  });

  it.each([
    "/dashboard-old-2/lights",
    "/dashboard-older",
    "/other-dashboard/dashboard-old",
    "dashboard-old",
    "dashboard-old/lights",
    "//dashboard-old/lights",
    "https://example.com/dashboard-old/lights",
    "/energy?backPath=/dashboard-old/home",
    "/",
    "",
  ])("leaves %s alone", (path) => {
    expect(replaceDashboardInPath(path, "dashboard-old", "dashboard-new")).toBe(
      path
    );
  });
});

describe("replaceDashboardLinks", () => {
  const navigate = (navigation_path: string) => ({
    action: "navigate",
    navigation_path,
  });

  it("replaces links in actions, cards and views", () => {
    const config = {
      views: [
        {
          path: "dashboard-old",
          cards: [
            {
              type: "vertical-stack",
              cards: [
                {
                  type: "button",
                  tap_action: navigate("/dashboard-old/lights"),
                  hold_action: navigate("/other-dashboard/lights"),
                  double_tap_action: navigate("lights"),
                },
              ],
            },
            {
              type: "entities",
              entities: [
                "light.kitchen",
                { type: "weblink", url: "/dashboard-old/lights" },
                {
                  type: "cast",
                  dashboard: "dashboard-old",
                  view: "dashboard-old",
                },
                { type: "cast", dashboard: "dashboard-old-2" },
                {
                  type: "conditional",
                  conditions: [],
                  row: { type: "weblink", url: "https://example.com" },
                },
              ],
            },
            { type: "iframe", url: "/dashboard-old/cameras?kiosk" },
            {
              type: "area",
              area: "kitchen",
              navigation_path: "/dashboard-old",
            },
            {
              type: "custom:my-card",
              chips: [
                { tap_action: { action: "url", url_path: "/dashboard-old" } },
              ],
            },
          ],
        },
        {
          path: "lights",
          subview: true,
          back_path: "/dashboard-old/dashboard-old",
          sections: [
            {
              type: "grid",
              cards: [
                {
                  type: "tile",
                  entity: "light.kitchen",
                  icon_tap_action: navigate("/dashboard-old/lights#more"),
                },
              ],
            },
          ],
          badges: [{ type: "entity", tap_action: navigate("/dashboard-old") }],
        },
      ],
    } as unknown as LovelaceRawConfig;
    const original = structuredClone(config);

    expect(
      replaceDashboardLinks(config, "dashboard-old", "dashboard-new")
    ).toEqual({
      views: [
        {
          path: "dashboard-old",
          cards: [
            {
              type: "vertical-stack",
              cards: [
                {
                  type: "button",
                  tap_action: navigate("/dashboard-new/lights"),
                  hold_action: navigate("/other-dashboard/lights"),
                  double_tap_action: navigate("lights"),
                },
              ],
            },
            {
              type: "entities",
              entities: [
                "light.kitchen",
                { type: "weblink", url: "/dashboard-new/lights" },
                {
                  type: "cast",
                  dashboard: "dashboard-new",
                  view: "dashboard-old",
                },
                { type: "cast", dashboard: "dashboard-old-2" },
                {
                  type: "conditional",
                  conditions: [],
                  row: { type: "weblink", url: "https://example.com" },
                },
              ],
            },
            { type: "iframe", url: "/dashboard-new/cameras?kiosk" },
            {
              type: "area",
              area: "kitchen",
              navigation_path: "/dashboard-new",
            },
            {
              type: "custom:my-card",
              chips: [
                { tap_action: { action: "url", url_path: "/dashboard-new" } },
              ],
            },
          ],
        },
        {
          path: "lights",
          subview: true,
          back_path: "/dashboard-new/dashboard-old",
          sections: [
            {
              type: "grid",
              cards: [
                {
                  type: "tile",
                  entity: "light.kitchen",
                  icon_tap_action: navigate("/dashboard-new/lights#more"),
                },
              ],
            },
          ],
          badges: [{ type: "entity", tap_action: navigate("/dashboard-new") }],
        },
      ],
    });
    expect(config).toEqual(original);
  });

  it("leaves strategy options alone", () => {
    const strategy = { type: "iframe", url: "/dashboard-old/lights" };

    expect(
      replaceDashboardLinks({ strategy }, "dashboard-old", "dashboard-new")
    ).toEqual({ strategy });
    expect(
      replaceDashboardLinks(
        { views: [{ strategy, back_path: "/dashboard-old" }] },
        "dashboard-old",
        "dashboard-new"
      )
    ).toEqual({ views: [{ strategy, back_path: "/dashboard-new" }] });
  });
});

import { ContextProvider } from "@lit/context";
import { LitElement } from "lit";
import { afterEach, describe, expect, it, vi } from "vitest";
import { narrowViewportContext } from "../../src/data/context";
import type { PageNavigation } from "../../src/data/page_navigation";
import { provideHass } from "../../src/fake_data/provide_hass";
import type { HassTabsSubpage } from "../../src/layouts/hass-tabs-subpage";

// The real back button pulls in the localize context, which is not provided here.
vi.mock("../../src/components/ha-icon-button-arrow-prev", () => ({}));
vi.mock("../../src/components/ha-menu-button", () => ({}));
vi.mock("../../src/components/ha-tab", () => ({}));
vi.mock("../../src/components/ha-tab-group", () => ({}));
vi.mock("../../src/components/ha-tab-group-tab", () => ({}));
[
  "ha-icon-button-arrow-prev",
  "ha-menu-button",
  "ha-tab",
  "ha-tab-group",
  "ha-tab-group-tab",
].forEach((tag) => customElements.define(tag, class extends LitElement {}));
vi.mock("../../src/common/navigate", () => ({
  getHistoryState: () => undefined,
  navigate: vi.fn(),
}));
const { navigate } = await import("../../src/common/navigate");
await import("../../src/layouts/hass-tabs-subpage");

let host: HTMLDivElement | undefined;

const mountElement = async (
  props: Partial<HassTabsSubpage>,
  narrow = false
) => {
  host = document.createElement("div");
  provideHass(host, { localize: (key: string) => `localized:${key}` });
  new ContextProvider(host, {
    context: narrowViewportContext,
    initialValue: narrow,
  });
  document.body.append(host);
  const element = document.createElement(
    "hass-tabs-subpage"
  ) as HassTabsSubpage;
  Object.assign(element, { route: { prefix: "", path: "" }, tabs: [] }, props);
  host.append(element);
  await element.updateComplete;
  return element;
};

const mount = async (backPath: string) => {
  const element = await mountElement({ backPath });
  return element.shadowRoot!.querySelector("ha-icon-button-arrow-prev") as
    (LitElement & { href?: string }) | null;
};

afterEach(() => {
  host?.remove();
  host = undefined;
});

describe("hass-tabs-subpage back path", () => {
  it("links to a path on the current origin", async () => {
    const backButton = await mount("/config");
    expect(backButton!.href).toEqual("/config");
  });

  // eslint-disable-next-line no-script-url
  it.each(["javascript:alert(1)", "https://example.com/"])(
    "does not link to %s",
    async (backPath) => {
      const backButton = await mount(backPath);
      expect(backButton!.href).toBeUndefined();
    }
  );
});

describe("hass-tabs-subpage tabs", () => {
  const areas: PageNavigation = {
    path: "/config/areas/dashboard",
    translationKey: "areas",
    core: true,
  };
  const floors: PageNavigation = {
    path: "/config/floors",
    name: "Floors",
    core: true,
  };

  it("uses the tab matching the route as narrow title", async () => {
    const element = await mountElement(
      {
        tabs: [areas, floors],
        route: { prefix: "/config/floors", path: "" },
      },
      true
    );
    const title = () =>
      element.shadowRoot!.querySelector(".main-title")!.textContent!.trim();
    expect(title()).toEqual("Floors");

    element.route = { prefix: "/config/areas", path: "/dashboard" };
    await element.updateComplete;
    expect(title()).toEqual("localized:areas");
  });

  it.each<[string, PageNavigation[], boolean]>([
    ["one tab", [areas], false],
    ["two tabs", [areas, floors], true],
    [
      "a tab hidden by its integration",
      [areas, { ...floors, core: false, component: "not_loaded" }],
      false,
    ],
    [
      "a tab hidden by its filter",
      [areas, { ...floors, filter: () => false }],
      false,
    ],
  ])("shows tabs with %s", async (_label, tabs, expected) => {
    const element = await mountElement({ tabs });
    expect(element.showTabs).toBe(expected);
    expect(element.hasAttribute("show-tabs")).toBe(expected);
  });

  const showInTabRow = async (path: string) => {
    vi.mocked(navigate).mockClear();
    const element = await mountElement(
      {
        tabs: [areas, floors],
        route: { prefix: "/config/floors", path: "" },
      },
      true
    );
    element
      .shadowRoot!.querySelector(".tab-row")!
      .dispatchEvent(
        new CustomEvent("wa-tab-show", { detail: { name: path } })
      );
  };

  it("does not navigate when the tab row shows the active tab", async () => {
    await showInTabRow("/config/floors");
    expect(navigate).not.toHaveBeenCalled();
  });

  it("navigates when the tab row shows another tab", async () => {
    await showInTabRow("/config/areas/dashboard");
    expect(navigate).toHaveBeenCalledExactlyOnceWith(
      "/config/areas/dashboard",
      {
        replace: true,
      }
    );
  });

  it("navigates on a tab row click when no tab matches the route", async () => {
    vi.mocked(navigate).mockClear();
    const element = await mountElement(
      {
        tabs: [areas, floors],
        route: { prefix: "/config/other", path: "" },
      },
      true
    );
    element.shadowRoot!.querySelector<HTMLAnchorElement>(".tab-row a")!.click();
    expect(navigate).toHaveBeenCalledExactlyOnceWith(
      "/config/areas/dashboard",
      { replace: true }
    );
  });
});

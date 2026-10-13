import { afterEach, describe, expect, it, vi } from "vitest";
import { navigate } from "../../src/common/navigate";
import "../../src/layouts/partial-panel-resolver";
import type { Panels } from "../../src/types";

const panel = (name: string, urlPath = name) => ({
  component_name: name,
  url_path: urlPath,
  icon: null,
  title: null,
  config: null,
  require_admin: false,
  config_panel_domain: undefined,
});

vi.mock("../../src/common/navigate", () => ({ navigate: vi.fn() }));

const routerOptions = (panels: Panels): Record<string, any> => {
  const resolver = document.createElement(
    "partial-panel-resolver"
  ) as unknown as Record<string, any>;
  return resolver._getRoutes(panels);
};

const routes = (panels: Panels): Record<string, unknown> =>
  routerOptions(panels).routes;

describe("partial-panel-resolver", () => {
  afterEach(() => {
    window.history.replaceState(null, "", "/");
    vi.mocked(navigate).mockClear();
  });

  it("moves a link to the custom integration it replaces to the Marketplace", () => {
    window.history.replaceState(
      null,
      "",
      "/hacs/repository/1?category=theme#top"
    );

    routerOptions({
      marketplace: panel("marketplace"),
    } as unknown as Panels).beforeRender("hacs");

    // The Marketplace loads its translations for the path it is at
    expect(navigate).toHaveBeenCalledWith(
      "/marketplace/repository/1?category=theme#top",
      { replace: true }
    );
  });

  it("leaves a link to a panel that is really at /hacs alone", () => {
    window.history.replaceState(null, "", "/hacs");

    routerOptions({
      hacs: panel("custom", "hacs"),
      marketplace: panel("marketplace"),
    } as unknown as Panels).beforeRender("hacs");

    expect(navigate).not.toHaveBeenCalled();
  });

  it("leaves a link to the custom integration it replaces to beforeRender", () => {
    // The router resolves a route alias before beforeRender, which would then
    // never see the link to move it
    expect(
      routes({ marketplace: panel("marketplace") } as unknown as Panels).hacs
    ).toBeUndefined();
  });

  it("leaves a panel that is really at /hacs alone", () => {
    expect(
      routes({
        hacs: panel("custom", "hacs"),
        marketplace: panel("marketplace"),
      } as unknown as Panels).hacs
    ).not.toBe("marketplace");
  });
});

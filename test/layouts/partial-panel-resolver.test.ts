import { describe, expect, it } from "vitest";
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

const routes = (panels: Panels): Record<string, unknown> => {
  const resolver = document.createElement(
    "partial-panel-resolver"
  ) as unknown as Record<string, any>;
  return resolver._getRoutes(panels).routes;
};

describe("partial-panel-resolver", () => {
  it("opens the Marketplace for links to the custom integration it replaces", () => {
    expect(
      routes({ marketplace: panel("marketplace") } as unknown as Panels).hacs
    ).toBe("marketplace");
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

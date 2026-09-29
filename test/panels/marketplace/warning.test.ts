import { afterEach, expect, it, vi } from "vitest";
import type { HomeAssistant } from "../../../src/types";
import "../../../src/panels/marketplace/components/ha-marketplace-warning";

const stubElement = vi.hoisted(() => (tag: string) => {
  if (!customElements.get(tag)) {
    customElements.define(tag, class extends HTMLElement {});
  }
  return {};
});

vi.mock("../../../src/layouts/hass-subpage", () => stubElement("hass-subpage"));
vi.mock("../../../src/components/ha-alert", () => stubElement("ha-alert"));
vi.mock("../../../src/components/ha-button", () => stubElement("ha-button"));
vi.mock("../../../src/components/ha-card", () => stubElement("ha-card"));
vi.mock("../../../src/components/ha-checkbox", () =>
  stubElement("ha-checkbox")
);
vi.mock("../../../src/components/ha-svg-icon", () =>
  stubElement("ha-svg-icon")
);
vi.mock("../../../src/data/marketplace/websocket", () => ({
  acceptMarketplaceWarning: vi.fn(async () => undefined),
}));

const openWarning = async () => {
  const warning = document.createElement("ha-marketplace-warning");
  warning.hass = { localize: (key: string) => key } as HomeAssistant;
  document.body.append(warning);
  await warning.updateComplete;
  return warning;
};

afterEach(() => document.body.replaceChildren());

it("shows its title from the translations of the Marketplace itself", async () => {
  const warning = await openWarning();
  const subpage = warning.shadowRoot!.querySelector("hass-subpage") as
    (HTMLElement & { header: string }) | null;

  // A direct visit loads the Marketplace translations, not those of Settings
  expect(subpage!.header).toBe("ui.panel.marketplace.title");
});

it("can be continued again when the Marketplace did not take over", async () => {
  const warning = await openWarning();
  const internals = warning as unknown as Record<string, any>;
  internals._understood = true;

  await internals._accept();

  // The panel swaps the screen once its refetch works, until then it stays usable
  expect(internals._accepting).toBe(false);
});

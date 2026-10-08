import { afterEach, expect, it, vi } from "vitest";
import { goBack } from "../../../src/common/navigate";
import { acceptMarketplaceWarning } from "../../../src/data/marketplace/websocket";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";
import { provideHass } from "../../../src/fake_data/provide_hass";
import "../../../src/panels/marketplace/components/ha-marketplace-warning";

const stubElement = vi.hoisted(() => (tag: string) => {
  if (!customElements.get(tag)) {
    customElements.define(tag, class extends HTMLElement {});
  }
  return {};
});

vi.mock("../../../src/components/ha-alert", () => stubElement("ha-alert"));
vi.mock("../../../src/components/ha-button", () => stubElement("ha-button"));
vi.mock("../../../src/components/ha-checkbox", () =>
  stubElement("ha-checkbox")
);
vi.mock("../../../src/components/ha-dialog", () => stubElement("ha-dialog"));
vi.mock("../../../src/components/ha-dialog-footer", () =>
  stubElement("ha-dialog-footer")
);
vi.mock("../../../src/components/ha-svg-icon", () =>
  stubElement("ha-svg-icon")
);
vi.mock("../../../src/common/navigate", () => ({ goBack: vi.fn() }));
vi.mock("../../../src/data/marketplace/websocket", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  acceptMarketplaceWarning: vi.fn(async () => undefined),
}));

let hass: MockHomeAssistant;

const openWarning = async () => {
  const host = document.createElement("div");
  hass = provideHass(host, { localize: (key: string) => key });
  document.body.append(host);
  const warning = document.createElement("ha-marketplace-warning");
  host.append(warning);
  await warning.updateComplete;
  return warning;
};

afterEach(() => {
  document.body.replaceChildren();
  vi.clearAllMocks();
});

it("sends the acceptance, and can be continued again after it", async () => {
  let accepted!: () => void;
  vi.mocked(acceptMarketplaceWarning).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        accepted = () => resolve(null);
      })
  );
  const warning = await openWarning();
  const internals = warning as unknown as Record<string, any>;
  internals._understood = true;

  const accepting = internals._accept();
  expect(acceptMarketplaceWarning).toHaveBeenCalledWith(
    expect.objectContaining({ callWS: hass.callWS })
  );
  expect(internals._accepting).toBe(true);

  accepted();
  await accepting;

  // The panel removes the warning once its refetch works, until then it stays usable
  expect(internals._accepting).toBe(false);
  expect(internals._error).toBeUndefined();
});

it("sends nothing until the risks are understood", async () => {
  const warning = await openWarning();

  await (warning as unknown as Record<string, any>)._accept();

  expect(acceptMarketplaceWarning).not.toHaveBeenCalled();
});

it("shows why accepting failed, and can be tried again", async () => {
  vi.mocked(acceptMarketplaceWarning).mockRejectedValueOnce(new Error("Busy"));
  const warning = await openWarning();
  const internals = warning as unknown as Record<string, any>;
  internals._understood = true;

  await internals._accept();

  expect(internals._error).toContain("Busy");
  expect(internals._accepting).toBe(false);
});

it("goes back only once, however often it is asked to", async () => {
  const warning = await openWarning();
  const internals = warning as unknown as Record<string, any>;

  internals._goBack();
  internals._goBack();

  // A second history step would leave the page before the Marketplace too
  expect(goBack).toHaveBeenCalledTimes(1);
  expect(goBack).toHaveBeenCalledWith("/config");
});

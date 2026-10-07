import { afterEach, beforeEach, expect, it, vi } from "vitest";
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

// Only the countdown is faked, Lit renders on microtasks
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] });
});

afterEach(() => {
  document.body.replaceChildren();
  vi.useRealTimers();
});

const waitOut = async (
  warning: HTMLElement & { updateComplete: Promise<boolean> }
) => {
  vi.advanceTimersByTime(30_000);
  await warning.updateComplete;
};

const countdown = (warning: HTMLElement) =>
  warning.shadowRoot!.querySelector(".card-actions .countdown");

const continueButton = (warning: HTMLElement) =>
  warning.shadowRoot!.querySelector(
    ".card-actions ha-button"
  ) as HTMLElement & {
    disabled: boolean;
  };

it("shows its title from the translations of the Marketplace itself", async () => {
  const warning = await openWarning();
  const subpage = warning.shadowRoot!.querySelector("hass-subpage") as
    (HTMLElement & { header: string }) | null;

  // A direct visit loads the Marketplace translations, not those of Settings
  expect(subpage!.header).toBe("ui.panel.marketplace.title");
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
  await waitOut(warning);
  const internals = warning as unknown as Record<string, any>;
  internals._understood = true;

  const accepting = internals._accept();
  expect(acceptMarketplaceWarning).toHaveBeenCalledWith(
    expect.objectContaining({ callWS: hass.callWS })
  );
  expect(internals._accepting).toBe(true);

  accepted();
  await accepting;

  // The panel swaps the screen once its refetch works, until then it stays usable
  expect(internals._accepting).toBe(false);
  expect(internals._error).toBeUndefined();
});

it("sends nothing until the risks are understood", async () => {
  const warning = await openWarning();
  await waitOut(warning);

  await (warning as unknown as Record<string, any>)._accept();

  expect(acceptMarketplaceWarning).not.toHaveBeenCalled();
});

it("shows a failure above the warning, on an outlined card", async () => {
  vi.mocked(acceptMarketplaceWarning).mockRejectedValueOnce(new Error("Busy"));
  const warning = await openWarning();
  await waitOut(warning);
  const internals = warning as unknown as Record<string, any>;
  internals._understood = true;

  await internals._accept();
  await warning.updateComplete;

  const content = warning.shadowRoot!.querySelector(".card-content")!;
  expect(content.firstElementChild?.getAttribute("alert-type")).toBe("error");
  expect(content.firstElementChild?.textContent).toContain("Busy");
  expect(internals._accepting).toBe(false);
  expect(
    warning.shadowRoot!.querySelector("ha-card")!.hasAttribute("outlined")
  ).toBe(true);
});

it("counts down 30 seconds before it can be continued", async () => {
  const warning = await openWarning();
  const internals = warning as unknown as Record<string, any>;
  internals._understood = true;
  await warning.updateComplete;

  expect(continueButton(warning).disabled).toBe(true);
  // A disabled button is hard to read, the countdown stands next to it
  expect(continueButton(warning).textContent!.trim()).toBe(
    "ui.panel.marketplace.warning.continue"
  );
  expect(countdown(warning)?.textContent!.trim()).toBe(
    "ui.panel.marketplace.warning.continue_in"
  );
  await internals._accept();
  expect(acceptMarketplaceWarning).not.toHaveBeenCalled();

  vi.advanceTimersByTime(29_000);
  await warning.updateComplete;
  expect(continueButton(warning).disabled).toBe(true);

  vi.advanceTimersByTime(1_000);
  await warning.updateComplete;
  expect(continueButton(warning).disabled).toBe(false);
  expect(countdown(warning)).toBeNull();
  await internals._accept();
  expect(acceptMarketplaceWarning).toHaveBeenCalled();
});

it("stops counting down once it is gone", async () => {
  const warning = await openWarning();
  expect(vi.getTimerCount()).toBe(1);

  warning.remove();

  expect(vi.getTimerCount()).toBe(0);
});

it("asks to understand the risks, without a reminder", async () => {
  const warning = await openWarning();

  expect(
    warning.shadowRoot!.querySelector("ha-checkbox")!.textContent!.trim()
  ).toBe("ui.panel.marketplace.warning.understand");
  expect(
    warning.shadowRoot!.querySelector('ha-alert[alert-type="info"]')
  ).toBeNull();
});

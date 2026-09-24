import { LitElement } from "lit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleNativeBackButtonPressed } from "../../src/external_app/external_back_button";
import type { ExternalMessaging } from "../../src/external_app/external_messaging";
import type { HomeAssistant } from "../../src/types";

// The real back button pulls in the localize context, which is not provided here.
vi.mock("../../src/components/ha-icon-button-arrow-prev", () => ({}));
vi.mock("../../src/components/ha-menu-button", () => ({}));
vi.mock("../../src/common/navigate", () => ({
  getHistoryState: () => undefined,
  goBack: vi.fn(),
}));
customElements.define("ha-icon-button-arrow-prev", class extends LitElement {});
customElements.define("ha-menu-button", class extends LitElement {});
await import("../../src/layouts/hass-subpage");

const { goBack } = await import("../../src/common/navigate");

let fireMessage: ReturnType<typeof vi.fn>;
let nativeBus: ExternalMessaging;

// The app has a single external bus, so every page shares one.
const makeHass = (hasNativeBackButton: boolean): HomeAssistant =>
  ({
    auth: {
      external: hasNativeBackButton
        ? nativeBus
        : ({
            config: {},
            fireMessage,
          } as unknown as ExternalMessaging),
    },
  }) as HomeAssistant;

let host: HTMLDivElement | undefined;

const mount = async (hass: HomeAssistant, backPath = "/config") => {
  const element = document.createElement("hass-subpage");
  Object.assign(element, { hass, backPath });
  host!.append(element);
  await (element as LitElement).updateComplete;
  return element;
};

const arrowOf = (element: Element) =>
  element.shadowRoot!.querySelector("ha-icon-button-arrow-prev");

beforeEach(() => {
  fireMessage = vi.fn();
  nativeBus = {
    config: { hasNativeBackButton: true },
    fireMessage,
  } as unknown as ExternalMessaging;
  host = document.createElement("div");
  document.body.append(host);
});

afterEach(() => {
  host?.remove();
  host = undefined;
  vi.clearAllMocks();
});

describe("native back button", () => {
  it("keeps rendering the arrow when the app has no native back button", async () => {
    const element = await mount(makeHass(false));

    expect(arrowOf(element)).not.toBeNull();
    expect(fireMessage).not.toHaveBeenCalled();
    expect(handleNativeBackButtonPressed()).toBe(false);
  });

  it("hides the arrow and reports the back button to the app", async () => {
    const element = await mount(makeHass(true));

    expect(arrowOf(element)).toBeNull();
    expect(fireMessage).toHaveBeenCalledExactlyOnceWith({
      type: "back_button/show",
    });
  });

  it("hides the app back button once the page is gone", async () => {
    const element = await mount(makeHass(true));
    fireMessage.mockClear();

    element.remove();

    expect(fireMessage).toHaveBeenCalledExactlyOnceWith({
      type: "back_button/hide",
    });
  });

  it("does not report a back button on a main page", async () => {
    const hass = makeHass(true);
    const element = document.createElement("hass-subpage");
    Object.assign(element, { hass, mainPage: true });
    host!.append(element);
    await (element as LitElement).updateComplete;

    expect(fireMessage).not.toHaveBeenCalled();
    expect(handleNativeBackButtonPressed()).toBe(false);
  });

  it("navigates back when the app reports a press", async () => {
    await mount(makeHass(true), "/config/areas");

    expect(handleNativeBackButtonPressed()).toBe(true);
    expect(goBack).toHaveBeenCalledWith("/config/areas");
  });

  it("uses the back callback of the page when it has one", async () => {
    const backCallback = vi.fn();
    const element = await mount(makeHass(true));
    Object.assign(element, { backCallback });
    await (element as LitElement).updateComplete;

    expect(handleNativeBackButtonPressed()).toBe(true);
    expect(backCallback).toHaveBeenCalledOnce();
    expect(goBack).not.toHaveBeenCalled();
  });

  it("lets the page mounted last own the back button", async () => {
    const first = vi.fn();
    const second = vi.fn();
    const firstPage = await mount(makeHass(true));
    Object.assign(firstPage, { backCallback: first });
    await (firstPage as LitElement).updateComplete;

    const secondPage = await mount(makeHass(true));
    Object.assign(secondPage, { backCallback: second });
    await (secondPage as LitElement).updateComplete;

    handleNativeBackButtonPressed();
    expect(second).toHaveBeenCalledOnce();
    expect(first).not.toHaveBeenCalled();

    // Back on the first page, it owns the button again.
    secondPage.remove();
    handleNativeBackButtonPressed();
    expect(first).toHaveBeenCalledOnce();
  });

  it("only reports the back button once while pages come and go", async () => {
    const firstPage = await mount(makeHass(true));
    const secondPage = await mount(makeHass(true));
    firstPage.remove();

    expect(fireMessage).toHaveBeenCalledExactlyOnceWith({
      type: "back_button/show",
    });

    secondPage.remove();

    expect(fireMessage).toHaveBeenLastCalledWith({ type: "back_button/hide" });
  });
});

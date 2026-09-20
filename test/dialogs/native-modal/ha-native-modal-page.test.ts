import { beforeEach, describe, expect, it, vi } from "vitest";
import { navigate } from "../../../src/common/navigate";
import { createNativeModalDialogUrl } from "../../../src/common/url/native-modal-url";
import type { HomeAssistant } from "../../../src/types";

vi.mock("../../../src/external_app/external_app_entrypoint", () => ({
  attachExternalToApp: vi.fn(),
}));

/** Stands in for a dialog the page can host, recording what it was shown with. */
class TestHostedDialog extends HTMLElement {
  public hass!: HomeAssistant;

  public standalone = false;

  public withoutHeader = false;

  public shown: unknown[] = [];

  public actions: string[] = [];

  public showDialog(params: unknown) {
    this.shown.push(params);
  }

  public performHeaderAction(id: string) {
    this.actions.push(id);
  }
}
class OtherHostedDialog extends TestHostedDialog {}
customElements.define("test-hosted-dialog", TestHostedDialog);
customElements.define("test-other-dialog", OtherHostedDialog);

declare global {
  interface HTMLElementTagNameMap {
    "test-hosted-dialog": TestHostedDialog;
    "test-other-dialog": OtherHostedDialog;
  }
}

vi.mock("../../../src/dialogs/native-modal/native-modal-dialogs", () => ({
  NATIVE_MODAL_DIALOGS: {
    "test-hosted-dialog": {
      tag: "test-hosted-dialog",
      load: () => Promise.resolve(),
    },
    "test-other-dialog": {
      tag: "test-other-dialog",
      load: () => Promise.resolve(),
    },
  },
}));

await import("../../../src/dialogs/native-modal/ha-native-modal-page");

const dialogUrl = (params: unknown, tag = "test-hosted-dialog") =>
  createNativeModalDialogUrl({ tag, params });

/** Lets the page's dynamic import of the dialog settle. */
const settle = () =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });

describe("the page an app shows in a native modal", () => {
  let page: HTMLElement & { hass: HomeAssistant };
  let fireMessage: ReturnType<typeof vi.fn>;

  const hostedDialog = () =>
    page.shadowRoot!.querySelector<TestHostedDialog>("test-hosted-dialog");

  const openAt = async (url: string) => {
    window.history.replaceState(null, "", url);
    page = document.createElement("ha-native-modal-page") as typeof page;
    page.hass = {
      auth: { external: { config: { hasNativeModal: true }, fireMessage } },
    } as unknown as HomeAssistant;
    document.body.appendChild(page);
    await settle();
  };

  beforeEach(() => {
    fireMessage = vi.fn();
    document.body.innerHTML = "";
  });

  it("shows the dialog named in the url", async () => {
    await openAt(dialogUrl({ entry: "first" }));

    expect(hostedDialog()!.shown).toEqual([{ entry: "first" }]);
    expect(hostedDialog()!.standalone).toBe(true);
    expect(hostedDialog()!.withoutHeader).toBe(true);
  });

  // An app reuses the modal it already has, so a second one arrives as a
  // navigation rather than a fresh page.
  it("shows the next dialog the app navigates it to", async () => {
    await openAt(dialogUrl({ entry: "first" }));

    await navigate(dialogUrl({ entry: "second" }));
    await settle();

    expect(hostedDialog()!.shown).toEqual([
      { entry: "first" },
      { entry: "second" },
    ]);
  });

  it("puts another dialog in place of the one on screen", async () => {
    await openAt(dialogUrl({ entry: "first" }));

    await navigate(dialogUrl({ entry: "second" }, "test-other-dialog"));
    await settle();

    expect(hostedDialog()).toBeNull();
    const other =
      page.shadowRoot!.querySelector<OtherHostedDialog>("test-other-dialog");
    expect(other!.shown).toEqual([{ entry: "second" }]);
  });

  it("closes the modal for a url it cannot read", async () => {
    await openAt("/_modal#dialog=not-json");

    expect(hostedDialog()).toBeNull();
    expect(fireMessage).toHaveBeenCalledWith({ type: "modal/close" });
  });

  it("passes a tap on the app's header to the dialog", async () => {
    await openAt(dialogUrl({ entry: "first" }));

    page.dispatchEvent(
      new CustomEvent("native-modal-action", { detail: { id: "close" } })
    );

    expect(hostedDialog()!.actions).toEqual(["close"]);
  });

  // The page keeps showing its dialog; a link out of it belongs in the app's
  // own frontend, not in this screen.
  it("hands a link out of the dialog to the app", async () => {
    await openAt(dialogUrl({ entry: "first" }));

    await navigate("/config/devices/dashboard");

    expect(fireMessage).toHaveBeenCalledWith({
      type: "modal/navigate",
      payload: { path: "/config/devices/dashboard" },
    });
    expect(window.location.pathname).toBe("/_modal");
  });

  it("stops relaying once it is gone", async () => {
    await openAt(dialogUrl({ entry: "first" }));
    page.remove();

    await navigate("/config/devices/dashboard");

    expect(fireMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "modal/navigate" })
    );
  });
});

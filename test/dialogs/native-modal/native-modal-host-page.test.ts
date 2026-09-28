import { nothing } from "lit";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent } from "../../../src/common/dom/fire_event";
import { NativeModalHostPage } from "../../../src/dialogs/native-modal/native-modal-host-page";
import type { HomeAssistant } from "../../../src/types";

class TestHostPage extends NativeModalHostPage {
  protected render() {
    return nothing;
  }
}
customElements.define("test-native-modal-host", TestHostPage);

declare global {
  interface HTMLElementTagNameMap {
    "test-native-modal-host": TestHostPage;
  }
}

const makeHass = (hasNativeModal: boolean, fireMessage: unknown) =>
  ({
    localize: (key: string) => key,
    auth: { external: { config: { hasNativeModal }, fireMessage } },
  }) as unknown as HomeAssistant;

describe("a page the app is showing in a modal", () => {
  let page: TestHostPage;
  let fireMessage: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    fireMessage = vi.fn();
    page = document.createElement("test-native-modal-host");
    document.body.appendChild(page);
    await page.updateComplete;
  });

  const askForDialog = (dialogTag: string) => {
    const inner = document.createElement("div");
    page.appendChild(inner);
    fireEvent(inner, "show-dialog", {
      dialogTag: dialogTag as keyof HTMLElementTagNameMap,
      dialogImport: () => Promise.resolve(),
      dialogParams: { entry: { when: 1 } },
    });
  };

  it("hands a dialog the app can show to a modal of its own", () => {
    page.hass = makeHass(true, fireMessage);

    askForDialog("dialog-logbook-detail");

    const message = fireMessage.mock.calls[0][0];
    expect(message.type).toBe("modal/open");
    expect(message.payload.path).toContain("/modal#dialog=");
  });

  // A half-height modal would clip a dialog drawn in the page.
  it("asks for the whole screen for a dialog it draws itself", () => {
    page.hass = makeHass(true, fireMessage);

    askForDialog("dialog-box");

    expect(fireMessage).toHaveBeenCalledWith({
      type: "modal/update",
      payload: { size: "full" },
    });
  });

  it("says nothing without an app to say it to", () => {
    page.hass = { auth: {} } as unknown as HomeAssistant;

    askForDialog("dialog-logbook-detail");

    expect(fireMessage).not.toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent } from "../../src/common/dom/fire_event";
import { decodeNativeModalDialogUrl } from "../../src/common/url/native-modal-url";
import { HassBaseEl } from "../../src/state/hass-base-mixin";
import MoreInfoMixin from "../../src/state/more-info-mixin";
import type { HomeAssistant } from "../../src/types";

const showDialog = vi.fn(async () => true);
const replaceCurrentUrl = vi.fn();

vi.mock("../../src/dialogs/make-dialog-manager", () => ({
  showDialog: (...args: unknown[]) => showDialog(...(args as [])),
}));
vi.mock("../../src/common/navigate", () => ({
  replaceCurrentUrl: (...args: unknown[]) => replaceCurrentUrl(...(args as [])),
}));

class TestHost extends MoreInfoMixin(HassBaseEl) {}
customElements.define("test-more-info-host", TestHost);

declare global {
  interface HTMLElementTagNameMap {
    "test-more-info-host": TestHost;
  }
}

const makeHass = (hasNativeModal: boolean, fireMessage: unknown) =>
  ({
    states: {
      "light.kitchen": {
        entity_id: "light.kitchen",
        state: "on",
        attributes: { friendly_name: "Kitchen ceiling" },
      },
    },
    entities: {},
    devices: {},
    areas: {},
    localize: (key: string) => key,
    language: "en",
    translationMetadata: { translations: {} },
    auth: {
      external: { config: { hasNativeModal }, fireMessage },
    },
  }) as unknown as HomeAssistant;

describe("more-info mixin with a native modal", () => {
  let host: TestHost;
  let fireMessage: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    fireMessage = vi.fn();
    host = document.createElement("test-more-info-host") as TestHost;
    document.body.appendChild(host);
    await host.updateComplete;
  });

  const openMoreInfo = async (entityId: string | null) => {
    fireEvent(host, "hass-more-info", { entityId });
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  };

  it("hands the modal route to the app instead of opening the dialog", async () => {
    host.hass = makeHass(true, fireMessage);

    await openMoreInfo("light.kitchen");

    expect(showDialog).not.toHaveBeenCalled();
    expect(fireMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "modal/open" })
    );
    const { payload } = fireMessage.mock.calls[0][0];
    expect(
      decodeNativeModalDialogUrl(new URL(payload.path, "http://x").hash)
    ).toEqual({
      tag: "ha-more-info-dialog",
      params: { entityId: "light.kitchen", view: "info" },
    });
    expect(payload.title).toBe("Kitchen ceiling");
    expect(payload.size).toBe("full");
  });

  // The modal carries the entity in its own URL. Rewriting this page's URL would
  // make a page already inside a modal follow the entity it is asking for.
  it("leaves the page's own URL alone", async () => {
    host.hass = makeHass(true, fireMessage);

    await openMoreInfo("light.kitchen");

    expect(replaceCurrentUrl).not.toHaveBeenCalled();
  });

  // A null entity only ever closed a dialog, and none is open.
  it("does nothing without an entity", async () => {
    host.hass = makeHass(true, fireMessage);

    await openMoreInfo(null);

    expect(fireMessage).not.toHaveBeenCalled();
    expect(showDialog).not.toHaveBeenCalled();
  });

  it("opens the dialog as usual when the app shows no modals", async () => {
    host.hass = makeHass(false, fireMessage);

    await openMoreInfo("light.kitchen");

    expect(fireMessage).not.toHaveBeenCalled();
    expect(showDialog).toHaveBeenCalled();
    expect(replaceCurrentUrl).toHaveBeenCalled();
  });
});

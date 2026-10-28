import { afterEach, describe, expect, it, vi } from "vitest";
import type { HassioAddonInfo } from "../../../../src/data/hassio/addon";
import { showAlertDialog } from "../../../../src/dialogs/generic/show-dialog-box";
import type { ShowToastParams } from "../../../../src/managers/notification-manager";
import { checkForAppUpdates } from "../../../../src/panels/config/apps/common/check-for-updates";
import type { HomeAssistant } from "../../../../src/types";

vi.mock("../../../../src/dialogs/generic/show-dialog-box", () => ({
  showAlertDialog: vi.fn(),
}));

const app = (slug: string, updateAvailable: boolean) =>
  ({ slug, update_available: updateAvailable }) as HassioAddonInfo;

const mockHass = (
  addons: HassioAddonInfo[],
  failingEndpoint?: "/store/reload" | "/addons"
) => {
  const callWS = vi.fn(async ({ endpoint }: { endpoint: string }) => {
    if (endpoint === failingEndpoint) {
      throw { code: "unknown_error", message: "Repository is busy" };
    }
    return endpoint === "/addons" ? { addons } : {};
  });
  const hass = {
    callWS,
    localize: (key: string, args?: Record<string, unknown>) =>
      args ? `${key} ${JSON.stringify(args)}` : key,
  } as unknown as HomeAssistant;
  return { hass, callWS };
};

const element = () => {
  const el = document.body.appendChild(document.createElement("div"));
  const toasts: ShowToastParams[] = [];
  el.addEventListener("hass-notification", (ev) =>
    toasts.push((ev as CustomEvent<ShowToastParams>).detail)
  );
  return { el, toasts };
};

describe("checkForAppUpdates", () => {
  afterEach(() => {
    vi.clearAllMocks();
    document.body.replaceChildren();
  });

  // Supervisor only answers once every repository is pulled, which can take
  // longer than the default timeout of the websocket proxy.
  it("reloads the store without a timeout", async () => {
    const { hass, callWS } = mockHass([]);
    await checkForAppUpdates(element().el, hass);
    expect(callWS).toHaveBeenCalledWith({
      type: "supervisor/api",
      endpoint: "/store/reload",
      method: "post",
      timeout: null,
    });
  });

  it.each([
    {
      addons: [app("ssh", false), app("mosquitto", false)],
      result: "ui.panel.config.apps.store.no_updates",
    },
    {
      addons: [app("ssh", true), app("mosquitto", false)],
      result: 'ui.panel.config.apps.store.updates_available {"count":1}',
    },
    {
      addons: [app("ssh", true), app("mosquitto", true), app("vscode", true)],
      result: 'ui.panel.config.apps.store.updates_available {"count":3}',
    },
  ])(
    "replaces the checking toast with $result and returns the apps",
    async ({ addons, result }) => {
      const { hass } = mockHass(addons);
      const { el, toasts } = element();

      expect(await checkForAppUpdates(el, hass)).toEqual({ addons });

      expect(toasts).toEqual([
        {
          id: "check-app-updates",
          message: "ui.panel.config.apps.store.checking_updates",
        },
        { id: "check-app-updates", message: result },
      ]);
      expect(showAlertDialog).not.toHaveBeenCalled();
    }
  );

  it.each(["/store/reload", "/addons"] as const)(
    "closes the toast, shows the error and returns nothing when %s fails",
    async (failingEndpoint) => {
      const { hass } = mockHass([app("ssh", true)], failingEndpoint);
      const { el, toasts } = element();

      expect(await checkForAppUpdates(el, hass)).toBeUndefined();

      expect(toasts).toEqual([
        {
          id: "check-app-updates",
          message: "ui.panel.config.apps.store.checking_updates",
        },
        { id: "check-app-updates", message: "", duration: 0 },
      ]);
      expect(showAlertDialog).toHaveBeenCalledWith(el, {
        text: "Repository is busy",
      });
    }
  );
});

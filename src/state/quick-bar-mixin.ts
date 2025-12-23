import type { PropertyValues } from "lit";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../common/config/is_component_loaded";
import { canOverrideAlphanumericInput } from "../common/dom/can-override-input";
import { mainWindow } from "../common/dom/get_main_window";
import { ShortcutManager } from "../common/keyboard/shortcuts";
import { extractSearchParamsObject } from "../common/url/search-params";
import type {
  QuickBarParams,
  QuickBarSection,
} from "../dialogs/quick-bar/show-dialog-quick-bar";
import { showQuickBar } from "../dialogs/quick-bar/show-dialog-quick-bar";
import { showShortcutsDialog } from "../dialogs/shortcuts/show-shortcuts-dialog";
import { showVoiceCommandDialog } from "../dialogs/voice-command-dialog/show-ha-voice-command-dialog";
import type { Redirects } from "../panels/my/ha-panel-my";
import type { Constructor, HomeAssistant } from "../types";
import { storeState } from "../util/ha-pref-storage";
import { showToast } from "../util/toast";
import type { HassElement } from "./hass-element";

declare global {
  interface HASSDomEvents {
    "hass-quick-bar": QuickBarParams;
    "hass-quick-bar-trigger": KeyboardEvent;
    "hass-enable-shortcuts": HomeAssistant["enableShortcuts"];
  }
}

export default <T extends Constructor<HassElement>>(superClass: T) =>
  class extends superClass {
    protected firstUpdated(changedProps: PropertyValues) {
      super.firstUpdated(changedProps);

      this.addEventListener("hass-enable-shortcuts", (ev) => {
        this._updateHass({ enableShortcuts: ev.detail });
        storeState(this.hass!);
      });

      mainWindow.addEventListener("hass-quick-bar-trigger", (ev) => {
        switch (ev.detail.key) {
          case "e":
            this._showQuickBar(ev.detail, "entity");
            break;
          case "c":
            this._showQuickBar(ev.detail, "command");
            break;
          case "d":
            this._showQuickBar(ev.detail, "device");
            break;
          case "m":
            this._createMyLink(ev.detail);
            break;
          case "a":
            this._showVoiceCommandDialog(ev.detail);
            break;
          case "?":
            this._showShortcutDialog(ev.detail);
        }
      });

      this._registerShortcut();
    }

    private _registerShortcut() {
      const shortcutManager = new ShortcutManager();
      shortcutManager.add({
        // Those are for latin keyboards that have e, c, m keys
        e: { handler: (ev) => this._showQuickBar(ev, "entity") },
        c: { handler: (ev) => this._showQuickBar(ev, "command") },
        m: { handler: (ev) => this._createMyLink(ev) },
        a: { handler: (ev) => this._showVoiceCommandDialog(ev) },
        d: { handler: (ev) => this._showQuickBar(ev, "device") },
        "$mod+k": { handler: (ev) => this._showQuickBar(ev) },
        // Workaround see https://github.com/jamiebuilds/tinykeys/issues/130
        "Shift+?": { handler: (ev) => this._showShortcutDialog(ev) },
        // Those are fallbacks for non-latin keyboards that don't have e, c, m keys (qwerty-based shortcuts)
        KeyE: { handler: (ev) => this._showQuickBar(ev, "entity") },
        KeyC: { handler: (ev) => this._showQuickBar(ev, "command") },
        KeyM: { handler: (ev) => this._createMyLink(ev) },
        KeyA: { handler: (ev) => this._showVoiceCommandDialog(ev) },
        KeyD: { handler: (ev) => this._showQuickBar(ev, "device") },
        "$mod+KeyK": { handler: (ev) => this._showQuickBar(ev) },
      });
    }

    private _conversation = memoizeOne((_components) =>
      isComponentLoaded(this.hass!, "conversation")
    );

    private _showVoiceCommandDialog(e: KeyboardEvent) {
      if (
        !this.hass?.enableShortcuts ||
        !canOverrideAlphanumericInput(e.composedPath()) ||
        !this._conversation(this.hass.config.components)
      ) {
        return;
      }

      if (e.defaultPrevented) {
        return;
      }
      e.preventDefault();

      showVoiceCommandDialog(this, this.hass!, { pipeline_id: "last_used" });
    }

    private _showQuickBar(e: KeyboardEvent, mode?: QuickBarSection) {
      if (!this._canShowQuickBar(e)) {
        return;
      }

      if (e.defaultPrevented) {
        return;
      }
      e.preventDefault();

      showQuickBar(this, { mode });
    }

    private _showShortcutDialog(e: KeyboardEvent) {
      if (!this._canShowQuickBar(e)) {
        return;
      }

      if (e.defaultPrevented) {
        return;
      }
      e.preventDefault();

      showShortcutsDialog(this);
    }

    private async _createMyLink(e: KeyboardEvent) {
      if (
        !this.hass?.enableShortcuts ||
        !canOverrideAlphanumericInput(e.composedPath())
      ) {
        return;
      }

      if (e.defaultPrevented) {
        return;
      }
      e.preventDefault();

      const targetPath = mainWindow.location.pathname;
      const myParams = new URLSearchParams();

      let redirects: Redirects;

      if (targetPath.startsWith("/hassio")) {
        const myPanelSupervisor =
          await import("../../hassio/src/hassio-my-redirect");
        redirects = myPanelSupervisor.REDIRECTS;
      } else {
        const myPanel = await import("../panels/my/ha-panel-my");
        redirects = myPanel.getMyRedirects();
      }

      for (const [slug, redirect] of Object.entries(redirects)) {
        if (!targetPath.startsWith(redirect.redirect)) {
          continue;
        }
        myParams.append("redirect", slug);

        if (redirect.params) {
          const params = extractSearchParamsObject();
          for (const key of Object.keys(redirect.params)) {
            if (key in params) {
              myParams.append(key, params[key]);
            }
          }
        }
        if (redirect.redirect === "/config/integrations/integration") {
          myParams.append("domain", targetPath.split("/")[4]);
        } else if (redirect.redirect === "/hassio/addon") {
          myParams.append("addon", targetPath.split("/")[3]);
        }
        window.open(
          `https://my.home-assistant.io/create-link/?${myParams.toString()}`,
          "_blank"
        );
        return;
      }
      showToast(this, {
        message: this.hass.localize(
          "ui.notification_toast.no_matching_link_found",
          {
            path: targetPath,
          }
        ),
      });
    }

    private _canShowQuickBar(e: KeyboardEvent) {
      return (
        this.hass?.user?.is_admin &&
        this.hass.enableShortcuts &&
        canOverrideAlphanumericInput(e.composedPath())
      );
    }
  };

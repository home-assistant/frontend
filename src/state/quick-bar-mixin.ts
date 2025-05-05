import type { PropertyValues } from "lit";
import { tinykeys } from "tinykeys";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../common/config/is_component_loaded";
import { mainWindow } from "../common/dom/get_main_window";
import type { QuickBarParams } from "../dialogs/quick-bar/show-dialog-quick-bar";
import {
  QuickBarMode,
  showQuickBar,
} from "../dialogs/quick-bar/show-dialog-quick-bar";
import type { Constructor, HomeAssistant } from "../types";
import { storeState } from "../util/ha-pref-storage";
import { showToast } from "../util/toast";
import type { HassElement } from "./hass-element";
import { extractSearchParamsObject } from "../common/url/search-params";
import { showVoiceCommandDialog } from "../dialogs/voice-command-dialog/show-ha-voice-command-dialog";
import { canOverrideAlphanumericInput } from "../common/dom/can-override-input";
import { showShortcutsDialog } from "../dialogs/shortcuts/show-shortcuts-dialog";
import type { Redirects } from "../panels/my/ha-panel-my";

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
            this._showQuickBar(ev.detail);
            break;
          case "c":
            this._showQuickBar(ev.detail, QuickBarMode.Command);
            break;
          case "d":
            this._showQuickBar(ev.detail, QuickBarMode.Device);
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
      tinykeys(window, {
        // Those are for latin keyboards that have e, c, m keys
        e: (ev) => this._showQuickBar(ev),
        c: (ev) => this._showQuickBar(ev, QuickBarMode.Command),
        m: (ev) => this._createMyLink(ev),
        a: (ev) => this._showVoiceCommandDialog(ev),
        d: (ev) => this._showQuickBar(ev, QuickBarMode.Device),
        // Workaround see https://github.com/jamiebuilds/tinykeys/issues/130
        "Shift+?": (ev) => this._showShortcutDialog(ev),
        // Those are fallbacks for non-latin keyboards that don't have e, c, m keys (qwerty-based shortcuts)
        KeyE: (ev) => this._showQuickBar(ev),
        KeyC: (ev) => this._showQuickBar(ev, QuickBarMode.Command),
        KeyM: (ev) => this._createMyLink(ev),
        KeyA: (ev) => this._showVoiceCommandDialog(ev),
        KeyD: (ev) => this._showQuickBar(ev, QuickBarMode.Device),
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

    private _showQuickBar(
      e: KeyboardEvent,
      mode: QuickBarMode = QuickBarMode.Entity
    ) {
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
        const myPanelSupervisor = await import(
          "../../hassio/src/hassio-my-redirect"
        );
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

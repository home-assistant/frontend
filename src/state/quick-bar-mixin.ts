import type { PropertyValues } from "lit";
import tinykeys from "tinykeys";
import { isComponentLoaded } from "../common/config/is_component_loaded";
import { mainWindow } from "../common/dom/get_main_window";
import {
  QuickBarParams,
  showQuickBar,
} from "../dialogs/quick-bar/show-dialog-quick-bar";
import { getMyRedirects } from "../panels/my/ha-panel-my";
import { Constructor, HomeAssistant } from "../types";
import { storeState } from "../util/ha-pref-storage";
import { showToast } from "../util/toast";
import { HassElement } from "./hass-element";

declare global {
  interface HASSDomEvents {
    "hass-quick-bar": QuickBarParams;
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

      this._registerShortcut();
    }

    private _registerShortcut() {
      tinykeys(window, {
        e: (ev) => this._showQuickBar(ev),
        c: (ev) => this._showQuickBar(ev, true),
        m: (ev) => this._createMyLink(ev),
      });
    }

    private _showQuickBar(e: KeyboardEvent, commandMode = false) {
      if (!this._canShowQuickBar(e)) {
        return;
      }

      showQuickBar(this, { commandMode });
    }

    private _createMyLink(e: KeyboardEvent) {
      if (!this._canOverrideAlphanumericInput(e) || !this.hass) {
        return;
      }
      const targetPath = mainWindow.location.pathname;

      for (const [slug, redirect] of Object.entries(
        getMyRedirects(isComponentLoaded(this.hass, "hassio"))
      )) {
        if (redirect.redirect === targetPath) {
          window.open(
            `https://my.home-assistant.io/create-link/?redirect=${slug}`,
            "_blank"
          );

          return;
        }
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
        this._canOverrideAlphanumericInput(e)
      );
    }

    private _canOverrideAlphanumericInput(e: KeyboardEvent) {
      const el = e.composedPath()[0] as any;

      if (el.tagName === "TEXTAREA") {
        return false;
      }

      if (el.parentElement.tagName === "HA-SELECT") {
        return false;
      }

      if (el.tagName !== "INPUT") {
        return true;
      }

      switch (el.type) {
        case "button":
        case "checkbox":
        case "hidden":
        case "radio":
        case "range":
          return true;
        default:
          return false;
      }
    }
  };

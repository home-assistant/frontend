import type { PropertyValues } from "lit";
import tinykeys from "tinykeys";
import {
  QuickBarParams,
  showQuickBar,
} from "../dialogs/quick-bar/show-dialog-quick-bar";
import { Constructor, HomeAssistant } from "../types";
import { storeState } from "../util/ha-pref-storage";
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
      });
    }

    private _showQuickBar(e: KeyboardEvent, commandMode = false) {
      if (!this._canShowQuickBar(e)) {
        return;
      }

      showQuickBar(this, { commandMode });
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

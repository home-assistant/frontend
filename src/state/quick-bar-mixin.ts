import tinykeys from "tinykeys";
import type { Constructor, PropertyValues } from "lit-element";
import { HassElement } from "./hass-element";
import {
  QuickBarParams,
  showQuickBar,
} from "../dialogs/quick-bar/show-dialog-quick-bar";
import { HomeAssistant } from "../types";
import { storeState } from "../util/ha-pref-storage";

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
      if (
        !this.hass?.user?.is_admin ||
        !this.hass.enableShortcuts ||
        this._inInputField(e)
      ) {
        return;
      }

      showQuickBar(this, { commandMode });
    }

    private _inInputField(e: KeyboardEvent) {
      const el = e.composedPath()[0] as any;
      return (
        el.tagName === "TEXTAREA" ||
        (el.tagName === "INPUT" &&
          ["TEXT", "NUMBER"].includes(this._getInputType(el)))
      );
    }

    private _getInputType(el) {
      return el.type && el.type.toUpperCase();
    }
  };

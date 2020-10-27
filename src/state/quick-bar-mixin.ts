import type { Constructor, PropertyValues } from "lit-element";
import { HassElement } from "./hass-element";
import {
  QuickBarParams,
  showQuickBar,
} from "../dialogs/quick-bar/show-dialog-quick-bar";
import tinykeys from "tinykeys";

declare global {
  interface HASSDomEvents {
    "hass-quick-bar": QuickBarParams;
  }
}

export default <T extends Constructor<HassElement>>(superClass: T) =>
  class extends superClass {
    protected firstUpdated(changedProps: PropertyValues) {
      super.firstUpdated(changedProps);

      this._registerShortcut();
    }

    private _registerShortcut() {
      tinykeys(window, {
        e: (ev) => this._showQuickBar(ev),
        c: (ev) => this._showQuickBar(ev, true),
      });
    }

    private _showQuickBar(e: KeyboardEvent, commandMode = false) {
      if (!this.hass?.user?.is_admin || this.inInputField(e)) {
        return;
      }

      showQuickBar(this, { commandMode });
    }

    private inInputField(e: KeyboardEvent) {
      return ["INPUT", "TEXTAREA"].includes(
        (e.composedPath()[0] as HTMLElement).tagName
      );
    }
  };

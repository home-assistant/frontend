import tinykeys from "tinykeys";
import type { Constructor, PropertyValues } from "lit-element";
import { HassElement } from "./hass-element";
import {
  QuickBarParams,
  showQuickBar,
} from "../dialogs/quick-bar/show-dialog-quick-bar";
import { HomeAssistant } from "../types";
import { storeState } from "../util/ha-pref-storage";
import {
  showTemplateEditor,
  TemplateEditorParams,
} from "../dialogs/template-editor/show-dialog-template-editor";

declare global {
  interface HASSDomEvents {
    "hass-quick-bar": QuickBarParams;
    "hass-template-editor": TemplateEditorParams;
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
        t: (ev) => this._showTemplateEditor(ev),
      });
    }

    private _showQuickBar(e: KeyboardEvent, commandMode = false) {
      if (!this._canShowDialogWithShortcut(e)) {
        return;
      }

      showQuickBar(this, { commandMode });
    }

    private _showTemplateEditor(e: KeyboardEvent) {
      if (!this._canShowDialogWithShortcut(e)) {
        return;
      }

      showTemplateEditor(this, { startingTemplate: "{{ states.sun.sun }}" });
    }

    private _canShowDialogWithShortcut(e: KeyboardEvent) {
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

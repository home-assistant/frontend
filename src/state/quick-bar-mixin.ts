import type { Constructor, PropertyValues } from "lit-element";
import { HassElement } from "./hass-element";
import {
  QuickBarParams,
  showQuickBar,
} from "../dialogs/quick-bar/show-dialog-quick-bar";
import { deepActiveElement } from "../common/dom/deep-active-element";

declare global {
  interface HASSDomEvents {
    "hass-quick-bar": QuickBarParams;
  }
}

export default <T extends Constructor<HassElement>>(superClass: T) =>
  class extends superClass {
    private firstKeyPressedAt;

    protected firstUpdated(changedProps: PropertyValues) {
      super.firstUpdated(changedProps);

      this._registerShortcut();
    }

    private _registerShortcut() {
      document.addEventListener("keydown", (e: KeyboardEvent) => {
        const currentTime = +new Date();

        if (
          !this.hass?.user?.is_admin ||
          this.isModified(e) ||
          this.inInputField()
        ) {
          return;
        }

        if (
          this.firstKeyPressedAt &&
          currentTime - this.firstKeyPressedAt <= 3000
        ) {
          switch (e.code) {
            case "KeyE":
              this._showQuickBar(e, false);
              break;
            case "KeyC":
              this._showQuickBar(e, true);
              break;
            default:
              this.firstKeyPressedAt = undefined;
          }
        } else {
          this.firstKeyPressedAt = e.code === "KeyQ" ? +new Date() : undefined;
        }
      });
    }

    private _showQuickBar(e: KeyboardEvent, commandMode: boolean) {
      e.preventDefault();
      showQuickBar(this, { commandMode });
      this.firstKeyPressedAt = undefined;
    }

    private inInputField() {
      const d = deepActiveElement();
      return d && d.tagName === "INPUT";
    }

    private isModified(e: KeyboardEvent) {
      return ["Alt", "AltGraph", "Control", "Meta", "Shift"].some((meta) =>
        e.getModifierState(meta)
      );
    }
  };

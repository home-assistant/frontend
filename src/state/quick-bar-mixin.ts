import type { Constructor, PropertyValues } from "lit-element";
import { HassElement } from "./hass-element";
import {
  QuickBarParams,
  showQuickBar,
} from "../dialogs/quick-bar/show-dialog-quick-bar";

declare global {
  interface HASSDomEvents {
    "hass-quick-bar": QuickBarParams;
  }
}

const isMacOS = /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform);

export default <T extends Constructor<HassElement>>(superClass: T) =>
  class extends superClass {
    protected firstUpdated(changedProps: PropertyValues) {
      super.firstUpdated(changedProps);

      document.addEventListener("keydown", (e: KeyboardEvent) => {
        if (this.isOSCtrlKey(e) && e.code === "KeyP") {
          e.preventDefault();
          const eventParams: QuickBarParams = {};
          if (e.shiftKey) {
            eventParams.commandMode = true;
          }

          showQuickBar(this, eventParams);
        }
      });
    }

    private isOSCtrlKey(e: KeyboardEvent) {
      return isMacOS ? e.metaKey : e.ctrlKey;
    }
  };

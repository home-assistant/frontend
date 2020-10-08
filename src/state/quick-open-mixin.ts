import type { Constructor, PropertyValues } from "lit-element";
import { HassElement } from "./hass-element";
import {
  QuickOpenDialogParams,
  showQuickOpenDialog,
} from "../dialogs/quick-open/show-dialog-quick-open";

declare global {
  interface HASSDomEvents {
    "hass-quick-open": QuickOpenDialogParams;
  }
}

export default <T extends Constructor<HassElement>>(superClass: T) =>
  class extends superClass {
    protected firstUpdated(changedProps: PropertyValues) {
      super.firstUpdated(changedProps);

      document.addEventListener("keydown", (e: KeyboardEvent) => {
        if (e.code === "KeyP" && e.metaKey) {
          e.preventDefault();
          const eventParams: QuickOpenDialogParams = {};
          if (e.shiftKey) {
            eventParams.commandMode = true;
          }

          showQuickOpenDialog(this, eventParams);
        }
      });
    }
  };

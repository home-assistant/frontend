import type { PropertyValues } from "lit";
import type { HASSDomEvent } from "../common/dom/fire_event";
import {
  showAutomationEditor,
  type ShowAutomationEditorParams,
} from "../data/automation";
import type { Constructor } from "../types";
import type { HassBaseEl } from "./hass-base-mixin";

declare global {
  interface HASSDomEvents {
    /**
     * Dispatched to open the automation editor.
     * Used by custom cards/panels to trigger the editor view.
     */
    "hass-automation-editor": ShowAutomationEditorParams;
  }
}

export default <T extends Constructor<HassBaseEl>>(superClass: T) =>
  class extends superClass {
    protected firstUpdated(changedProps: PropertyValues) {
      super.firstUpdated(changedProps);
      this.addEventListener("hass-automation-editor", (ev) =>
        this._handleShowAutomationEditor(
          ev as HASSDomEvent<ShowAutomationEditorParams>
        )
      );
    }

    private _handleShowAutomationEditor(
      ev: HASSDomEvent<ShowAutomationEditorParams>
    ) {
      showAutomationEditor(ev.detail.data, ev.detail.expanded);
    }
  };

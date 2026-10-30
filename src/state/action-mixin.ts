import type { PropertyValues } from "lit";
import type { HASSDomEvent } from "../common/dom/fire_event";
import type { ActionConfigParams } from "../panels/lovelace/common/handle-action";
import { handleAction } from "../panels/lovelace/common/handle-action";
import type { Constructor } from "../types";
import type { HassBaseEl } from "./hass-base-mixin";

declare global {
  // for fire event
  interface HASSDomEvents {
    "hass-action": { config: ActionConfigParams; action: string };
  }
}

export default <T extends Constructor<HassBaseEl>>(superClass: T) =>
  class extends superClass {
    protected firstUpdated(changedProps: PropertyValues<this>) {
      super.firstUpdated(changedProps);
      this.addEventListener("hass-action", (ev) => this._handleAction(ev));
    }

    private async _handleAction(
      ev: HASSDomEvent<HASSDomEvents["hass-action"]>
    ) {
      if (!this.hass) return;
      // Act from the element that fired the action so events such as
      // `ll-custom` still reach the listeners between it and the app root.
      const node = (ev.composedPath()[0] as HTMLElement | undefined) ?? this;
      handleAction(node, this.hass, ev.detail.config, ev.detail.action);
    }
  };

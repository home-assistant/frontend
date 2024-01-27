import type { PropertyValues } from "lit";
import type { HASSDomEvent } from "../common/dom/fire_event";
import {
  ActionConfigParams,
  handleAction,
} from "../panels/lovelace/common/handle-action";
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
    protected firstUpdated(changedProps: PropertyValues) {
      super.firstUpdated(changedProps);
      this.addEventListener("hass-action", (ev) => this._handleAction(ev));
    }

    private async _handleAction(
      ev: HASSDomEvent<{ config: ActionConfigParams; action: string }>
    ) {
      if (!this.hass) return;
      handleAction(this, this.hass, ev.detail.config, ev.detail.action);
    }
  };

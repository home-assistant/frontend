import type { PropertyValues } from "lit";
import type { HASSDomEvent } from "../common/dom/fire_event";
import { computeDomain } from "../common/entity/compute_domain";
import { showDialog } from "../dialogs/make-dialog-manager";
import type { MoreInfoDialogParams } from "../dialogs/more-info/ha-more-info-dialog";
import type { Constructor } from "../types";
import type { HassBaseEl } from "./hass-base-mixin";

const LARGE_MORE_INFO_DOMAINS = ["camera", "image"];

declare global {
  // for fire event
  interface HASSDomEvents {
    "hass-more-info": MoreInfoDialogParams;
  }
}

export default <T extends Constructor<HassBaseEl>>(superClass: T) =>
  class extends superClass {
    protected firstUpdated(changedProps: PropertyValues) {
      super.firstUpdated(changedProps);
      this.addEventListener("hass-more-info", (ev) => this._handleMoreInfo(ev));

      // Load it once we are having the initial rendering done.
      import("../dialogs/more-info/ha-more-info-dialog");
    }

    private async _handleMoreInfo(ev: HASSDomEvent<MoreInfoDialogParams>) {
      showDialog(
        this,
        "ha-more-info-dialog",
        {
          entityId: ev.detail.entityId,
          view: ev.detail.view || ev.detail.tab,
          large:
            ev.detail.large ??
            (ev.detail.entityId
              ? LARGE_MORE_INFO_DOMAINS.includes(
                  computeDomain(ev.detail.entityId)
                )
              : false),
          data: ev.detail.data,
        },
        () => import("../dialogs/more-info/ha-more-info-dialog"),
        ev.detail.parentElement,
        true,
        undefined
      );
    }
  };

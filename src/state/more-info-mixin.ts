import type { PropertyValues } from "lit";
import type { HASSDomEvent } from "../common/dom/fire_event";
import { mainWindow } from "../common/dom/get_main_window";
import { computeDomain } from "../common/entity/compute_domain";
import { replaceCurrentUrl } from "../common/navigate";
import {
  createMoreInfoUrl,
  removeMoreInfoUrl,
} from "../common/url/more-info-query-params";
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
    protected firstUpdated(changedProps: PropertyValues<this>) {
      super.firstUpdated(changedProps);
      this.addEventListener("hass-more-info", (ev) => this._handleMoreInfo(ev));

      // Load it once we are having the initial rendering done.
      import("../dialogs/more-info/ha-more-info-dialog");
    }

    private async _handleMoreInfo(
      ev: HASSDomEvent<HASSDomEvents["hass-more-info"]>
    ) {
      const view = ev.detail.view || ev.detail.tab || "info";
      const currentUrl = `${mainWindow.location.pathname}${mainWindow.location.search}${mainWindow.location.hash}`;
      const returnUrl = ev.detail.fromUrl
        ? removeMoreInfoUrl(currentUrl)
        : currentUrl;

      replaceCurrentUrl(returnUrl);
      const shown = await showDialog(
        this,
        "ha-more-info-dialog",
        {
          entityId: ev.detail.entityId,
          view,
          large:
            ev.detail.large ??
            (ev.detail.entityId
              ? LARGE_MORE_INFO_DOMAINS.includes(
                  computeDomain(ev.detail.entityId)
                )
              : false),
          data: ev.detail.data,
          returnUrl,
        },
        () => import("../dialogs/more-info/ha-more-info-dialog"),
        ev.detail.parentElement
      );
      if (shown && ev.detail.entityId) {
        replaceCurrentUrl(
          createMoreInfoUrl(returnUrl, {
            entityId: ev.detail.entityId,
            view,
          })
        );
      }
    }
  };

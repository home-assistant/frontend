import { MediaPlayerBrowseDialogParams } from "../data/media-player";
import { Constructor } from "../types";
import { HassBaseEl } from "./hass-base-mixin";

export default <T extends Constructor<HassBaseEl>>(superClass: T) =>
  class extends superClass {
    protected firstUpdated(changedProps) {
      super.firstUpdated(changedProps);
      // @ts-ignore
      this.registerDialog({
        dialogShowEvent: "ha-media-player-browse-dialog",
        dialogTag: "dialog-media-player-browse",
        dialogImport: () =>
          import(
            /* webpackChunkName: "dialog-media-player-browse" */ "../components/media-player/dialog-media-player-browse"
          ),
      });
    }
  };

declare global {
  // for fire event
  interface HASSDomEvents {
    "ha-media-player-browse-dialog": MediaPlayerBrowseDialogParams;
  }
}

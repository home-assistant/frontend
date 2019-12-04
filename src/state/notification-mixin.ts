import { HassBaseEl } from "./hass-base-mixin";
import { Constructor } from "../types";

export default <T extends Constructor<HassBaseEl>>(superClass: T) =>
  class extends superClass {
    protected firstUpdated(changedProps) {
      super.firstUpdated(changedProps);
      // @ts-ignore
      this.registerDialog({
        dialogShowEvent: "hass-notification",
        dialogTag: "notification-manager",
        dialogImport: () =>
          import(
            /* webpackChunkName: "notification-manager" */ "../managers/notification-manager"
          ),
      });
    }
  };

import { Constructor } from "../types";
import { HassBaseEl } from "./hass-base-mixin";

export default <T extends Constructor<HassBaseEl>>(superClass: T) =>
  class extends superClass {
    protected firstUpdated(changedProps) {
      super.firstUpdated(changedProps);
      // @ts-ignore
      this.registerDialog({
        dialogShowEvent: "hass-notification",
        dialogTag: "notification-manager",
        dialogImport: () => import("../managers/notification-manager"),
        addHistory: false,
      });
    }
  };

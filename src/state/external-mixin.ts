import { Constructor } from "../types";
import { HassBaseEl } from "./hass-base-mixin";

export const ExternalMixin = <T extends Constructor<HassBaseEl>>(
  superClass: T
) =>
  class extends superClass {
    protected hassConnected() {
      super.hassConnected();

      if (this.hass!.auth.external) {
        this.hass!.auth.external.connection = this.hass!.connection;
      }
    }
  };

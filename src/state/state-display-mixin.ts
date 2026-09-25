import type { PropertyValues } from "lit";
import { computeFormatFunctions } from "../common/translations/entity-state";
import type { Constructor, HomeAssistant } from "../types";
import type { HassBaseEl } from "./hass-base-mixin";

export default <T extends Constructor<HassBaseEl>>(superClass: T) => {
  class StateDisplayMixin extends superClass {
    protected hassConnected() {
      super.hassConnected();
      this._updateFormatFunctions();
    }

    protected willUpdate(changedProps: PropertyValues<this>) {
      super.willUpdate(changedProps);

      if (!changedProps.has("hass")) {
        return;
      }
      const oldHass = changedProps.get("hass") as HomeAssistant | undefined;

      if (
        this.hass &&
        (!oldHass ||
          this.hass.localize !== oldHass.localize ||
          this.hass.locale !== oldHass.locale ||
          this.hass.config !== oldHass.config ||
          this.hass.entities !== oldHass.entities ||
          this.hass.devices !== oldHass.devices ||
          this.hass.areas !== oldHass.areas ||
          this.hass.floors !== oldHass.floors)
      ) {
        this._updateFormatFunctions();
      }
    }

    private _updateFormatFunctions = async () => {
      if (!this.hass?.config) {
        return;
      }

      const formatFunctions = await computeFormatFunctions(
        this.hass.localize,
        this.hass.locale,
        this.hass.config,
        this.hass.entities,
        this.hass.devices,
        this.hass.areas,
        this.hass.floors
      );
      this._updateHass(formatFunctions);
    };
  }
  return StateDisplayMixin;
};

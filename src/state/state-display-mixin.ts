import { isComponentLoaded } from "../common/config/is_component_loaded";
import { computeFormatFunctions } from "../common/translations/entity-state";
import { getSensorNumericDeviceClasses } from "../data/sensor";
import type { Constructor, HomeAssistant } from "../types";
import type { HassBaseEl } from "./hass-base-mixin";

export default <T extends Constructor<HassBaseEl>>(superClass: T) => {
  class StateDisplayMixin extends superClass {
    protected hassConnected() {
      super.hassConnected();
      this._updateStateDisplay();
    }

    protected willUpdate(changedProps) {
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
          this.hass.entities !== oldHass.entities)
      ) {
        this._updateStateDisplay();
      }
    }

    private _updateStateDisplay = async () => {
      if (!this.hass || !this.hass.config) {
        return;
      }

      let sensorNumericDeviceClasses: string[] = [];

      if (isComponentLoaded(this.hass, "sensor")) {
        try {
          sensorNumericDeviceClasses = (
            await getSensorNumericDeviceClasses(this.hass)
          ).numeric_device_classes;
        } catch (_err: any) {
          // ignore
        }
      }

      const {
        formatEntityState,
        formatEntityAttributeName,
        formatEntityAttributeValue,
        formatEntityName,
      } = await computeFormatFunctions(
        this.hass.localize,
        this.hass.locale,
        this.hass.config,
        this.hass.entities,
        this.hass.devices,
        this.hass.areas,
        this.hass.floors,
        sensorNumericDeviceClasses
      );
      this._updateHass({
        formatEntityState,
        formatEntityAttributeName,
        formatEntityAttributeValue,
        formatEntityName,
      });
    };
  }
  return StateDisplayMixin;
};

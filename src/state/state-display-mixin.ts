import { isComponentLoaded } from "../common/config/is_component_loaded";
import { computeFormatFunctions } from "../common/translations/entity-state";
import { getSensorNumericDeviceClasses } from "../data/sensor";
import type { Constructor, HomeAssistant } from "../types";
import type { HassBaseEl } from "./hass-base-mixin";

export default <T extends Constructor<HassBaseEl>>(superClass: T) => {
  class StateDisplayMixin extends superClass {
    private _updateFormatFunctionsIteration = 0;

    protected firstUpdated(changedProps) {
      super.firstUpdated(changedProps);
      this.addEventListener("translations-updated", () =>
        this._updateFormatFunctions()
      );
    }

    protected hassConnected() {
      super.hassConnected();
      this._updateFormatFunctions();
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
          this.hass.entities !== oldHass.entities ||
          this.hass.devices !== oldHass.devices ||
          this.hass.areas !== oldHass.areas ||
          this.hass.floors !== oldHass.floors)
      ) {
        this._updateFormatFunctions();
      }
    }

    private async _updateFormatFunctions() {
      if (!this.hass?.config) {
        return;
      }

      const iteration = ++this._updateFormatFunctionsIteration;

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

      if (this._updateFormatFunctionsIteration !== iteration) {
        return;
      }

      const {
        formatEntityState,
        formatEntityAttributeName,
        formatEntityAttributeValue,
        formatEntityAttributeValueToParts,
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

      if (this._updateFormatFunctionsIteration !== iteration) {
        return;
      }

      this._updateHass({
        formatEntityState,
        formatEntityAttributeName,
        formatEntityAttributeValue,
        formatEntityAttributeValueToParts,
        formatEntityName,
      });
    }
  }
  return StateDisplayMixin;
};

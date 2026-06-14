import type { PropertyValues } from "lit";
import { isComponentLoaded } from "../common/config/is_component_loaded";
import { computeFormatFunctions } from "../common/translations/entity-state";
import { getSensorNumericDeviceClasses } from "../data/sensor";
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

    // Sensor numeric device classes, fetched once. Until they load we format
    // with an empty list so entities render formatted instead of raw.
    private _sensorNumericDeviceClasses?: string[];

    // Guards against a slower, stale computation overwriting a newer one.
    private _formatFunctionsVersion = 0;

    private _updateFormatFunctions = async () => {
      if (!this.hass?.config) {
        return;
      }

      // Don't block formatting on the device classes round-trip: format with
      // what we have now and refine once it resolves.
      if (
        this._sensorNumericDeviceClasses === undefined &&
        isComponentLoaded(this.hass.config, "sensor")
      ) {
        getSensorNumericDeviceClasses(this.hass)
          .then((res) => {
            this._sensorNumericDeviceClasses = res.numeric_device_classes;
            return this._setFormatFunctions(res.numeric_device_classes);
          })
          .catch(() => {
            // Keep the empty list; it's retried on the next update.
          });
      }

      await this._setFormatFunctions(this._sensorNumericDeviceClasses ?? []);
    };

    private _setFormatFunctions = async (
      sensorNumericDeviceClasses: string[]
    ) => {
      if (!this.hass?.config) {
        return;
      }

      const version = ++this._formatFunctionsVersion;
      const formatFunctions = await computeFormatFunctions(
        this.hass.localize,
        this.hass.locale,
        this.hass.config,
        this.hass.entities,
        this.hass.devices,
        this.hass.areas,
        this.hass.floors,
        sensorNumericDeviceClasses
      );

      // Ignore the result if a newer computation has since started.
      if (version === this._formatFunctionsVersion) {
        this._updateHass(formatFunctions);
      }
    };
  }
  return StateDisplayMixin;
};

import type { HassEntity } from "home-assistant-js-websocket";
import { supportsFeatureFromAttributes } from "../../common/entity/supports-feature";
import {
  CLIMATE_HVAC_ACTION_TO_MODE,
  ClimateEntityFeature,
} from "../../data/climate";
import type { HvacAction } from "../../data/climate";
import { MockBaseEntity } from "./base-entity";
import type { EntityAttributes } from "./types";

// Reverse mapping: mode → action (e.g. "cool" → "cooling")
const HVAC_MODE_TO_ACTION: Partial<Record<string, HvacAction>> =
  Object.fromEntries(
    Object.entries(CLIMATE_HVAC_ACTION_TO_MODE).map(([action, mode]) => [
      mode,
      action as HvacAction,
    ])
  );

export class MockClimateEntity extends MockBaseEntity {
  public async handleService(
    domain: string,
    service: string,
    data: Record<string, any>
  ): Promise<void> {
    if (!["homeassistant", this.domain].includes(domain)) {
      return;
    }

    if (service === "turn_on") {
      const attrs = { ...this.attributes };
      const hvacModes: string[] = attrs.hvac_modes || [];
      // Turn on to the first non-off mode
      const onMode = hvacModes.find((m) => m !== "off") || "heat";
      this.update({ state: onMode, attributes: attrs });
      return;
    }

    if (service === "turn_off") {
      this.update({ state: "off" });
      return;
    }

    if (service === "toggle") {
      if (this.state === "off") {
        this.handleService(domain, "turn_on", data);
      } else {
        this.handleService(domain, "turn_off", data);
      }
      return;
    }

    if (service === "set_hvac_mode") {
      this.update({ state: data.hvac_mode });
      return;
    }

    if (service === "set_temperature") {
      const attrs: EntityAttributes = {};
      if (data.temperature !== undefined) {
        attrs.temperature = data.temperature;
      }
      if (data.target_temp_high !== undefined) {
        attrs.target_temp_high = data.target_temp_high;
      }
      if (data.target_temp_low !== undefined) {
        attrs.target_temp_low = data.target_temp_low;
      }
      if (data.hvac_mode !== undefined) {
        this.update({ state: data.hvac_mode, attributes: attrs });
      } else {
        this.update({ attributes: attrs });
      }
      return;
    }

    if (service === "set_humidity") {
      this.update({ attributes: { humidity: data.humidity } });
      return;
    }

    if (service === "set_fan_mode") {
      this.update({ attributes: { fan_mode: data.fan_mode } });
      return;
    }

    if (service === "set_preset_mode") {
      this.update({ attributes: { preset_mode: data.preset_mode } });
      return;
    }

    if (service === "set_swing_mode") {
      this.update({ attributes: { swing_mode: data.swing_mode } });
      return;
    }

    if (service === "set_swing_horizontal_mode") {
      this.update({
        attributes: { swing_horizontal_mode: data.swing_horizontal_mode },
      });
      return;
    }

    if (service === "set_aux_heat") {
      this.update({ attributes: { aux_heat: data.aux_heat } });
      return;
    }

    super.handleService(domain, service, data);
  }

  private _getCapabilityAttributes(): EntityAttributes {
    const attrs = this.attributes;
    const capabilityAttrs: EntityAttributes = {};

    capabilityAttrs.hvac_modes = attrs.hvac_modes;
    capabilityAttrs.min_temp = attrs.min_temp;
    capabilityAttrs.max_temp = attrs.max_temp;

    if (attrs.target_temp_step !== undefined) {
      capabilityAttrs.target_temp_step = attrs.target_temp_step;
    }

    if (supportsFeatureFromAttributes(attrs, ClimateEntityFeature.FAN_MODE)) {
      capabilityAttrs.fan_modes = attrs.fan_modes;
    }

    if (
      supportsFeatureFromAttributes(attrs, ClimateEntityFeature.PRESET_MODE)
    ) {
      capabilityAttrs.preset_modes = attrs.preset_modes;
    }

    if (supportsFeatureFromAttributes(attrs, ClimateEntityFeature.SWING_MODE)) {
      capabilityAttrs.swing_modes = attrs.swing_modes;
    }

    if (
      supportsFeatureFromAttributes(
        attrs,
        ClimateEntityFeature.SWING_HORIZONTAL_MODE
      )
    ) {
      capabilityAttrs.swing_horizontal_modes = attrs.swing_horizontal_modes;
    }

    if (
      supportsFeatureFromAttributes(attrs, ClimateEntityFeature.TARGET_HUMIDITY)
    ) {
      capabilityAttrs.min_humidity = attrs.min_humidity;
      capabilityAttrs.max_humidity = attrs.max_humidity;
      if (attrs.target_humidity_step !== undefined) {
        capabilityAttrs.target_humidity_step = attrs.target_humidity_step;
      }
    }

    return capabilityAttrs;
  }

  private _getStateAttributes(): EntityAttributes {
    const attrs = this.attributes;
    const isOff = this.state === "off";

    const stateAttrs: EntityAttributes = {
      current_temperature: attrs.current_temperature ?? null,
      hvac_action: isOff ? "off" : this._computeHvacAction(),
    };

    // Target temperature
    if (
      supportsFeatureFromAttributes(
        attrs,
        ClimateEntityFeature.TARGET_TEMPERATURE
      )
    ) {
      stateAttrs.temperature = isOff ? null : (attrs.temperature ?? null);
    }

    // Target temperature range
    if (
      supportsFeatureFromAttributes(
        attrs,
        ClimateEntityFeature.TARGET_TEMPERATURE_RANGE
      )
    ) {
      stateAttrs.target_temp_high = isOff
        ? null
        : (attrs.target_temp_high ?? null);
      stateAttrs.target_temp_low = isOff
        ? null
        : (attrs.target_temp_low ?? null);
    }

    // Humidity
    if (
      supportsFeatureFromAttributes(attrs, ClimateEntityFeature.TARGET_HUMIDITY)
    ) {
      stateAttrs.humidity = isOff ? null : (attrs.humidity ?? null);
      stateAttrs.current_humidity = attrs.current_humidity ?? null;
    }

    // Fan mode
    if (supportsFeatureFromAttributes(attrs, ClimateEntityFeature.FAN_MODE)) {
      stateAttrs.fan_mode = isOff ? null : (attrs.fan_mode ?? null);
    }

    // Preset mode
    if (
      supportsFeatureFromAttributes(attrs, ClimateEntityFeature.PRESET_MODE)
    ) {
      stateAttrs.preset_mode = isOff ? null : (attrs.preset_mode ?? null);
    }

    // Swing mode
    if (supportsFeatureFromAttributes(attrs, ClimateEntityFeature.SWING_MODE)) {
      stateAttrs.swing_mode = isOff ? null : (attrs.swing_mode ?? null);
    }

    // Swing horizontal mode
    if (
      supportsFeatureFromAttributes(
        attrs,
        ClimateEntityFeature.SWING_HORIZONTAL_MODE
      )
    ) {
      stateAttrs.swing_horizontal_mode = isOff
        ? null
        : (attrs.swing_horizontal_mode ?? null);
    }

    // Aux heat
    if (supportsFeatureFromAttributes(attrs, ClimateEntityFeature.AUX_HEAT)) {
      stateAttrs.aux_heat = isOff ? null : (attrs.aux_heat ?? null);
    }

    return stateAttrs;
  }

  private _computeHvacAction(): HvacAction {
    const attrs = this.attributes;
    const state = this.state;

    if (state === "off") {
      return "off";
    }

    // Use the reverse mapping for direct mode → action (e.g. "fan_only" → "fan", "dry" → "drying")
    const directAction = HVAC_MODE_TO_ACTION[state];
    if (directAction && directAction !== "idle" && directAction !== "off") {
      return directAction;
    }

    if (
      supportsFeatureFromAttributes(
        attrs,
        ClimateEntityFeature.TARGET_TEMPERATURE
      )
    ) {
      const current = attrs.current_temperature;
      const target = attrs.temperature;
      if (current != null && target != null) {
        if (state === "heat") {
          return target > current ? "heating" : "idle";
        }
        if (state === "cool") {
          return target < current ? "cooling" : "idle";
        }
      }
    }

    if (
      supportsFeatureFromAttributes(
        attrs,
        ClimateEntityFeature.TARGET_TEMPERATURE_RANGE
      )
    ) {
      const current = attrs.current_temperature;
      const lowTarget = attrs.target_temp_low;
      const highTarget = attrs.target_temp_high;
      if (current != null) {
        if (lowTarget != null && lowTarget > current) {
          return "heating";
        }
        if (highTarget != null && highTarget < current) {
          return "cooling";
        }
        return "idle";
      }
    }

    return "idle";
  }

  public toState(): HassEntity {
    const attrs = this.attributes;

    // Base attributes (friendly_name, icon, etc.)
    const baseAttrs: EntityAttributes = {};
    for (const key of [
      "friendly_name",
      "icon",
      "entity_picture",
      "assumed_state",
      "device_class",
      "supported_features",
    ]) {
      if (key in attrs) {
        baseAttrs[key] = attrs[key];
      }
    }

    return {
      entity_id: this.entityId,
      state: this.state,
      attributes: {
        ...baseAttrs,
        ...this._getCapabilityAttributes(),
        ...this._getStateAttributes(),
      },
      last_changed: this.lastChanged,
      last_updated: this.lastUpdated,
      context: { id: this.entityId, user_id: null, parent_id: null },
    };
  }
}

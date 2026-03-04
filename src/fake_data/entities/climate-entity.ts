import type { HassEntity } from "home-assistant-js-websocket";
import { supportsFeature } from "../../common/entity/supports-feature";
import { ClimateEntityFeature } from "../../data/climate";
import { MockBaseEntity, BASE_CAPABILITY_ATTRIBUTES } from "./base-entity";

export class MockClimateEntity extends MockBaseEntity {
  static CAPABILITY_ATTRIBUTES = new Set([
    ...BASE_CAPABILITY_ATTRIBUTES,
    "hvac_modes",
    "min_temp",
    "max_temp",
    "target_temp_step",
    "fan_modes",
    "preset_modes",
    "swing_modes",
    "min_humidity",
    "max_humidity",
  ]);

  public async handleService(
    domain: string,
    service: string,
    data: Record<string, any>
  ): Promise<void> {
    if (domain !== this.domain) {
      return;
    }

    if (service === "set_hvac_mode") {
      this.update({ state: data.hvac_mode });
      return;
    }
    if (
      [
        "set_temperature",
        "set_humidity",
        "set_hvac_mode",
        "set_fan_mode",
        "set_preset_mode",
        "set_swing_mode",
        "set_aux_heat",
      ].includes(service)
    ) {
      const { entity_id: _entityId, ...toSet } = data;
      this.update({ attributes: toSet });
      return;
    }
    super.handleService(domain, service, data);
  }

  public toState(): HassEntity {
    const state = super.toState();

    state.attributes.hvac_action = undefined;

    if (supportsFeature(state, ClimateEntityFeature.TARGET_TEMPERATURE)) {
      const current = state.attributes.current_temperature;
      const target = state.attributes.temperature;
      if (state.state === "heat") {
        state.attributes.hvac_action = target >= current ? "heating" : "idle";
      }
      if (state.state === "cool") {
        state.attributes.hvac_action = target <= current ? "cooling" : "idle";
      }
    }
    if (supportsFeature(state, ClimateEntityFeature.TARGET_TEMPERATURE_RANGE)) {
      const current = state.attributes.current_temperature;
      const lowTarget = state.attributes.target_temp_low;
      const highTarget = state.attributes.target_temp_high;
      state.attributes.hvac_action =
        lowTarget >= current
          ? "heating"
          : highTarget <= current
            ? "cooling"
            : "idle";
    }
    return state;
  }
}

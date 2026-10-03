import { supportsFeatureFromAttributes } from "../../common/entity/supports-feature";
import { WaterHeaterEntityFeature } from "../../data/water_heater";
import { MockBaseEntity } from "./base-entity";
import type { EntityAttributes } from "./types";

export class MockWaterHeaterEntity extends MockBaseEntity {
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
      const operationList: string[] = attrs.operation_list || [];
      const onMode = operationList.find((m) => m !== "off") || "eco";
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

    if (service === "set_operation_mode") {
      this.update({ state: data.operation_mode });
      return;
    }

    if (service === "set_temperature") {
      const attrs: EntityAttributes = {};
      if (data.temperature !== undefined) {
        attrs.temperature = data.temperature;
      }
      if (data.operation_mode !== undefined) {
        this.update({ state: data.operation_mode, attributes: attrs });
      } else {
        this.update({ attributes: attrs });
      }
      return;
    }

    if (service === "set_away_mode") {
      this.update({ attributes: { away_mode: data.away_mode } });
      return;
    }

    super.handleService(domain, service, data);
  }

  protected _getCapabilityAttributes(): EntityAttributes {
    const attrs = this.attributes;
    const capabilityAttrs: EntityAttributes = {};

    capabilityAttrs.min_temp = attrs.min_temp;
    capabilityAttrs.max_temp = attrs.max_temp;

    if (attrs.target_temp_step !== undefined) {
      capabilityAttrs.target_temp_step = attrs.target_temp_step;
    }

    if (
      supportsFeatureFromAttributes(
        attrs,
        WaterHeaterEntityFeature.OPERATION_MODE
      )
    ) {
      capabilityAttrs.operation_list = attrs.operation_list;
    }

    return capabilityAttrs;
  }

  protected _getStateAttributes(): EntityAttributes {
    const attrs = this.attributes;
    const isOff = this.state === "off";

    const stateAttrs: EntityAttributes = {
      current_temperature: attrs.current_temperature ?? null,
    };

    if (
      supportsFeatureFromAttributes(
        attrs,
        WaterHeaterEntityFeature.TARGET_TEMPERATURE
      )
    ) {
      stateAttrs.temperature = isOff ? null : (attrs.temperature ?? null);
    }

    if (
      supportsFeatureFromAttributes(
        attrs,
        WaterHeaterEntityFeature.OPERATION_MODE
      )
    ) {
      stateAttrs.operation_mode = attrs.operation_mode ?? null;
    }

    if (
      supportsFeatureFromAttributes(attrs, WaterHeaterEntityFeature.AWAY_MODE)
    ) {
      stateAttrs.away_mode = isOff ? null : (attrs.away_mode ?? null);
    }

    return stateAttrs;
  }
}

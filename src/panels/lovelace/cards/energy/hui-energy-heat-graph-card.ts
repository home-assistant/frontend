import { customElement } from "lit/decorators";
import type { HomeAssistant } from "../../../../types";
import type { EnergyHeatGraphCardConfig } from "../types";
import { EnergyMeterGraphCard } from "./hui-energy-meter-graph-card";

@customElement("hui-energy-heat-graph-card")
export class HuiEnergyHeatGraphCard extends EnergyMeterGraphCard {
  public static getStubConfig(
    _hass: HomeAssistant,
    _entities: string[],
    _entitiesFill: string[]
  ): EnergyHeatGraphCardConfig {
    return { type: "energy-heat-graph" };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-energy-heat-graph-card": HuiEnergyHeatGraphCard;
  }
}

import { customElement } from "lit/decorators";
import type { HomeAssistant } from "../../../../types";
import type { EnergyWaterGraphCardConfig } from "../types";
import { EnergyMeterGraphCard } from "./hui-energy-meter-graph-card";

@customElement("hui-energy-water-graph-card")
export class HuiEnergyWaterGraphCard extends EnergyMeterGraphCard {
  public static getStubConfig(
    _hass: HomeAssistant,
    _entities: string[],
    _entitiesFill: string[]
  ): EnergyWaterGraphCardConfig {
    return { type: "energy-water-graph" };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-energy-water-graph-card": HuiEnergyWaterGraphCard;
  }
}

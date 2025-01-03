import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import { computeStateDomain } from "../../../../common/entity/compute_state_domain";
import type { LovelaceViewConfig } from "../../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../../types";
import type { MapCardConfig } from "../../cards/types";

export type MapViewStrategyConfig = {
  type: "map";
};

const getMapEntities = (hass: HomeAssistant) => {
  const personSources = new Set<string>();
  const locationEntities: string[] = [];
  Object.values(hass.states).forEach((entity) => {
    if (
      !("latitude" in entity.attributes) ||
      !("longitude" in entity.attributes)
    ) {
      return;
    }
    locationEntities.push(entity.entity_id);
    if (computeStateDomain(entity) === "person" && entity.attributes.source) {
      personSources.add(entity.attributes.source);
    }
  });

  return locationEntities.filter((entity) => !personSources.has(entity));
};

@customElement("map-view-strategy")
export class MapViewStrategy extends ReactiveElement {
  static async generate(
    _config: MapViewStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceViewConfig> {
    const entities = getMapEntities(hass);
    return {
      type: "panel",
      title: hass.localize("panel.map"),
      icon: "mdi:map",
      cards: [
        {
          type: "map",
          auto_fit: true,
          entities: entities,
        } as MapCardConfig,
      ],
    };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "map-view-strategy": MapViewStrategy;
  }
}

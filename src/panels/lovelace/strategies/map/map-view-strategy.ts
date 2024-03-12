import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import { LovelaceViewConfig } from "../../../../data/lovelace/config/view";
import { MapCardConfig } from "../../cards/types";
import { HomeAssistant } from "../../../../types";
import { computeStateDomain } from "../../../../common/entity/compute_state_domain";

export type MapViewStrategyConfig = {
  type: "map";
  hidden_entities: string[];
};

export const getMapEntities = (
  hass: HomeAssistant,
  hidden_entities: string[] = []
) => {
  const personSources = new Set<string>();
  const locationEntities: string[] = [];
  Object.values(hass.states).forEach((entity) => {
    if (
      entity.state === "home" ||
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

  return locationEntities.filter(
    (entity) => !personSources.has(entity) && !hidden_entities.includes(entity)
  );
};

@customElement("map-view-strategy")
export class MapViewStrategy extends ReactiveElement {
  static async generate(
    config: MapViewStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceViewConfig> {
    const entities = getMapEntities(hass, config.hidden_entities);
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

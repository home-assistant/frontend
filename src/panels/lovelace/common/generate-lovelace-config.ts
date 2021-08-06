import { HassEntities, HassEntity } from "home-assistant-js-websocket";
import { computeDomain } from "../../../common/entity/compute_domain";
import { computeStateDomain } from "../../../common/entity/compute_state_domain";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { splitByGroups } from "../../../common/entity/split_by_groups";
import { compare } from "../../../common/string/compare";
import { LocalizeFunc } from "../../../common/translations/localize";
import type { AreaRegistryEntry } from "../../../data/area_registry";
import type { DeviceRegistryEntry } from "../../../data/device_registry";
import {
  EnergyPreferences,
  GridSourceTypeEnergyPreference,
} from "../../../data/energy";
import type { EntityRegistryEntry } from "../../../data/entity_registry";
import { domainToName } from "../../../data/integration";
import { LovelaceCardConfig, LovelaceViewConfig } from "../../../data/lovelace";
import { SENSOR_DEVICE_CLASS_BATTERY } from "../../../data/sensor";
import {
  AlarmPanelCardConfig,
  EntitiesCardConfig,
  HumidifierCardConfig,
  LightCardConfig,
  PictureEntityCardConfig,
  ThermostatCardConfig,
} from "../cards/types";
import { LovelaceRowConfig } from "../entity-rows/types";

const HIDE_DOMAIN = new Set([
  "automation",
  "configurator",
  "device_tracker",
  "geo_location",
  "persistent_notification",
  "zone",
]);

const HIDE_PLATFORM = new Set(["mobile_app"]);

interface SplittedByAreas {
  areasWithEntities: Array<[AreaRegistryEntry, HassEntity[]]>;
  otherEntities: HassEntities;
}

const splitByAreas = (
  areaEntries: AreaRegistryEntry[],
  deviceEntries: DeviceRegistryEntry[],
  entityEntries: EntityRegistryEntry[],
  entities: HassEntities
): SplittedByAreas => {
  const allEntities = { ...entities };
  const areasWithEntities: SplittedByAreas["areasWithEntities"] = [];

  for (const area of areaEntries) {
    const areaEntities: HassEntity[] = [];
    const areaDevices = new Set(
      deviceEntries
        .filter((device) => device.area_id === area.area_id)
        .map((device) => device.id)
    );
    for (const entity of entityEntries) {
      if (
        ((areaDevices.has(
          // @ts-ignore
          entity.device_id
        ) &&
          !entity.area_id) ||
          entity.area_id === area.area_id) &&
        entity.entity_id in allEntities
      ) {
        areaEntities.push(allEntities[entity.entity_id]);
        delete allEntities[entity.entity_id];
      }
    }
    if (areaEntities.length > 0) {
      areasWithEntities.push([area, areaEntities]);
    }
  }
  return {
    areasWithEntities,
    otherEntities: allEntities,
  };
};

export const computeCards = (
  states: Array<[string, HassEntity?]>,
  entityCardOptions: Partial<EntitiesCardConfig>,
  single = false
): LovelaceCardConfig[] => {
  const cards: LovelaceCardConfig[] = [];

  // For entity card
  const entities: Array<string | LovelaceRowConfig> = [];

  const titlePrefix = entityCardOptions.title
    ? `${entityCardOptions.title} `
    : undefined;

  for (const [entityId, stateObj] of states) {
    const domain = computeDomain(entityId);

    if (domain === "alarm_control_panel") {
      const cardConfig: AlarmPanelCardConfig = {
        type: "alarm-panel",
        entity: entityId,
      };
      cards.push(cardConfig);
    } else if (domain === "camera") {
      const cardConfig: PictureEntityCardConfig = {
        type: "picture-entity",
        entity: entityId,
      };
      cards.push(cardConfig);
    } else if (domain === "climate") {
      const cardConfig: ThermostatCardConfig = {
        type: "thermostat",
        entity: entityId,
      };
      cards.push(cardConfig);
    } else if (domain === "humidifier") {
      const cardConfig: HumidifierCardConfig = {
        type: "humidifier",
        entity: entityId,
      };
      cards.push(cardConfig);
    } else if (domain === "light" && single) {
      const cardConfig: LightCardConfig = {
        type: "light",
        entity: entityId,
      };
      cards.push(cardConfig);
    } else if (domain === "media_player") {
      const cardConfig = {
        type: "media-control",
        entity: entityId,
      };
      cards.push(cardConfig);
    } else if (domain === "plant") {
      const cardConfig = {
        type: "plant-status",
        entity: entityId,
      };
      cards.push(cardConfig);
    } else if (domain === "weather") {
      const cardConfig = {
        type: "weather-forecast",
        entity: entityId,
        show_forecast: false,
      };
      cards.push(cardConfig);
    } else if (
      domain === "sensor" &&
      stateObj?.attributes.device_class === SENSOR_DEVICE_CLASS_BATTERY
    ) {
      // Do nothing.
    } else {
      let name: string;
      const entityConf =
        titlePrefix &&
        stateObj &&
        // eslint-disable-next-line no-cond-assign
        (name = computeStateName(stateObj)) !== titlePrefix &&
        name.startsWith(titlePrefix)
          ? {
              entity: entityId,
              name: adjustName(name.substr(titlePrefix.length)),
            }
          : entityId;

      entities.push(entityConf);
    }
  }

  if (entities.length > 0) {
    cards.unshift({
      type: "entities",
      entities,
      ...entityCardOptions,
    });
  }

  return cards;
};

const hasUpperCase = (str: string): boolean => str.toLowerCase() !== str;

const adjustName = (name: string): string =>
  // If first word already has an upper case letter (e.g. from brand name)
  // leave as-is, otherwise capitalize the first word.
  hasUpperCase(name.substr(0, name.indexOf(" ")))
    ? name
    : name[0].toUpperCase() + name.slice(1);
const computeDefaultViewStates = (
  entities: HassEntities,
  entityEntries: EntityRegistryEntry[]
): HassEntities => {
  const states = {};
  const hiddenEntities = new Set(
    entityEntries
      .filter((entry) => HIDE_PLATFORM.has(entry.platform))
      .map((entry) => entry.entity_id)
  );

  Object.keys(entities).forEach((entityId) => {
    const stateObj = entities[entityId];
    if (
      !HIDE_DOMAIN.has(computeStateDomain(stateObj)) &&
      !hiddenEntities.has(stateObj.entity_id)
    ) {
      states[entityId] = entities[entityId];
    }
  });
  return states;
};

export const generateViewConfig = (
  localize: LocalizeFunc,
  path: string,
  title: string | undefined,
  icon: string | undefined,
  entities: HassEntities,
  groupOrders: { [entityId: string]: number }
): LovelaceViewConfig => {
  const splitted = splitByGroups(entities);
  splitted.groups.sort(
    (gr1, gr2) => groupOrders[gr1.entity_id] - groupOrders[gr2.entity_id]
  );

  const ungroupedEntitites: { [domain: string]: string[] } = {};

  // Organize ungrouped entities in ungrouped things
  Object.keys(splitted.ungrouped).forEach((entityId) => {
    const state = splitted.ungrouped[entityId];
    const domain = computeStateDomain(state);

    if (!(domain in ungroupedEntitites)) {
      ungroupedEntitites[domain] = [];
    }

    ungroupedEntitites[domain].push(state.entity_id);
  });

  let cards: LovelaceCardConfig[] = [];

  splitted.groups.forEach((groupEntity) => {
    cards = cards.concat(
      computeCards(
        groupEntity.attributes.entity_id.map(
          (entityId): [string, HassEntity] => [entityId, entities[entityId]]
        ),
        {
          title: computeStateName(groupEntity),
          show_header_toggle: groupEntity.attributes.control !== "hidden",
        }
      )
    );
  });

  Object.keys(ungroupedEntitites)
    .sort()
    .forEach((domain) => {
      cards = cards.concat(
        computeCards(
          ungroupedEntitites[domain]
            .sort((a, b) =>
              compare(
                computeStateName(entities[a]),
                computeStateName(entities[b])
              )
            )
            .map((entityId): [string, HassEntity] => [
              entityId,
              entities[entityId],
            ]),
          {
            title: domainToName(localize, domain),
          }
        )
      );
    });

  const view: LovelaceViewConfig = {
    path,
    title,
    cards,
  };

  if (icon) {
    view.icon = icon;
  }

  return view;
};

export const generateDefaultViewConfig = (
  areaEntries: AreaRegistryEntry[],
  deviceEntries: DeviceRegistryEntry[],
  entityEntries: EntityRegistryEntry[],
  entities: HassEntities,
  localize: LocalizeFunc,
  energyPrefs?: EnergyPreferences
): LovelaceViewConfig => {
  const states = computeDefaultViewStates(entities, entityEntries);
  const path = "default_view";
  const title = "Home";
  const icon = undefined;

  // In the case of a default view, we want to use the group order attribute
  const groupOrders = {};
  Object.keys(states).forEach((entityId) => {
    const stateObj = states[entityId];
    if (stateObj.attributes.order) {
      groupOrders[entityId] = stateObj.attributes.order;
    }
  });

  const splittedByAreas = splitByAreas(
    areaEntries,
    deviceEntries,
    entityEntries,
    states
  );

  const config = generateViewConfig(
    localize,
    path,
    title,
    icon,
    splittedByAreas.otherEntities,
    groupOrders
  );

  const areaCards: LovelaceCardConfig[] = [];

  splittedByAreas.areasWithEntities.forEach(([area, areaEntities]) => {
    areaCards.push(
      ...computeCards(
        areaEntities.map((entity) => [entity.entity_id, entity]),
        {
          title: area.name,
        }
      )
    );
  });

  if (energyPrefs) {
    // Distribution card requires the grid to be configured
    const grid = energyPrefs.energy_sources.find(
      (source) => source.type === "grid"
    ) as GridSourceTypeEnergyPreference | undefined;

    if (grid && grid.flow_from.length > 0) {
      areaCards.push({
        title: "Energy distribution today",
        type: "energy-distribution",
        link_dashboard: true,
      });
    }
  }

  config.cards!.unshift(...areaCards);

  return config;
};

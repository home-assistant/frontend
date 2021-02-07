import {
  HassEntities,
  HassEntity,
  STATE_NOT_RUNNING,
} from "home-assistant-js-websocket";
import { computeDomain } from "../../../common/entity/compute_domain";
import { computeObjectId } from "../../../common/entity/compute_object_id";
import { computeStateDomain } from "../../../common/entity/compute_state_domain";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { extractViews } from "../../../common/entity/extract_views";
import { getViewEntities } from "../../../common/entity/get_view_entities";
import { splitByGroups } from "../../../common/entity/split_by_groups";
import { compare } from "../../../common/string/compare";
import { LocalizeFunc } from "../../../common/translations/localize";
import { subscribeOne } from "../../../common/util/subscribe-one";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import {
  AreaRegistryEntry,
  subscribeAreaRegistry,
} from "../../../data/area_registry";
import {
  DeviceRegistryEntry,
  subscribeDeviceRegistry,
} from "../../../data/device_registry";
import {
  EntityRegistryEntry,
  subscribeEntityRegistry,
} from "../../../data/entity_registry";
import { GroupEntity } from "../../../data/group";
import { domainToName } from "../../../data/integration";
import {
  LovelaceCardConfig,
  LovelaceConfig,
  LovelaceViewConfig,
} from "../../../data/lovelace";
import { SENSOR_DEVICE_CLASS_BATTERY } from "../../../data/sensor";
import { HomeAssistant } from "../../../types";
import {
  AlarmPanelCardConfig,
  EntitiesCardConfig,
  HumidifierCardConfig,
  LightCardConfig,
  PictureEntityCardConfig,
  ThermostatCardConfig,
} from "../cards/types";
import { LovelaceRowConfig } from "../entity-rows/types";

const DEFAULT_VIEW_ENTITY_ID = "group.default_view";
const HIDE_DOMAIN = new Set([
  "automation",
  "configurator",
  "device_tracker",
  "geo_location",
  "persistent_notification",
  "zone",
]);

const HIDE_PLATFORM = new Set(["mobile_app"]);

let subscribedRegistries = false;

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
        (name = computeStateName(stateObj)).startsWith(titlePrefix)
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

const hasUpperCase = (str: string): boolean => {
  return str.toLowerCase() !== str;
};

const adjustName = (name: string): string => {
  // If first word already has an upper case letter (e.g. from brand name)
  // leave as-is, otherwise capitalize the first word.
  return hasUpperCase(name.substr(0, name.indexOf(" ")))
    ? name
    : name[0].toUpperCase() + name.slice(1);
};

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

const generateViewConfig = (
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
        groupEntity.attributes.entity_id.map((entityId): [
          string,
          HassEntity
        ] => [entityId, entities[entityId]]),
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
  localize: LocalizeFunc
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

  config.cards!.unshift(...areaCards);

  return config;
};

export const generateLovelaceConfigFromData = async (
  hass: HomeAssistant,
  areaEntries: AreaRegistryEntry[],
  deviceEntries: DeviceRegistryEntry[],
  entityEntries: EntityRegistryEntry[],
  entities: HassEntities,
  localize: LocalizeFunc
): Promise<LovelaceConfig> => {
  if (hass.config.safe_mode) {
    return {
      title: hass.config.location_name,
      views: [
        {
          cards: [{ type: "safe-mode" }],
        },
      ],
    };
  }

  const viewEntities = extractViews(entities);

  const views = viewEntities.map((viewEntity: GroupEntity) => {
    const states = getViewEntities(entities, viewEntity);

    // In the case of a normal view, we use group order as specified in view
    const groupOrders = {};
    Object.keys(states).forEach((entityId, idx) => {
      groupOrders[entityId] = idx;
    });

    return generateViewConfig(
      localize,
      computeObjectId(viewEntity.entity_id),
      computeStateName(viewEntity),
      viewEntity.attributes.icon,
      states,
      groupOrders
    );
  });

  let title = hass.config.location_name;

  // User can override default view. If they didn't, we will add one
  // that contains all entities.
  if (
    viewEntities.length === 0 ||
    viewEntities[0].entity_id !== DEFAULT_VIEW_ENTITY_ID
  ) {
    views.unshift(
      generateDefaultViewConfig(
        areaEntries,
        deviceEntries,
        entityEntries,
        entities,
        localize
      )
    );

    // Add map of geo locations to default view if loaded
    if (isComponentLoaded(hass, "geo_location")) {
      if (views[0] && views[0].cards) {
        views[0].cards.push({
          type: "map",
          geo_location_sources: ["all"],
        });
      }
    }

    // Make sure we don't have Home as title and first tab.
    if (views.length > 1 && title === "Home") {
      title = "Home Assistant";
    }
  }

  // User has no entities
  if (views.length === 1 && views[0].cards!.length === 0) {
    views[0].cards!.push({
      type: "empty-state",
    });
  }

  return {
    title,
    views,
  };
};

export const generateLovelaceConfigFromHass = async (
  hass: HomeAssistant,
  localize?: LocalizeFunc
): Promise<LovelaceConfig> => {
  if (hass.config.state === STATE_NOT_RUNNING) {
    return {
      title: hass.config.location_name,
      views: [
        {
          cards: [{ type: "starting" }],
        },
      ],
    };
  }

  if (hass.config.safe_mode) {
    return {
      title: hass.config.location_name,
      views: [
        {
          cards: [{ type: "safe-mode" }],
        },
      ],
    };
  }

  // We want to keep the registry subscriptions alive after generating the UI
  // so that we don't serve up stale data after changing areas.
  if (!subscribedRegistries) {
    subscribedRegistries = true;
    subscribeAreaRegistry(hass.connection, () => undefined);
    subscribeDeviceRegistry(hass.connection, () => undefined);
    subscribeEntityRegistry(hass.connection, () => undefined);
  }

  const [areaEntries, deviceEntries, entityEntries] = await Promise.all([
    subscribeOne(hass.connection, subscribeAreaRegistry),
    subscribeOne(hass.connection, subscribeDeviceRegistry),
    subscribeOne(hass.connection, subscribeEntityRegistry),
  ]);

  return generateLovelaceConfigFromData(
    hass,
    areaEntries,
    deviceEntries,
    entityEntries,
    hass.states,
    localize || hass.localize
  );
};

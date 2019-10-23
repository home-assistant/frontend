import { HomeAssistant, GroupEntity } from "../../../types";
import {
  LovelaceConfig,
  LovelaceCardConfig,
  LovelaceViewConfig,
} from "../../../data/lovelace";
import {
  HassEntity,
  HassEntities,
  HassConfig,
} from "home-assistant-js-websocket";

import { extractViews } from "../../../common/entity/extract_views";
import { getViewEntities } from "../../../common/entity/get_view_entities";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { splitByGroups } from "../../../common/entity/split_by_groups";
import { computeObjectId } from "../../../common/entity/compute_object_id";
import { computeStateDomain } from "../../../common/entity/compute_state_domain";
import { computeDomain } from "../../../common/entity/compute_domain";

import { EntityRowConfig, WeblinkConfig } from "../entity-rows/types";
import { LocalizeFunc } from "../../../common/translations/localize";
import { EntitiesCardConfig } from "../cards/types";
import {
  subscribeAreaRegistry,
  AreaRegistryEntry,
} from "../../../data/area_registry";
import { subscribeOne } from "../../../common/util/subscribe-one";
import {
  subscribeDeviceRegistry,
  DeviceRegistryEntry,
} from "../../../data/device_registry";
import {
  subscribeEntityRegistry,
  EntityRegistryEntry,
} from "../../../data/entity_registry";
import { processEditorEntities } from "../editor/process-editor-entities";

const DEFAULT_VIEW_ENTITY_ID = "group.default_view";
const DOMAINS_BADGES = [
  "binary_sensor",
  "person",
  "device_tracker",
  "mailbox",
  "sensor",
  "sun",
  "timer",
];
const HIDE_DOMAIN = new Set([
  "persistent_notification",
  "configurator",
  "geo_location",
]);

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
        areaDevices.has(
          // @ts-ignore
          entity.device_id
        ) &&
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

const computeCards = (
  states: Array<[string, HassEntity]>,
  entityCardOptions: Partial<EntitiesCardConfig>
): LovelaceCardConfig[] => {
  const cards: LovelaceCardConfig[] = [];

  // For entity card
  const entities: Array<string | EntityRowConfig> = [];

  for (const [entityId, stateObj] of states) {
    const domain = computeDomain(entityId);

    if (domain === "alarm_control_panel") {
      cards.push({
        type: "alarm-panel",
        entity: entityId,
      });
    } else if (domain === "camera") {
      cards.push({
        type: "picture-entity",
        entity: entityId,
      });
    } else if (domain === "climate") {
      cards.push({
        type: "thermostat",
        entity: entityId,
      });
    } else if (domain === "history_graph" && stateObj) {
      cards.push({
        type: "history-graph",
        entities: stateObj.attributes.entity_id,
        hours_to_show: stateObj.attributes.hours_to_show,
        title: stateObj.attributes.friendly_name,
        refresh_interval: stateObj.attributes.refresh,
      });
    } else if (domain === "media_player") {
      cards.push({
        type: "media-control",
        entity: entityId,
      });
    } else if (domain === "plant") {
      cards.push({
        type: "plant-status",
        entity: entityId,
      });
    } else if (domain === "weather") {
      cards.push({
        type: "weather-forecast",
        entity: entityId,
      });
    } else if (domain === "weblink" && stateObj) {
      const conf: WeblinkConfig = {
        type: "weblink",
        url: stateObj.state,
        name: computeStateName(stateObj),
      };
      if ("icon" in stateObj.attributes) {
        conf.icon = stateObj.attributes.icon;
      }
      entities.push(conf);
    } else {
      entities.push(entityId);
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

const computeDefaultViewStates = (entities: HassEntities): HassEntities => {
  const states = {};
  Object.keys(entities).forEach((entityId) => {
    const stateObj = entities[entityId];
    if (
      !stateObj.attributes.hidden &&
      !HIDE_DOMAIN.has(computeStateDomain(stateObj))
    ) {
      states[entityId] = entities[entityId];
    }
  });
  return states;
};

export const generateDefaultViewConfig = (
  areaEntries: AreaRegistryEntry[],
  deviceEntries: DeviceRegistryEntry[],
  entityEntries: EntityRegistryEntry[],
  entities: HassEntities,
  localize: LocalizeFunc
): LovelaceViewConfig => {
  const states = computeDefaultViewStates(entities);
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
          show_header_toggle: true,
        }
      )
    );
  });

  config.cards!.unshift(...areaCards);

  return config;
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

  const badgeEntities: { [domain: string]: string[] } = {};
  const ungroupedEntitites: { [domain: string]: string[] } = {};

  // Organize ungrouped entities in badges/ungrouped things
  Object.keys(splitted.ungrouped).forEach((entityId) => {
    const state = splitted.ungrouped[entityId];
    const domain = computeStateDomain(state);

    const coll = DOMAINS_BADGES.includes(domain)
      ? badgeEntities
      : ungroupedEntitites;

    if (!(domain in coll)) {
      coll[domain] = [];
    }

    coll[domain].push(state.entity_id);
  });

  let badges: string[] = [];
  DOMAINS_BADGES.forEach((domain) => {
    if (domain in badgeEntities) {
      badges = badges.concat(badgeEntities[domain]);
    }
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
          ungroupedEntitites[domain].map(
            (entityId): [string, HassEntity] => [entityId, entities[entityId]]
          ),
          {
            title: localize(`domain.${domain}`),
          }
        )
      );
    });

  const view: LovelaceViewConfig = {
    path,
    title,
    badges: processEditorEntities(badges),
    cards,
  };

  if (icon) {
    view.icon = icon;
  }

  return view;
};

export const generateLovelaceConfigFromHass = async (hass: HomeAssistant) => {
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
    hass.config,
    areaEntries,
    deviceEntries,
    entityEntries,
    hass.states,
    hass.localize
  );
};

export const generateLovelaceConfigFromData = async (
  config: HassConfig,
  areaEntries: AreaRegistryEntry[],
  deviceEntries: DeviceRegistryEntry[],
  entityEntries: EntityRegistryEntry[],
  entities: HassEntities,
  localize: LocalizeFunc
): Promise<LovelaceConfig> => {
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

  let title = config.location_name;

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
    if (config.components.includes("geo_location")) {
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
    import(/* webpackChunkName: "hui-empty-state-card" */ "../cards/hui-empty-state-card");
    views[0].cards!.push({
      type: "custom:hui-empty-state-card",
    });
  }

  return {
    title,
    views,
  };
};

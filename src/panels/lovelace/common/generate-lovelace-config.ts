import type { HassEntities, HassEntity } from "home-assistant-js-websocket";
import { SENSOR_ENTITIES, ASSIST_ENTITIES } from "../../../common/const";
import { computeDomain } from "../../../common/entity/compute_domain";
import { computeStateDomain } from "../../../common/entity/compute_state_domain";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { splitByGroups } from "../../../common/entity/split_by_groups";
import { stripPrefixFromEntityName } from "../../../common/entity/strip_prefix_from_entity_name";
import { stringCompare } from "../../../common/string/compare";
import type { LocalizeFunc } from "../../../common/translations/localize";
import type { AreasDisplayValue } from "../../../components/ha-areas-display-editor";
import { areaCompare } from "../../../data/area_registry";
import type {
  EnergyPreferences,
  GridSourceTypeEnergyPreference,
} from "../../../data/energy";
import { domainToName } from "../../../data/integration";
import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import type { LovelaceSectionConfig } from "../../../data/lovelace/config/section";
import type { LovelaceViewConfig } from "../../../data/lovelace/config/view";
import { computeUserInitials } from "../../../data/user";
import type { HomeAssistant } from "../../../types";
import { HELPER_DOMAINS } from "../../config/helpers/const";
import type {
  AlarmPanelCardConfig,
  EntitiesCardConfig,
  HumidifierCardConfig,
  PictureCardConfig,
  PictureEntityCardConfig,
  ThermostatCardConfig,
  TileCardConfig,
} from "../cards/types";
import type { EntityConfig } from "../entity-rows/types";
import type { ButtonsHeaderFooterConfig } from "../header-footer/types";
import type { LovelaceBadgeConfig } from "../../../data/lovelace/config/badge";
import type { EntityBadgeConfig } from "../badges/types";

const HIDE_DOMAIN = new Set([
  "ai_task",
  "automation",
  "configurator",
  "device_tracker",
  "event",
  "geo_location",
  "notify",
  "persistent_notification",
  "script",
  "sun",
  "tag",
  "todo",
  "zone",
  ...ASSIST_ENTITIES,
]);

const HIDE_PLATFORM = new Set(["backup", "mobile_app"]);

interface SplittedByAreaDevice {
  areasWithEntities: Record<string, HassEntity[]>;
  devicesWithEntities: Record<string, HassEntity[]>;
  otherEntities: HassEntities;
}

const splitByAreaDevice = (
  areaEntries: HomeAssistant["areas"],
  deviceEntries: HomeAssistant["devices"],
  entityEntries: HomeAssistant["entities"],
  entities: HassEntities
): SplittedByAreaDevice => {
  const allEntities = { ...entities };
  const areasWithEntities: SplittedByAreaDevice["areasWithEntities"] = {};
  const devicesWithEntities: SplittedByAreaDevice["devicesWithEntities"] = {};

  for (const entity of Object.values(entityEntries)) {
    const areaId =
      entity.area_id ||
      (entity.device_id && deviceEntries[entity.device_id]?.area_id);
    if (areaId && areaId in areaEntries && entity.entity_id in allEntities) {
      if (!(areaId in areasWithEntities)) {
        areasWithEntities[areaId] = [];
      }
      areasWithEntities[areaId].push(allEntities[entity.entity_id]);
      delete allEntities[entity.entity_id];
    } else if (
      entity.device_id &&
      entity.device_id in deviceEntries &&
      entity.entity_id in allEntities
    ) {
      if (!(entity.device_id in devicesWithEntities)) {
        devicesWithEntities[entity.device_id] = [];
      }
      devicesWithEntities[entity.device_id].push(allEntities[entity.entity_id]);
      delete allEntities[entity.entity_id];
    }
  }
  for (const [deviceId, deviceEntities] of Object.entries(
    devicesWithEntities
  )) {
    if (deviceEntities.length === 1) {
      allEntities[deviceEntities[0].entity_id] = deviceEntities[0];
      delete devicesWithEntities[deviceId];
    }
  }
  return {
    areasWithEntities,
    devicesWithEntities,
    otherEntities: allEntities,
  };
};

export const computeSection = (
  entityIds: string[],
  sectionOptions?: Partial<LovelaceSectionConfig>
): LovelaceSectionConfig => ({
  type: "grid",
  cards: entityIds.map(
    (entity) =>
      ({
        type: "tile",
        entity,
        show_entity_picture:
          ["camera", "image", "person"].includes(computeDomain(entity)) ||
          undefined,
      }) as TileCardConfig
  ),
  ...sectionOptions,
});

export const computeCards = (
  states: HassEntities,
  entityIds: string[],
  entityCardOptions: Partial<EntitiesCardConfig>,
  renderFooterEntities = true
): LovelaceCardConfig[] => {
  const cards: LovelaceCardConfig[] = [];

  // For entity card
  const entitiesConf: (string | EntityConfig)[] = [];

  const titlePrefix = entityCardOptions.title
    ? entityCardOptions.title.toLowerCase()
    : undefined;

  const footerEntities: ButtonsHeaderFooterConfig["entities"] = [];

  for (const entityId of entityIds) {
    const stateObj = states[entityId];
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
    } else if (domain === "image") {
      const cardConfig: PictureCardConfig = {
        type: "picture",
        image_entity: entityId,
      };
      cards.push(cardConfig);
    } else if (domain === "climate") {
      const cardConfig: ThermostatCardConfig = {
        type: "thermostat",
        entity: entityId,
        features:
          (states[entityId]?.attributes?.hvac_modes?.length ?? 0) > 1
            ? [
                {
                  type: "climate-hvac-modes",
                  hvac_modes: states[entityId]?.attributes?.hvac_modes,
                },
              ]
            : undefined,
      };
      cards.push(cardConfig);
    } else if (domain === "humidifier") {
      const cardConfig: HumidifierCardConfig = {
        type: "humidifier",
        entity: entityId,
        features: [
          {
            type: "humidifier-toggle",
          },
        ],
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
      renderFooterEntities &&
      (domain === "scene" || domain === "script")
    ) {
      const conf: (typeof footerEntities)[0] = {
        entity: entityId,
        show_icon: true,
        show_name: true,
      };
      let name: string | undefined;
      if (
        titlePrefix &&
        stateObj &&
        // eslint-disable-next-line no-cond-assign
        (name = stripPrefixFromEntityName(
          computeStateName(stateObj),
          titlePrefix
        ))
      ) {
        conf.name = name;
      }
      footerEntities.push(conf);
    } else {
      let name: string | undefined;
      const entityConf =
        titlePrefix &&
        stateObj &&
        // eslint-disable-next-line no-cond-assign
        (name = stripPrefixFromEntityName(
          computeStateName(stateObj),
          titlePrefix
        ))
          ? {
              entity: entityId,
              name,
            }
          : entityId;

      entitiesConf.push(entityConf);
    }
  }

  entitiesConf.sort((a, b) => {
    const entityIdA = typeof a === "string" ? a : a.entity;
    const entityIdB = typeof b === "string" ? b : b.entity;

    const categoryA = SENSOR_ENTITIES.includes(computeDomain(entityIdA))
      ? "sensor"
      : "control";
    const categoryB = SENSOR_ENTITIES.includes(computeDomain(entityIdB))
      ? "sensor"
      : "control";

    if (categoryA !== categoryB) {
      return categoryA === "sensor" ? 1 : -1;
    }

    return stringCompare(
      typeof a === "string"
        ? states[a]
          ? computeStateName(states[a])
          : ""
        : a.name || "",
      typeof b === "string"
        ? states[b]
          ? computeStateName(states[b])
          : ""
        : b.name || ""
    );
  });

  // If we ended up with footer entities but no normal entities,
  // render the footer entities as normal entities.
  if (entitiesConf.length === 0 && footerEntities.length > 0) {
    return computeCards(states, entityIds, entityCardOptions, false);
  }

  if (entitiesConf.length > 0 || footerEntities.length > 0) {
    const card: EntitiesCardConfig = {
      type: "entities",
      entities: entitiesConf,
      ...entityCardOptions,
    };
    if (footerEntities.length > 0) {
      card.footer = {
        type: "buttons",
        entities: footerEntities,
      } as ButtonsHeaderFooterConfig;
    }
    cards.unshift(card);
  }

  if (cards.length < 2) {
    return cards;
  }

  return [
    {
      type: "grid",
      square: false,
      columns: 1,
      cards,
    },
  ];
};

export const computeBadges = (
  _states: HassEntities,
  entityIds: string[]
): LovelaceBadgeConfig[] => {
  const badges: LovelaceBadgeConfig[] = [];

  for (const entityId of entityIds) {
    const config: EntityBadgeConfig = {
      type: "entity",
      entity: entityId,
    };

    badges.push(config);
  }
  return badges;
};

const computeDefaultViewStates = (
  entities: HassEntities,
  entityEntries: HomeAssistant["entities"]
): HassEntities => {
  const states = {};
  const hiddenEntities = new Set(
    Object.values(entityEntries)
      .filter(
        (entry) =>
          entry.entity_category ||
          (entry.platform && HIDE_PLATFORM.has(entry.platform)) ||
          entry.hidden
      )
      .map((entry) => entry.entity_id)
  );

  for (const entityId of Object.keys(entities)) {
    const stateObj = entities[entityId];
    if (
      !HIDE_DOMAIN.has(computeStateDomain(stateObj)) &&
      !hiddenEntities.has(stateObj.entity_id)
    ) {
      states[entityId] = entities[entityId];
    }
  }
  return states;
};

export const generateViewConfig = (
  localize: LocalizeFunc,
  path: string,
  title: string | undefined,
  icon: string | undefined,
  entities: HassEntities
): LovelaceViewConfig => {
  const ungroupedEntitites: Record<string, string[]> = {};

  // Organize ungrouped entities in ungrouped things
  for (const entityId of Object.keys(entities)) {
    const state = entities[entityId];
    const domain = computeStateDomain(state);

    if (!(domain in ungroupedEntitites)) {
      ungroupedEntitites[domain] = [];
    }

    ungroupedEntitites[domain].push(state.entity_id);
  }

  const cards: LovelaceCardConfig[] = [];

  if ("person" in ungroupedEntitites) {
    const personCards: LovelaceCardConfig[] = [];

    if (ungroupedEntitites.person.length === 1) {
      cards.push({
        type: "entities",
        entities: ungroupedEntitites.person,
      });
    } else {
      let backgroundColor: string | undefined;
      let foregroundColor = "";

      for (const personEntityId of ungroupedEntitites.person) {
        const stateObj = entities[personEntityId];

        let image = stateObj.attributes.entity_picture;

        if (!image) {
          if (backgroundColor === undefined) {
            const computedStyle = getComputedStyle(document.body);
            backgroundColor = encodeURIComponent(
              computedStyle.getPropertyValue("--light-primary-color").trim()
            );
            foregroundColor = encodeURIComponent(
              (
                computedStyle.getPropertyValue("--text-light-primary-color") ||
                computedStyle.getPropertyValue("--primary-text-color")
              ).trim()
            );
          }
          const initials = computeUserInitials(
            stateObj.attributes.friendly_name || ""
          );
          image = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 50 50' width='50' height='50' style='background-color:${backgroundColor}'%3E%3Cg%3E%3Ctext font-family='roboto' x='50%25' y='50%25' text-anchor='middle' stroke='${foregroundColor}' font-size='1.3em' dy='.3em'%3E${initials}%3C/text%3E%3C/g%3E%3C/svg%3E`;
        }

        personCards.push({
          type: "picture-entity",
          entity: personEntityId,
          aspect_ratio: "1",
          show_name: false,
          image,
        });
      }

      cards.push({
        type: "grid",
        square: true,
        columns: 3,
        cards: personCards,
      });
    }

    delete ungroupedEntitites.person;
  }

  // Group helper entities in a single card
  const helperEntities: string[] = [];

  for (const domain of HELPER_DOMAINS) {
    if (!(domain in ungroupedEntitites)) {
      continue;
    }
    helperEntities.push(...ungroupedEntitites[domain]);
    delete ungroupedEntitites[domain];
  }

  // Prepare translations for cards
  const domainTranslations: Record<string, string> = {};

  for (const domain of Object.keys(ungroupedEntitites)) {
    domainTranslations[domain] = domainToName(localize, domain);
  }

  if (helperEntities.length) {
    ungroupedEntitites._helpers = helperEntities;
    domainTranslations._helpers = localize(
      "ui.panel.lovelace.strategy.original-states.helpers"
    );
  }

  Object.keys(ungroupedEntitites)
    .sort((domain1, domain2) =>
      stringCompare(domainTranslations[domain1], domainTranslations[domain2])
    )
    .forEach((domain) => {
      cards.push(
        ...computeCards(
          entities,
          ungroupedEntitites[domain].sort((a, b) =>
            stringCompare(
              computeStateName(entities[a]),
              computeStateName(entities[b])
            )
          ),
          {
            title: domainTranslations[domain],
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
  areaEntries: HomeAssistant["areas"],
  deviceEntries: HomeAssistant["devices"],
  entityEntries: HomeAssistant["entities"],
  entities: HassEntities,
  localize: LocalizeFunc,
  energyPrefs?: EnergyPreferences,
  areasPrefs?: AreasDisplayValue,
  hideEntitiesWithoutAreas?: boolean,
  hideEnergy?: boolean
): LovelaceViewConfig => {
  const states = computeDefaultViewStates(entities, entityEntries);
  const path = "default_view";
  const title = "Home";
  const icon = undefined;

  // In the case of a default view, we want to use the group order attribute
  const groupOrders = {};
  for (const entityId of Object.keys(states)) {
    const stateObj = states[entityId];
    if (stateObj.attributes.order) {
      groupOrders[entityId] = stateObj.attributes.order;
    }
  }

  const splittedByAreaDevice = splitByAreaDevice(
    areaEntries,
    deviceEntries,
    entityEntries,
    states
  );

  if (areasPrefs?.hidden) {
    for (const area of areasPrefs.hidden) {
      delete splittedByAreaDevice.areasWithEntities[area];
    }
  }

  if (hideEntitiesWithoutAreas) {
    splittedByAreaDevice.devicesWithEntities = {};
    splittedByAreaDevice.otherEntities = {};
  }

  const splittedByGroups = splitByGroups(splittedByAreaDevice.otherEntities);
  splittedByGroups.groups.sort(
    (gr1, gr2) => groupOrders[gr1.entity_id] - groupOrders[gr2.entity_id]
  );

  const groupCards: LovelaceCardConfig[] = [];

  for (const groupEntity of splittedByGroups.groups) {
    groupCards.push(
      ...computeCards(entities, groupEntity.attributes.entity_id, {
        title: computeStateName(groupEntity),
        show_header_toggle: groupEntity.attributes.control !== "hidden",
      })
    );
  }

  const config = generateViewConfig(
    localize,
    path,
    title,
    icon,
    splittedByGroups.ungrouped
  );

  const areaCards: LovelaceCardConfig[] = [];

  const sortedAreas = Object.keys(splittedByAreaDevice.areasWithEntities).sort(
    areaCompare(areaEntries, areasPrefs?.order)
  );

  for (const areaId of sortedAreas) {
    const areaEntities = splittedByAreaDevice.areasWithEntities[areaId];
    const area = areaEntries[areaId];
    areaCards.push(
      ...computeCards(
        entities,
        areaEntities.map((entity) => entity.entity_id),
        {
          title: area.name,
        }
      )
    );
  }

  const deviceCards: LovelaceCardConfig[] = [];

  const sortedDevices = Object.entries(
    splittedByAreaDevice.devicesWithEntities
  ).sort((a, b) => {
    const deviceA = deviceEntries[a[0]];
    const deviceB = deviceEntries[b[0]];
    return stringCompare(
      deviceA.name_by_user || deviceA.name || "",
      deviceB.name_by_user || deviceB.name || ""
    );
  });

  for (const [deviceId, deviceEntities] of sortedDevices) {
    const device = deviceEntries[deviceId];
    deviceCards.push(
      ...computeCards(
        entities,
        deviceEntities.map((entity) => entity.entity_id),
        {
          title:
            device.name_by_user ||
            device.name ||
            localize("ui.panel.config.devices.unnamed_device", {
              type: localize(
                `ui.panel.config.devices.type.${device.entry_type || "device"}`
              ),
            }),
        }
      )
    );
  }

  let energyCard: LovelaceCardConfig | undefined;

  if (energyPrefs && !hideEnergy) {
    // Distribution card requires the grid to be configured
    const grid = energyPrefs.energy_sources.find(
      (source) => source.type === "grid"
    ) as GridSourceTypeEnergyPreference | undefined;

    if (grid && grid.flow_from.length > 0) {
      energyCard = {
        title: localize(
          "ui.panel.lovelace.cards.energy.energy_distribution.title_today"
        ),
        type: "energy-distribution",
        link_dashboard: true,
      };
    }
  }

  config.cards!.unshift(
    ...areaCards,
    ...groupCards,
    ...(energyCard ? [energyCard] : [])
  );

  config.cards!.push(...deviceCards);

  return config;
};

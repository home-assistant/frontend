import { HassEntities, HassEntity } from "home-assistant-js-websocket";
import { computeDomain } from "../../../common/entity/compute_domain";
import { computeStateDomain } from "../../../common/entity/compute_state_domain";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { splitByGroups } from "../../../common/entity/split_by_groups";
import { stripPrefixFromEntityName } from "../../../common/entity/strip_prefix_from_entity_name";
import { stringCompare } from "../../../common/string/compare";
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
import { computeUserInitials } from "../../../data/user";
import {
  AlarmPanelCardConfig,
  EntitiesCardConfig,
  HumidifierCardConfig,
  PictureEntityCardConfig,
  ThermostatCardConfig,
} from "../cards/types";
import { LovelaceRowConfig } from "../entity-rows/types";
import { ButtonsHeaderFooterConfig } from "../header-footer/types";
import { HELPER_DOMAINS } from "../../config/helpers/const";

const HIDE_DOMAIN = new Set([
  "automation",
  "configurator",
  "device_tracker",
  "geo_location",
  "persistent_notification",
  "script",
  "sun",
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
  renderFooterEntities = true
): LovelaceCardConfig[] => {
  const cards: LovelaceCardConfig[] = [];

  // For entity card
  const entities: Array<string | LovelaceRowConfig> = [];

  const titlePrefix = entityCardOptions.title
    ? entityCardOptions.title.toLowerCase()
    : undefined;

  const footerEntities: ButtonsHeaderFooterConfig["entities"] = [];

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
      const conf: typeof footerEntities[0] = {
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
    } else if (
      domain === "sensor" &&
      stateObj?.attributes.device_class === SENSOR_DEVICE_CLASS_BATTERY
    ) {
      // Do nothing.
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

      entities.push(entityConf);
    }
  }

  // If we ended up with footer entities but no normal entities,
  // render the footer entities as normal entities.
  if (entities.length === 0 && footerEntities.length > 0) {
    return computeCards(states, entityCardOptions, false);
  }

  if (entities.length > 0 || footerEntities.length > 0) {
    const card: EntitiesCardConfig = {
      type: "entities",
      entities,
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

const computeDefaultViewStates = (
  entities: HassEntities,
  entityEntries: EntityRegistryEntry[]
): HassEntities => {
  const states = {};
  const hiddenEntities = new Set(
    entityEntries
      .filter(
        (entry) =>
          entry.entity_category ||
          HIDE_PLATFORM.has(entry.platform) ||
          entry.hidden_by
      )
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

  splitted.groups.forEach((groupEntity) => {
    cards.push(
      ...computeCards(
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
          ungroupedEntitites[domain]
            .sort((a, b) =>
              stringCompare(
                computeStateName(entities[a]),
                computeStateName(entities[b])
              )
            )
            .map((entityId): [string, HassEntity] => [
              entityId,
              entities[entityId],
            ]),
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
        title: localize(
          "ui.panel.lovelace.cards.energy.energy_distribution.title_today"
        ),
        type: "energy-distribution",
        link_dashboard: true,
      });
    }
  }

  config.cards!.unshift(...areaCards);

  return config;
};

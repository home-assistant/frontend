import type { HassEntity } from "home-assistant-js-websocket";
import { computeDomain } from "../../common/entity/compute_domain";
import { computeEntityNameList } from "../../common/entity/compute_entity_name_display";
import { computeStateName } from "../../common/entity/compute_state_name";
import { computeRTL } from "../../common/util/compute_rtl";
import type { PickerComboBoxItem } from "../../components/ha-picker-combo-box";
import type { FuseWeightedKey } from "../../resources/fuseMultiTerm";
import type { HomeAssistant } from "../../types";
import { domainToName } from "../integration";
import type { HaEntityPickerEntityFilterFunc } from "./entity";

export interface EntityComboBoxItem extends PickerComboBoxItem {
  domain_name?: string;
  stateObj?: HassEntity;
}

export const entityComboBoxKeys: FuseWeightedKey[] = [
  {
    name: "search_labels.entityName",
    weight: 10,
  },
  {
    name: "search_labels.friendlyName",
    weight: 8,
  },
  {
    name: "search_labels.deviceName",
    weight: 7,
  },
  {
    name: "search_labels.areaName",
    weight: 6,
  },
  {
    name: "search_labels.domainName",
    weight: 6,
  },
  {
    name: "search_labels.entityId",
    weight: 3,
  },
];

export const getEntities = (
  hass: HomeAssistant,
  includeDomains?: string[],
  excludeDomains?: string[],
  entityFilter?: HaEntityPickerEntityFilterFunc,
  includeDeviceClasses?: string[],
  includeUnitOfMeasurement?: string[],
  includeEntities?: string[],
  excludeEntities?: string[],
  value?: string,
  idPrefix = ""
): EntityComboBoxItem[] => {
  let items: EntityComboBoxItem[] = [];

  let entityIds = Object.keys(hass.states);

  if (includeEntities) {
    entityIds = entityIds.filter((entityId) =>
      includeEntities.includes(entityId)
    );
  }

  if (excludeEntities) {
    entityIds = entityIds.filter(
      (entityId) => !excludeEntities.includes(entityId)
    );
  }

  if (includeDomains) {
    entityIds = entityIds.filter((eid) =>
      includeDomains.includes(computeDomain(eid))
    );
  }

  if (excludeDomains) {
    entityIds = entityIds.filter(
      (eid) => !excludeDomains.includes(computeDomain(eid))
    );
  }

  items = entityIds.map<EntityComboBoxItem>((entityId) => {
    const stateObj = hass.states[entityId];

    const friendlyName = computeStateName(stateObj); // Keep this for search
    const [entityName, deviceName, areaName] = computeEntityNameList(
      stateObj,
      [{ type: "entity" }, { type: "device" }, { type: "area" }],
      hass.entities,
      hass.devices,
      hass.areas,
      hass.floors
    );

    const domainName = domainToName(hass.localize, computeDomain(entityId));

    const isRTL = computeRTL(hass);

    const primary = entityName || deviceName || entityId;
    const secondary = [areaName, entityName ? deviceName : undefined]
      .filter(Boolean)
      .join(isRTL ? " ◂ " : " ▸ ");

    return {
      id: `${idPrefix}${entityId}`,
      primary: primary,
      secondary: secondary,
      domain_name: domainName,
      sorting_label: [primary, secondary].filter(Boolean).join("_"),
      search_labels: {
        entityName: entityName || null,
        deviceName: deviceName || null,
        areaName: areaName || null,
        domainName: domainName || null,
        friendlyName: friendlyName || null,
        entityId: entityId,
      },
      stateObj: stateObj,
    };
  });

  if (includeDeviceClasses) {
    items = items.filter(
      (item) =>
        // We always want to include the entity of the current value
        item.id === value ||
        (item.stateObj?.attributes.device_class &&
          includeDeviceClasses.includes(item.stateObj.attributes.device_class))
    );
  }

  if (includeUnitOfMeasurement) {
    items = items.filter(
      (item) =>
        // We always want to include the entity of the current value
        item.id === value ||
        (item.stateObj?.attributes.unit_of_measurement &&
          includeUnitOfMeasurement.includes(
            item.stateObj.attributes.unit_of_measurement
          ))
    );
  }

  if (entityFilter) {
    items = items.filter(
      (item) =>
        // We always want to include the entity of the current value
        item.id === value || (item.stateObj && entityFilter!(item.stateObj))
    );
  }

  return items;
};

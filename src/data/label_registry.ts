import { mdiLabel } from "@mdi/js";
import type { Connection } from "home-assistant-js-websocket";
import { createCollection } from "home-assistant-js-websocket";
import type { Store } from "home-assistant-js-websocket/dist/store";
import memoizeOne from "memoize-one";
import { computeDomain } from "../common/entity/compute_domain";
import { stringCompare } from "../common/string/compare";
import { debounce } from "../common/util/debounce";
import type { HaDevicePickerDeviceFilterFunc } from "../components/device/ha-device-picker";
import type { PickerComboBoxItem } from "../components/ha-picker-combo-box";
import type { HomeAssistant } from "../types";
import {
  getDeviceEntityDisplayLookup,
  type DeviceEntityDisplayLookup,
  type DeviceRegistryEntry,
} from "./device_registry";
import type { HaEntityPickerEntityFilterFunc } from "./entity";
import type { EntityRegistryDisplayEntry } from "./entity_registry";
import type { RegistryEntry } from "./registry";

export interface LabelRegistryEntry extends RegistryEntry {
  label_id: string;
  name: string;
  icon: string | null;
  color: string | null;
  description: string | null;
}

export interface LabelRegistryEntryMutableParams {
  name: string;
  icon?: string | null;
  color?: string | null;
  description?: string | null;
}

export const fetchLabelRegistry = (conn: Connection) =>
  conn
    .sendMessagePromise({
      type: "config/label_registry/list",
    })
    .then((labels) =>
      (labels as LabelRegistryEntry[]).sort((ent1, ent2) =>
        stringCompare(ent1.name, ent2.name)
      )
    );

export const subscribeLabelRegistryUpdates = (
  conn: Connection,
  store: Store<LabelRegistryEntry[]>
) =>
  conn.subscribeEvents(
    debounce(
      () =>
        fetchLabelRegistry(conn).then((labels: LabelRegistryEntry[]) =>
          store.setState(labels, true)
        ),
      500,
      true
    ),
    "label_registry_updated"
  );

export const subscribeLabelRegistry = (
  conn: Connection,
  onChange: (labels: LabelRegistryEntry[]) => void
) =>
  createCollection<LabelRegistryEntry[]>(
    "_labelRegistry",
    fetchLabelRegistry,
    subscribeLabelRegistryUpdates,
    conn,
    onChange
  );

export const createLabelRegistryEntry = (
  hass: HomeAssistant,
  values: LabelRegistryEntryMutableParams
) =>
  hass.callWS<LabelRegistryEntry>({
    type: "config/label_registry/create",
    ...values,
  });

export const updateLabelRegistryEntry = (
  hass: HomeAssistant,
  labelId: string,
  updates: Partial<LabelRegistryEntryMutableParams>
) =>
  hass.callWS<LabelRegistryEntry>({
    type: "config/label_registry/update",
    label_id: labelId,
    ...updates,
  });

export const deleteLabelRegistryEntry = (
  hass: HomeAssistant,
  labelId: string
) =>
  hass.callWS({
    type: "config/label_registry/delete",
    label_id: labelId,
  });

export const getLabels = (
  hass: HomeAssistant,
  labels?: LabelRegistryEntry[],
  includeDomains?: string[],
  excludeDomains?: string[],
  includeDeviceClasses?: string[],
  deviceFilter?: HaDevicePickerDeviceFilterFunc,
  entityFilter?: HaEntityPickerEntityFilterFunc,
  excludeLabels?: string[]
): PickerComboBoxItem[] =>
  memoizeOne(
    (
      haAreasMemo: HomeAssistant["areas"],
      haDevicesMemo: HomeAssistant["devices"],
      haEntitiesMemo: HomeAssistant["entities"],
      labelsMemo?: LabelRegistryEntry[],
      includeDomainsMemo?: string[],
      excludeDomainsMemo?: string[],
      includeDeviceClassesMemo?: string[],
      deviceFilterMemo?: HaDevicePickerDeviceFilterFunc,
      entityFilterMemo?: HaEntityPickerEntityFilterFunc,
      excludeLabelsMemo?: string[]
    ): PickerComboBoxItem[] => {
      if (!labelsMemo || labelsMemo.length === 0) {
        return [];
      }

      const devices = Object.values(haDevicesMemo);
      const entities = Object.values(haEntitiesMemo);

      let deviceEntityLookup: DeviceEntityDisplayLookup = {};
      let inputDevices: DeviceRegistryEntry[] | undefined;
      let inputEntities: EntityRegistryDisplayEntry[] | undefined;

      if (
        includeDomainsMemo ||
        excludeDomainsMemo ||
        includeDeviceClassesMemo ||
        deviceFilterMemo ||
        entityFilterMemo
      ) {
        deviceEntityLookup = getDeviceEntityDisplayLookup(entities);
        inputDevices = devices;
        inputEntities = entities.filter((entity) => entity.labels.length > 0);

        if (includeDomainsMemo) {
          inputDevices = inputDevices!.filter((device) => {
            const devEntities = deviceEntityLookup[device.id];
            if (!devEntities || !devEntities.length) {
              return false;
            }
            return deviceEntityLookup[device.id].some((entity) =>
              includeDomainsMemo.includes(computeDomain(entity.entity_id))
            );
          });
          inputEntities = inputEntities!.filter((entity) =>
            includeDomainsMemo.includes(computeDomain(entity.entity_id))
          );
        }

        if (excludeDomainsMemo) {
          inputDevices = inputDevices!.filter((device) => {
            const devEntities = deviceEntityLookup[device.id];
            if (!devEntities || !devEntities.length) {
              return true;
            }
            return entities.every(
              (entity) =>
                !excludeDomainsMemo.includes(computeDomain(entity.entity_id))
            );
          });
          inputEntities = inputEntities!.filter(
            (entity) =>
              !excludeDomainsMemo.includes(computeDomain(entity.entity_id))
          );
        }

        if (includeDeviceClassesMemo) {
          inputDevices = inputDevices!.filter((device) => {
            const devEntities = deviceEntityLookup[device.id];
            if (!devEntities || !devEntities.length) {
              return false;
            }
            return deviceEntityLookup[device.id].some((entity) => {
              const stateObj = hass.states[entity.entity_id];
              if (!stateObj) {
                return false;
              }
              return (
                stateObj.attributes.device_class &&
                includeDeviceClassesMemo.includes(
                  stateObj.attributes.device_class
                )
              );
            });
          });
          inputEntities = inputEntities!.filter((entity) => {
            const stateObj = hass.states[entity.entity_id];
            return (
              stateObj.attributes.device_class &&
              includeDeviceClassesMemo.includes(
                stateObj.attributes.device_class
              )
            );
          });
        }

        if (deviceFilterMemo) {
          inputDevices = inputDevices!.filter((device) =>
            deviceFilterMemo!(device)
          );
        }

        if (entityFilterMemo) {
          inputDevices = inputDevices!.filter((device) => {
            const devEntities = deviceEntityLookup[device.id];
            if (!devEntities || !devEntities.length) {
              return false;
            }
            return deviceEntityLookup[device.id].some((entity) => {
              const stateObj = hass.states[entity.entity_id];
              if (!stateObj) {
                return false;
              }
              return entityFilterMemo(stateObj);
            });
          });
          inputEntities = inputEntities!.filter((entity) => {
            const stateObj = hass.states[entity.entity_id];
            if (!stateObj) {
              return false;
            }
            return entityFilterMemo!(stateObj);
          });
        }
      }

      let outputLabels = labelsMemo;
      const usedLabels = new Set<string>();

      let areaIds: string[] | undefined;

      if (inputDevices) {
        areaIds = inputDevices
          .filter((device) => device.area_id)
          .map((device) => device.area_id!);

        inputDevices.forEach((device) => {
          device.labels.forEach((label) => usedLabels.add(label));
        });
      }

      if (inputEntities) {
        areaIds = (areaIds ?? []).concat(
          inputEntities
            .filter((entity) => entity.area_id)
            .map((entity) => entity.area_id!)
        );
        inputEntities.forEach((entity) => {
          entity.labels.forEach((label) => usedLabels.add(label));
        });
      }

      if (areaIds) {
        areaIds.forEach((areaId) => {
          const area = haAreasMemo[areaId];
          area.labels.forEach((label) => usedLabels.add(label));
        });
      }

      if (excludeLabelsMemo) {
        outputLabels = outputLabels.filter(
          (label) => !excludeLabelsMemo!.includes(label.label_id)
        );
      }

      if (inputDevices || inputEntities) {
        outputLabels = outputLabels.filter((label) =>
          usedLabels.has(label.label_id)
        );
      }

      const items = outputLabels.map<PickerComboBoxItem>((label) => ({
        id: label.label_id,
        primary: label.name,
        icon: label.icon || undefined,
        icon_path: label.icon ? undefined : mdiLabel,
        sorting_label: label.name,
        search_labels: [label.name, label.label_id, label.description].filter(
          (v): v is string => Boolean(v)
        ),
      }));

      return items;
    }
  )(
    hass.areas,
    hass.devices,
    hass.entities,
    labels,
    includeDomains,
    excludeDomains,
    includeDeviceClasses,
    deviceFilter,
    entityFilter,
    excludeLabels
  );

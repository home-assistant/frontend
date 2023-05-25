import { Connection, createCollection } from "home-assistant-js-websocket";
import { Store } from "home-assistant-js-websocket/dist/store";
import { stringCompare } from "../common/string/compare";
import { debounce } from "../common/util/debounce";
import { HomeAssistant } from "../types";
import { DeviceRegistryEntry } from "./device_registry";
import { EntityRegistryEntry } from "./entity_registry";

export interface LabelRegistryEntry {
  label_id: string;
  name: string;
  color: string | null;
  description: string | null;
  icon: string | null;
}

export interface LabelEntityLookup {
  [labelId: string]: EntityRegistryEntry[];
}

export interface LabelDeviceLookup {
  [labelId: string]: DeviceRegistryEntry[];
}

export interface LabelRegistryEntryMutableParams {
  name: string;
  color?: string | null;
  description?: string | null;
  icon?: string | null;
}

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

const fetchLabelRegistry = (conn: Connection) =>
  conn
    .sendMessagePromise({
      type: "config/label_registry/list",
    })
    .then((labels) =>
      (labels as LabelRegistryEntry[]).sort((ent1, ent2) =>
        stringCompare(ent1.name, ent2.name)
      )
    );

const subscribeLabelRegistryUpdates = (
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

export const getLabelEntityLookup = (
  entities: EntityRegistryEntry[]
): LabelEntityLookup => {
  const labelEntityLookup: LabelEntityLookup = {};
  for (const entity of entities) {
    if (!entity.labels) {
      continue;
    }
    for (const label of entity.labels) {
      if (!(label in labelEntityLookup)) {
        labelEntityLookup[label] = [];
      }
      labelEntityLookup[label].push(entity);
    }
  }
  return labelEntityLookup;
};

export const getLabelDeviceLookup = (
  devices: DeviceRegistryEntry[]
): LabelDeviceLookup => {
  const labelDeviceLookup: LabelDeviceLookup = {};
  for (const device of devices) {
    if (!device.labels) {
      continue;
    }
    for (const label of device.labels) {
      if (!(label in labelDeviceLookup)) {
        labelDeviceLookup[label] = [];
      }
      labelDeviceLookup[label].push(device);
    }
  }
  return labelDeviceLookup;
};

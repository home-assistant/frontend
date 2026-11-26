import {
  createCollection,
  type Connection,
  type UnsubscribeFunc,
} from "home-assistant-js-websocket";
import type { Store } from "home-assistant-js-websocket/dist/store";
import type { DataTableRowData } from "../components/data-table/ha-data-table";
import type { HomeAssistant } from "../types";
import type { ConfigEntry } from "./config_entries";
import type { DeviceRegistryEntry } from "./device/device_registry";

export interface BluetoothDeviceData extends DataTableRowData {
  address: string;
  connectable: boolean;
  manufacturer_data: Record<string, string>;
  name: string;
  rssi: number;
  service_data: Record<string, string>;
  service_uuids: string[];
  source: string;
  time: number;
  tx_power: number | null;
  raw: string | null;
}

export interface BluetoothConnectionData extends DataTableRowData {
  address: string;
  source: string;
}

export type HaScannerType = "usb" | "uart" | "remote" | "unknown";

export interface BluetoothScannerDetails {
  source: string;
  connectable: boolean;
  name: string;
  adapter: string;
  scanner_type?: HaScannerType;
}

export type BluetoothScannersDetails = Record<string, BluetoothScannerDetails>;

interface BluetoothRemoveDeviceData {
  address: string;
}

interface BluetoothAdvertisementSubscriptionMessage {
  add?: BluetoothDeviceData[];
  change?: BluetoothDeviceData[];
  remove?: BluetoothRemoveDeviceData[];
}

interface BluetoothScannersDetailsSubscriptionMessage {
  add?: BluetoothScannerDetails[];
  remove?: BluetoothScannerDetails[];
}

export interface BluetoothAllocationsData {
  source: string;
  slots: number;
  free: number;
  allocated: string[];
}

export type BluetoothScannerMode = "active" | "passive";

export type BluetoothScannerRequestedMode = BluetoothScannerMode | "auto";

export interface BluetoothScannerState {
  source: string;
  adapter: string;
  current_mode: BluetoothScannerMode | null;
  requested_mode: BluetoothScannerRequestedMode | null;
}

export const isScannerStateMismatch = (state: BluetoothScannerState): boolean =>
  state.requested_mode !== "auto" &&
  state.current_mode !== state.requested_mode;

export interface BluetoothAdapterDevice {
  device: DeviceRegistryEntry;
  entry: ConfigEntry;
}

/**
 * Splits the Bluetooth adapters into enabled and disabled ones. An adapter is
 * a device with a Bluetooth connection that belongs to a `bluetooth` config
 * entry. Config entries without such a device (for example ignored discoveries
 * or removed proxies) are not adapters, unless they are disabled, so they can
 * still be enabled again.
 */
export const getBluetoothAdapters = (
  devices: HomeAssistant["devices"],
  configEntries: ConfigEntry[]
) => {
  const entryMap = new Map(configEntries.map((e) => [e.entry_id, e]));

  const enabledDevices: BluetoothAdapterDevice[] = [];
  const disabledDevices: BluetoothAdapterDevice[] = [];
  const matchedEntryIds = new Set<string>();

  for (const device of Object.values(devices)) {
    const btConnection = device.connections.find((c) => c[0] === "bluetooth");
    if (!btConnection) {
      continue;
    }
    const entry = device.config_entries
      .map((id) => entryMap.get(id))
      .find((e) => e !== undefined);
    if (!entry) {
      continue;
    }
    matchedEntryIds.add(entry.entry_id);
    if (entry.disabled_by !== null) {
      disabledDevices.push({ device, entry });
    } else {
      enabledDevices.push({ device, entry });
    }
  }

  const disabledEntriesWithoutDevice = configEntries.filter(
    (e) => e.disabled_by !== null && !matchedEntryIds.has(e.entry_id)
  );

  return { enabledDevices, disabledDevices, disabledEntriesWithoutDevice };
};

export const subscribeBluetoothScannersDetailsUpdates = (
  conn: Connection,
  store: Store<BluetoothScannersDetails>
): Promise<UnsubscribeFunc> =>
  conn.subscribeMessage<BluetoothScannersDetailsSubscriptionMessage>(
    (event) => {
      const data = { ...(store.state || {}) };
      if (event.add) {
        for (const device_data of event.add) {
          data[device_data.source] = device_data;
        }
      }
      if (event.remove) {
        for (const device_data of event.remove) {
          delete data[device_data.source];
        }
      }
      store.setState(data, true);
    },
    {
      type: `bluetooth/subscribe_scanner_details`,
    }
  );

export const subscribeBluetoothScannersDetails = (
  conn: Connection,
  callbackFunction: (bluetoothScannersDetails: BluetoothScannersDetails) => void
) =>
  createCollection<BluetoothScannersDetails>(
    "_bluetoothScannerDetails",
    () => Promise.resolve<BluetoothScannersDetails>({}), // empty hash as initial state

    subscribeBluetoothScannersDetailsUpdates,
    conn,
    callbackFunction
  );

const subscribeBluetoothAdvertisementsUpdates = (
  conn: Connection,
  store: Store<BluetoothDeviceData[]>
): Promise<UnsubscribeFunc> =>
  conn.subscribeMessage<BluetoothAdvertisementSubscriptionMessage>(
    (event) => {
      const data = [...(store.state || [])];
      if (event.add) {
        for (const device_data of event.add) {
          const index = data.findIndex(
            (d) => d.address === device_data.address
          );
          if (index === -1) {
            data.push(device_data);
          } else {
            data[index] = device_data;
          }
        }
      }
      if (event.change) {
        for (const device_data of event.change) {
          const index = data.findIndex(
            (d) => d.address === device_data.address
          );
          if (index !== -1) {
            data[index] = device_data;
          }
        }
      }
      if (event.remove) {
        for (const device_data of event.remove) {
          const index = data.findIndex(
            (d) => d.address === device_data.address
          );
          if (index !== -1) {
            data.splice(index, 1);
          }
        }
      }

      store.setState(data, true);
    },
    {
      type: `bluetooth/subscribe_advertisements`,
    }
  );

export const subscribeBluetoothAdvertisements = (
  conn: Connection,
  callbackFunction: (bluetoothDeviceData: BluetoothDeviceData[]) => void
) =>
  createCollection<BluetoothDeviceData[]>(
    "_bluetoothDeviceRows",
    () => Promise.resolve<BluetoothDeviceData[]>([]), // empty array as initial state

    subscribeBluetoothAdvertisementsUpdates,
    conn,
    callbackFunction
  );

export const subscribeBluetoothConnectionAllocations = (
  conn: Connection,
  callbackFunction: (
    bluetoothAllocationsData: BluetoothAllocationsData[]
  ) => void,
  configEntryId?: string
): Promise<() => Promise<void>> => {
  const params: { type: string; config_entry_id?: string } = {
    type: "bluetooth/subscribe_connection_allocations",
  };
  if (configEntryId) {
    params.config_entry_id = configEntryId;
  }
  return conn.subscribeMessage<BluetoothAllocationsData[]>(
    (bluetoothAllocationsData) => callbackFunction(bluetoothAllocationsData),
    params
  );
};

export const subscribeBluetoothScannerState = (
  conn: Connection,
  callbackFunction: (scannerState: BluetoothScannerState) => void,
  configEntryId?: string
): Promise<() => Promise<void>> => {
  const params: { type: string; config_entry_id?: string } = {
    type: "bluetooth/subscribe_scanner_state",
  };
  if (configEntryId) {
    params.config_entry_id = configEntryId;
  }
  return conn.subscribeMessage<BluetoothScannerState>(
    (scannerState) => callbackFunction(scannerState),
    params
  );
};

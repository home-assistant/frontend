import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import { navigate } from "../common/navigate";
import type { HomeAssistant } from "../types";
import { subscribeDeviceRegistry } from "./device_registry";
import { isComponentLoaded } from "../common/config/is_component_loaded";
import { getThreadDataSetTLV, listThreadDataSets } from "./thread";

export enum NetworkType {
  THREAD = "thread",
  WIFI = "wifi",
  ETHERNET = "ethernet",
  UNKNOWN = "unknown",
}

export enum NodeType {
  END_DEVICE = "end_device",
  SLEEPY_END_DEVICE = "sleepy_end_device",
  ROUTING_END_DEVICE = "routing_end_device",
  BRIDGE = "bridge",
  UNKNOWN = "unknown",
}

export interface MatterFabricData {
  fabric_id: number;
  vendor_id: number;
  fabric_index: number;
  fabric_label?: string;
  vendor_name?: string;
}

export interface MatterNodeDiagnostics {
  node_id: number;
  network_type: NetworkType;
  node_type: NodeType;
  network_name?: string;
  ip_addresses: string[];
  mac_address?: string;
  available: boolean;
  active_fabrics: MatterFabricData[];
  active_fabric_index: number;
}

export type MatterPingResult = Record<string, boolean>;

export interface MatterCommissioningParameters {
  setup_pin_code: number;
  setup_manual_code: string;
  setup_qr_code: string;
}

export const canCommissionMatterExternal = (hass: HomeAssistant) =>
  hass.auth.external?.config.canCommissionMatter;

export const startExternalCommissioning = async (hass: HomeAssistant) => {
  if (isComponentLoaded(hass, "thread")) {
    const datasets = await listThreadDataSets(hass);
    const preferredDataset = datasets.datasets.find(
      (dataset) => dataset.preferred
    );
    if (preferredDataset) {
      return hass.auth.external!.fireMessage({
        type: "matter/commission",
        payload: {
          active_operational_dataset: (
            await getThreadDataSetTLV(hass, preferredDataset.dataset_id)
          ).tlv,
          border_agent_id: preferredDataset.preferred_border_agent_id,
          mac_extended_address: preferredDataset.preferred_extended_address,
          extended_pan_id: preferredDataset.extended_pan_id,
        },
      });
    }
  }

  return hass.auth.external!.fireMessage({
    type: "matter/commission",
  });
};

export const redirectOnNewMatterDevice = (
  hass: HomeAssistant,
  callback?: () => void
): UnsubscribeFunc => {
  let curMatterDevices: Set<string> | undefined;
  const unsubDeviceReg = subscribeDeviceRegistry(hass.connection, (entries) => {
    if (!curMatterDevices) {
      curMatterDevices = new Set(
        Object.values(entries)
          .filter((device) =>
            device.identifiers.find((identifier) => identifier[0] === "matter")
          )
          .map((device) => device.id)
      );
      return;
    }
    const newMatterDevices = Object.values(entries).filter(
      (device) =>
        device.identifiers.find((identifier) => identifier[0] === "matter") &&
        !curMatterDevices!.has(device.id)
    );
    if (newMatterDevices.length) {
      unsubDeviceReg();
      curMatterDevices = undefined;
      callback?.();
      navigate(`/config/devices/device/${newMatterDevices[0].id}`);
    }
  });
  return () => {
    unsubDeviceReg();
    curMatterDevices = undefined;
  };
};

export const addMatterDevice = (hass: HomeAssistant) => {
  startExternalCommissioning(hass);
};

export const commissionMatterDevice = (
  hass: HomeAssistant,
  code: string
): Promise<void> =>
  hass.callWS({
    type: "matter/commission",
    code,
  });

export const acceptSharedMatterDevice = (
  hass: HomeAssistant,
  pin: number
): Promise<void> =>
  hass.callWS({
    type: "matter/commission_on_network",
    pin,
  });

export const matterSetWifi = (
  hass: HomeAssistant,
  network_name: string,
  password: string
): Promise<void> =>
  hass.callWS({
    type: "matter/set_wifi_credentials",
    network_name,
    password,
  });

export const matterSetThread = (
  hass: HomeAssistant,
  thread_operation_dataset: string
): Promise<void> =>
  hass.callWS({
    type: "matter/set_thread",
    thread_operation_dataset,
  });

export const getMatterNodeDiagnostics = (
  hass: HomeAssistant,
  device_id: string
): Promise<MatterNodeDiagnostics> =>
  hass.callWS({
    type: "matter/node_diagnostics",
    device_id,
  });

export const pingMatterNode = (
  hass: HomeAssistant,
  device_id: string
): Promise<MatterPingResult> =>
  hass.callWS({
    type: "matter/ping_node",
    device_id,
  });

export const openMatterCommissioningWindow = (
  hass: HomeAssistant,
  device_id: string
): Promise<MatterCommissioningParameters> =>
  hass.callWS({
    type: "matter/open_commissioning_window",
    device_id,
  });

export const removeMatterFabric = (
  hass: HomeAssistant,
  device_id: string,
  fabric_index: number
): Promise<void> =>
  hass.callWS({
    type: "matter/remove_matter_fabric",
    device_id,
    fabric_index,
  });

export const interviewMatterNode = (
  hass: HomeAssistant,
  device_id: string
): Promise<void> =>
  hass.callWS({
    type: "matter/interview_node",
    device_id,
  });

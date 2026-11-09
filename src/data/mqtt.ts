import type { HomeAssistant } from "../types";

export interface MQTTMessage {
  topic: string;
  payload: string;
  qos: number;
  retain: boolean;
}

// Debug info replays stored messages, so it also carries when each was logged.
export interface MQTTLoggedMessage extends MQTTMessage {
  time: string;
}

export interface MQTTTopicDebugInfo {
  topic: string;
  messages: MQTTLoggedMessage[];
}

export interface MQTTDiscoveryDebugInfo {
  topic: string;
  // The discovery config, which `mqtt-discovery-payload` renders as YAML/JSON.
  // An entity with debug traffic but nothing discovered has no config, and the
  // backend sends an empty string for it.
  payload: Record<string, unknown> | string;
}

export interface MQTTEntityDebugInfo {
  entity_id: string;
  discovery_data: MQTTDiscoveryDebugInfo;
  subscriptions: MQTTTopicDebugInfo[];
  transmitted: MQTTTopicDebugInfo[];
}

export interface MQTTTriggerDebugInfo {
  discovery_data: MQTTDiscoveryDebugInfo | null;
}

export interface MQTTDeviceDebugInfo {
  entities: MQTTEntityDebugInfo[];
  triggers: MQTTTriggerDebugInfo[];
}

export type MQTTExplorerSourceType = "yaml" | "subentry" | "discovery";

export interface MQTTExplorerOrigin {
  name: string;
  sw_version: string | null;
  support_url: string | null;
}

export interface MQTTExplorerSource {
  id: string;
  type: MQTTExplorerSourceType;
  title: string | null;
  // The software version of a discovery origin
  sw_version: string | null;
}

export interface MQTTExplorerDevice {
  device_id: string;
  name: string | null;
  sources: string[];
  // The parent device: a via_device, or the parent of a child device
  via_device_id: string | null;
  child_device: boolean;
}

export interface MQTTExplorerEntityTopic {
  topic: string;
  direction: "subscribe" | "publish";
  // Subscribe: configured QoS. Publish: QoS of the last sent message.
  qos: number;
}

export interface MQTTExplorerEntity {
  entity_id: string;
  name: string | null;
  available: boolean;
  // Null for an entity that was not set up and is placed under its device
  source: string | null;
  device_id: string | null;
  // The node ID of the discovery topic, if it has one
  node_id: string | null;
  topics: MQTTExplorerEntityTopic[];
}

export interface MQTTExplorerArtifact {
  artifact_id: string;
  type: "device_trigger" | "tag";
  source: string;
  device_id: string;
  node_id: string | null;
  topics: MQTTExplorerEntityTopic[];
}

export interface MQTTExplorerStructure {
  broker: {
    connected: boolean;
    host: string;
    port: number;
  };
  sources: MQTTExplorerSource[];
  devices: MQTTExplorerDevice[];
  entities: MQTTExplorerEntity[];
  artifacts: MQTTExplorerArtifact[];
}

export const fetchMQTTExplorerStructure = (
  hass: HomeAssistant
): Promise<MQTTExplorerStructure> =>
  hass.callWS<MQTTExplorerStructure>({ type: "mqtt/explorer/structure" });

export interface MQTTExplorerConfig {
  source: string;
  type: MQTTExplorerSourceType;
  discovery_topic: string | null;
  origin: MQTTExplorerOrigin | null;
  payload: Record<string, unknown>;
  // From a device based discovery payload. For a device, the payload is then
  // that whole device discovery payload, built again from its components.
  device_discovery: boolean;
}

export interface MQTTExplorerTopicDetails extends MQTTExplorerEntityTopic {
  // Stored messages, oldest first
  messages: MQTTLoggedMessage[];
}

export interface MQTTExplorerDetails {
  configs: MQTTExplorerConfig[];
  topics: MQTTExplorerTopicDetails[];
}

export type MQTTExplorerItem =
  { entity_id: string } | { device_id: string } | { artifact_id: string };

export const fetchMQTTExplorerDetails = (
  hass: HomeAssistant,
  item: MQTTExplorerItem
): Promise<MQTTExplorerDetails> =>
  hass.callWS<MQTTExplorerDetails>({ type: "mqtt/explorer/details", ...item });

export const subscribeMQTTTopic = (
  hass: HomeAssistant,
  topic: string,
  callback: (message: MQTTMessage) => void,
  qos?: number
) =>
  hass.connection.subscribeMessage<MQTTMessage>(callback, {
    type: "mqtt/subscribe",
    topic,
    qos,
  });

export const fetchMQTTDebugInfo = (
  hass: HomeAssistant,
  deviceId: string
): Promise<MQTTDeviceDebugInfo> =>
  hass.callWS<MQTTDeviceDebugInfo>({
    type: "mqtt/device/debug_info",
    device_id: deviceId,
  });

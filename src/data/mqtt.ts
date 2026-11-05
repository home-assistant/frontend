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

export interface MQTTExplorerTopic {
  topic: string;
  messages: number;
  bytes: number;
  message_rate: number;
  byte_rate: number;
  // Unix timestamp in seconds, server clock
  last_received: number;
  retained: boolean;
  qos: number;
  // Home Assistant subscriptions receiving the topic, the explorer excluded
  subscriptions: number;
}

export interface MQTTExplorerMessage {
  topic: string;
  payload: string;
  truncated: boolean;
  size: number;
  // Unix timestamp in seconds, server clock
  timestamp: number;
  retain: boolean;
  qos: number;
}

export interface MQTTExplorerTotals {
  topics: number;
  messages: number;
  bytes: number;
  message_rate: number;
  byte_rate: number;
  dropped_messages: number;
  // Messages counted without their payload because a snapshot was too large.
  dropped_payloads?: number;
}

// Each event only holds the topics and messages that changed since the previous one.
export interface MQTTExplorerEvent {
  interval: number;
  now: number;
  started: number;
  total: MQTTExplorerTotals;
  topics: MQTTExplorerTopic[];
  messages: MQTTExplorerMessage[];
}

export const subscribeMQTTExplorer = (
  hass: HomeAssistant,
  callback: (event: MQTTExplorerEvent) => void,
  topic: string,
  interval?: number
) =>
  hass.connection.subscribeMessage<MQTTExplorerEvent>(callback, {
    type: "mqtt/explorer/subscribe",
    topic,
    interval,
  });

import { HomeAssistant } from "../types";

export interface MQTTMessage {
  topic: string;
  payload: string;
  qos: number;
  retain: number;
}

export interface MQTTTopicDebugInfo {
  topic: string;
  messages: [string];
}

export interface MQTTDiscoveryDebugInfo {
  discovery_topic: string;
  discovery_payload: string;
}

export interface MQTTEntityDebugInfo {
  entity_id: string;
  discovery_data: MQTTDiscoveryDebugInfo;
  topics: [MQTTTopicDebugInfo];
}

export interface MQTTTriggerDebugInfo {
  discovery_data: MQTTDiscoveryDebugInfo;
}

export interface MQTTDeviceDebugInfo {
  entities: [MQTTEntityDebugInfo];
  triggers: [MQTTTriggerDebugInfo];
}

export const subscribeMQTTTopic = (
  hass: HomeAssistant,
  topic: string,
  callback: (message: MQTTMessage) => void
) => {
  return hass.connection.subscribeMessage<MQTTMessage>(callback, {
    type: "mqtt/subscribe",
    topic,
  });
};

export const removeMQTTDeviceEntry = (
  hass: HomeAssistant,
  deviceId: string
): Promise<void> =>
  hass.callWS({
    type: "mqtt/device/remove",
    device_id: deviceId,
  });

export const fetchMQTTDebugInfo = (
  hass: HomeAssistant,
  deviceId: string
): Promise<MQTTDeviceDebugInfo> =>
  hass.callWS<MQTTDeviceDebugInfo>({
    type: "mqtt/device/debug_info",
    device_id: deviceId,
  });

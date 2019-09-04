import { HomeAssistant } from "../types";

export interface MQTTMessage {
  topic: string;
  payload: string;
  qos: number;
  retain: number;
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

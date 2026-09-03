import type { MQTTMessage } from "../../../../../src/data/mqtt";
import type { MockHomeAssistant } from "../../../../../src/fake_data/provide_hass";
import { emitInitial } from "../subscription";

const PAYLOADS: Record<string, () => string> = {
  "homeassistant/status": () => "online",
  "zigbee2mqtt/bridge/state": () => '{"state":"online"}',
  default: () =>
    JSON.stringify({
      battery: 92,
      linkquality: 120,
      temperature: 21.4 + Math.round(Math.random() * 10) / 10,
    }),
};

const buildMessage = (topic: string, qos: number): MQTTMessage => ({
  topic,
  payload: (PAYLOADS[topic] ?? PAYLOADS.default)(),
  qos,
  retain: 0,
  time: new Date().toISOString(),
});

export const mockMqtt = (hass: MockHomeAssistant) => {
  hass.mockWS(
    "mqtt/subscribe",
    (msg: { topic: string; qos?: number }, _hass, onChange) => {
      // Echo a message on the subscribed topic every few seconds so the
      // listen card in the MQTT panel shows traffic.
      const send = () => onChange?.(buildMessage(msg.topic, msg.qos ?? 0));
      const stopInitial = emitInitial(send);
      const interval = window.setInterval(send, 3000);
      return () => {
        stopInitial();
        clearInterval(interval);
      };
    }
  );

  hass.mockWS("mqtt/device/debug_info", () => ({
    entities: [
      {
        entity_id: "sensor.fridge_temperature",
        discovery_data: {
          topic: "homeassistant/sensor/kitchen/temperature/config",
          payload:
            '{"name":"Temperature","state_topic":"zigbee2mqtt/kitchen","unit_of_measurement":"\\u00b0C"}',
        },
        subscriptions: [
          {
            topic: "zigbee2mqtt/kitchen",
            messages: [buildMessage("zigbee2mqtt/kitchen", 0)],
          },
        ],
        transmitted: [],
      },
    ],
    triggers: [],
  }));
};

import type {
  MQTTDeviceDebugInfo,
  MQTTMessage,
} from "../../../../../src/data/mqtt";
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

// Subscriptions take a topic filter, but a message carries the topic it was
// actually published on, so a filter has to be resolved to one concrete topic
// before it can be echoed back.
const resolveFilter = (filter: string): string =>
  filter
    .split("/")
    .flatMap((level) => {
      if (level === "+") {
        return ["kitchen"];
      }
      if (level === "#") {
        return ["kitchen", "temperature"];
      }
      return [level];
    })
    .join("/") || "homeassistant/status";

const buildMessage = (topic: string, qos: number): MQTTMessage => ({
  topic,
  payload: (PAYLOADS[topic] ?? PAYLOADS.default)(),
  qos,
  retain: 0,
  time: new Date().toISOString(),
});

const topicDebug = (topic: string) => ({
  topic,
  messages: [buildMessage(topic, 0)],
});

// Keyed by device, the way the backend builds this per requested device.
const DEBUG_INFO: Record<string, MQTTDeviceDebugInfo> = {
  "mqtt-fridge-sensor": {
    entities: [
      {
        entity_id: "sensor.fridge_temperature",
        discovery_data: {
          topic: "homeassistant/sensor/fridge/temperature/config",
          payload: {
            name: "Temperature",
            state_topic: "zigbee2mqtt/fridge",
            unit_of_measurement: "°C",
            device_class: "temperature",
          },
        },
        subscriptions: [topicDebug("zigbee2mqtt/fridge")],
        transmitted: [],
      },
      {
        entity_id: "sensor.fridge_battery",
        discovery_data: {
          topic: "homeassistant/sensor/fridge/battery/config",
          payload: {
            name: "Battery",
            state_topic: "zigbee2mqtt/fridge",
            unit_of_measurement: "%",
            device_class: "battery",
          },
        },
        subscriptions: [topicDebug("zigbee2mqtt/fridge")],
        transmitted: [],
      },
    ],
    triggers: [],
  },
  "mqtt-garage-door": {
    entities: [
      {
        entity_id: "cover.garage_door",
        discovery_data: {
          topic: "homeassistant/cover/garage/config",
          payload: {
            name: "Garage door",
            state_topic: "shellyplus1/status/cover:0",
            command_topic: "shellyplus1/command/cover:0",
            device_class: "garage",
          },
        },
        subscriptions: [topicDebug("shellyplus1/status/cover:0")],
        transmitted: [topicDebug("shellyplus1/command/cover:0")],
      },
    ],
    triggers: [],
  },
};

export const mockMqtt = (hass: MockHomeAssistant) => {
  hass.mockWS(
    "mqtt/subscribe",
    (msg: { topic: string; qos?: number }, _hass, onChange) => {
      // Echo a message on the subscribed topic every few seconds so the
      // listen card in the MQTT panel shows traffic.
      const topic = resolveFilter(msg.topic);
      const send = () => onChange?.(buildMessage(topic, msg.qos ?? 0));
      const stopInitial = emitInitial(send);
      const interval = window.setInterval(send, 3000);
      return () => {
        stopInitial();
        clearInterval(interval);
      };
    }
  );

  hass.mockWS(
    "mqtt/device/debug_info",
    (msg: { device_id: string }): MQTTDeviceDebugInfo =>
      DEBUG_INFO[msg.device_id] ?? { entities: [], triggers: [] }
  );
};

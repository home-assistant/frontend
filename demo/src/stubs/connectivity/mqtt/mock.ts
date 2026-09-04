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
      // Built from whole tenths, so the payload never carries the noise a
      // float sum leaves behind, like 21.599999999999998.
      temperature: (214 + Math.floor(Math.random() * 11)) / 10,
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

// A filter matches a topic level by level: "+" stands for one level, "#" for
// the rest of them.
const filterMatches = (filter: string, topic: string): boolean => {
  const filterLevels = filter.split("/");
  const topicLevels = topic.split("/");
  for (let index = 0; index < filterLevels.length; index += 1) {
    if (filterLevels[index] === "#") {
      return true;
    }
    if (index >= topicLevels.length) {
      return false;
    }
    if (
      filterLevels[index] !== "+" &&
      filterLevels[index] !== topicLevels[index]
    ) {
      return false;
    }
  }
  return filterLevels.length === topicLevels.length;
};

// The panel's listen card and its publish button talk to each other through
// the broker, so the mock keeps the subscriptions and delivers to them.
const subscriptions = new Set<{
  filter: string;
  qos: number;
  deliver: (message: MQTTMessage) => void;
}>();

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
      const qos = msg.qos ?? 0;
      const topic = resolveFilter(msg.topic);
      const deliver = (message: MQTTMessage) => onChange?.(message);
      const subscription = { filter: msg.topic, qos, deliver };
      subscriptions.add(subscription);
      const send = () => deliver(buildMessage(topic, qos));
      const stopInitial = emitInitial(send);
      const interval = window.setInterval(send, 3000);
      return () => {
        stopInitial();
        clearInterval(interval);
        subscriptions.delete(subscription);
      };
    }
  );

  // The panel publishes through a script action rather than a `mqtt/` command,
  // so without this the publish button only ever reports a failure. Delivering
  // to the matching subscriptions is what makes the two halves of the panel
  // work together.
  hass.mockWS(
    "execute_script",
    (msg: {
      sequence:
        | { action?: string; data?: Record<string, any> }
        | { action?: string; data?: Record<string, any> }[];
    }) => {
      // The sequence is one action or a list of them: the automation editor's
      // run button sends a single action, so this cannot assume an array.
      const actions = Array.isArray(msg.sequence)
        ? msg.sequence
        : [msg.sequence];
      actions
        .filter((action) => action?.action === "mqtt.publish")
        .forEach((action) => {
          const topic = String(action.data?.topic ?? "");
          const message: MQTTMessage = {
            topic,
            payload: String(action.data?.payload ?? ""),
            qos: Number(action.data?.qos ?? 0),
            retain: action.data?.retain ? 1 : 0,
            time: new Date().toISOString(),
          };
          subscriptions.forEach((subscription) => {
            if (filterMatches(subscription.filter, topic)) {
              subscription.deliver(message);
            }
          });
        });
      return { context: { id: "mock-context" }, response: {} };
    }
  );

  hass.mockWS(
    "mqtt/device/debug_info",
    (msg: { device_id: string }): MQTTDeviceDebugInfo =>
      DEBUG_INFO[msg.device_id] ?? { entities: [], triggers: [] }
  );
};

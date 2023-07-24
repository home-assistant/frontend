import { html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, query } from "lit/decorators";
import { getEntity } from "../../../../src/fake_data/entity";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import "../../components/demo-cards";

const ENTITIES = [
  getEntity("light", "bed_light", "on", {
    friendly_name: "Bed Light",
  }),
  getEntity("group", "kitchen", "on", {
    entity_id: ["light.bed_light"],
    order: 8,
    friendly_name: "Kitchen Group",
  }),
  getEntity("lock", "kitchen_door", "locked", {
    friendly_name: "Kitchen Lock",
  }),
  getEntity("cover", "kitchen_window", "open", {
    friendly_name: "Kitchen Window",
    supported_features: 11,
  }),
  getEntity("scene", "romantic_lights", "scening", {
    entity_id: ["light.bed_light", "light.ceiling_lights"],
    friendly_name: "Romantic Scene",
  }),
  getEntity("device_tracker", "demo_paulus", "home", {
    source_type: "gps",
    latitude: 32.877105,
    longitude: 117.232185,
    gps_accuracy: 91,
    battery: 71,
    friendly_name: "Paulus",
  }),
  getEntity("climate", "ecobee", "auto", {
    current_temperature: 73,
    min_temp: 45,
    max_temp: 95,
    temperature: null,
    target_temp_high: 75,
    target_temp_low: 70,
    fan_mode: "Auto Low",
    fan_list: ["On Low", "On High", "Auto Low", "Auto High", "Off"],
    operation_mode: "auto",
    operation_list: ["heat", "cool", "auto", "off"],
    hold_mode: "home",
    swing_mode: "Auto",
    swing_list: ["Auto", "1", "2", "3", "Off"],
    unit_of_measurement: "°F",
    friendly_name: "Ecobee",
    supported_features: 1014,
  }),
  getEntity("input_number", "number", 5, {
    min: 0,
    max: 10,
    step: 1,
    mode: "slider",
    unit_of_measurement: "dB",
    friendly_name: "Number",
    icon: "mdi:bell-ring",
  }),
  getEntity("input_boolean", "toggle", "on", {
    friendly_name: "Toggle",
  }),
  getEntity("input_datetime", "date_and_time", "2022-01-10 00:00:00", {
    has_date: true,
    has_time: true,
    editable: true,
    year: 2022,
    month: 1,
    day: 10,
    hour: 0,
    minute: 0,
    second: 0,
    timestamp: 1641801600,
    friendly_name: "Date and Time",
  }),
  getEntity("sensor", "humidity", "23.2", {
    friendly_name: "Humidity",
    unit_of_measurement: "%",
  }),
  getEntity("input_select", "dropdown", "Soda", {
    friendly_name: "Dropdown",
    options: ["Soda", "Beer", "Wine"],
  }),
  getEntity("input_text", "text", "Inspiration", {
    friendly_name: "Text",
    mode: "text",
  }),
  getEntity("timer", "timer", "idle", {
    friendly_name: "Timer",
    duration: "0:05:00",
  }),
  getEntity("counter", "counter", "3", {
    friendly_name: "Counter",
    initial: 0,
    step: 1,
    minimum: 0,
    maximum: 10,
  }),
  getEntity("text", "message", "Hello!", {
    friendly_name: "Message",
  }),

  getEntity("light", "unavailable", "unavailable", {
    friendly_name: "Bed Light",
  }),
  getEntity("lock", "unavailable", "unavailable", {
    friendly_name: "Kitchen Door",
  }),
  getEntity("cover", "unavailable", "unavailable", {
    friendly_name: "Kitchen Window",
    supported_features: 11,
  }),
  getEntity("scene", "unavailable", "unavailable", {
    friendly_name: "Romantic Scene",
  }),
  getEntity("device_tracker", "unavailable", "unavailable", {
    friendly_name: "Paulus",
  }),
  getEntity("climate", "unavailable", "unavailable", {
    unit_of_measurement: "°F",
    friendly_name: "Ecobee",
    supported_features: 1014,
  }),
  getEntity("input_number", "unavailable", "unavailable", {
    friendly_name: "Allowed Noise",
    icon: "mdi:bell-ring",
  }),
  getEntity("input_select", "unavailable", "unavailable", {
    unit_of_measurement: "dB",
    friendly_name: "Who cooks",
    icon: "mdi:cheff",
  }),
  getEntity("text", "unavailable", "unavailable", {
    friendly_name: "Message",
  }),
  getEntity("event", "unavailable", "unavailable", {
    friendly_name: "Empty remote",
  }),
  getEntity("event", "doorbell", "2023-07-17T21:26:11.615+00:00", {
    friendly_name: "Doorbell",
    device_class: "doorbell",
    event_type: "Ding-Dong",
  }),
];

const CONFIGS = [
  {
    heading: "Basic",
    config: `
- type: entities
  entities:
    - scene.romantic_lights
    - device_tracker.demo_paulus
    - cover.kitchen_window
    - group.kitchen
    - lock.kitchen_door
    - light.bed_light
    - light.non_existing
    - climate.ecobee
    - input_number.number
    - sensor.humidity
    - text.message
    - event.doorbell
    `,
  },
  {
    heading: "With enabled state color",
    config: `
- type: entities
  state_color: true
  entities:
    - scene.romantic_lights
    - device_tracker.demo_paulus
    - cover.kitchen_window
    - group.kitchen
    - lock.kitchen_door
    - light.bed_light
    - light.non_existing
    - climate.ecobee
    - input_number.number
    - sensor.humidity
    - text.message
    `,
  },
  {
    heading: "Helpers",
    config: `
- type: entities
  title: Helpers
  entities:
    - entity: input_boolean.toggle
    - entity: input_datetime.date_and_time
    - entity: input_number.number
    - entity: input_select.dropdown
    - entity: input_text.text
    - entity: timer.timer
    - entity: counter.counter
    `,
  },
  {
    heading: "With title, toggle-able",
    config: `
- type: entities
  entities:
    - scene.romantic_lights
    - device_tracker.demo_paulus
    - cover.kitchen_window
    - group.kitchen
    - lock.kitchen_door
    - light.bed_light
    - climate.ecobee
    - input_number.number
  title: Random group
    `,
  },
  {
    heading: "With title, toggle = false",
    config: `
- type: entities
  entities:
    - scene.romantic_lights
    - device_tracker.demo_paulus
    - cover.kitchen_window
    - group.kitchen
    - lock.kitchen_door
    - light.bed_light
    - climate.ecobee
    - input_number.number
  title: Random group
  show_header_toggle: false
    `,
  },
  {
    heading: "With title, can't toggle",
    config: `
- type: entities
  entities:
    - device_tracker.demo_paulus
  title: Random group
    `,
  },
  {
    heading: "Unavailable",
    config: `
- type: entities
  entities:
    - scene.unavailable
    - device_tracker.unavailable
    - cover.unavailable
    - lock.unavailable
    - light.unavailable
    - climate.unavailable
    - input_number.unavailable
    - input_select.unavailable
    - text.unavailable
    - event.unavailable
    `,
  },
  {
    heading: "Custom name, secondary info, custom icon",
    config: `
- type: entities
  entities:
    - entity: scene.romantic_lights
      name: ¯\\_(ツ)_/¯
    - entity: device_tracker.demo_paulus
      secondary_info: entity-id
    - entity: cover.kitchen_window
      secondary_info: last-changed
    - entity: group.kitchen
      icon: mdi:home-assistant
    - lock.kitchen_door
    - entity: light.bed_light
      icon: mdi:alarm-light
      name: Bed Light Custom Icon
    - climate.ecobee
    - input_number.number
  title: Random group
  show_header_toggle: false
    `,
  },
  {
    heading: "Special rows",
    config: `
- type: entities
  entities:
    - type: call-service
      icon: mdi:power
      name: Bed light
      action_name: Toggle light
      service: light.toggle
      data:
        entity_id: light.bed_light
    - type: section
      label: Links
    - type: weblink
      url: http://google.com/
      icon: mdi:google
      name: Google
    - type: divider
    - type: divider
      style:
        height: 30px
        margin: 4px 0
        background: center / contain url("/images/divider.png") no-repeat
    `,
  },
];

@customElement("demo-lovelace-entities-card")
class DemoEntities extends LitElement {
  @query("#demos") private _demoRoot!: HTMLElement;

  protected render(): TemplateResult {
    return html`<demo-cards id="demos" .configs=${CONFIGS}></demo-cards>`;
  }

  protected firstUpdated(changedProperties: PropertyValues) {
    super.firstUpdated(changedProperties);
    const hass = provideHass(this._demoRoot);
    hass.updateTranslations(null, "en");
    hass.updateTranslations("lovelace", "en");
    hass.addEntities(ENTITIES);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-lovelace-entities-card": DemoEntities;
  }
}

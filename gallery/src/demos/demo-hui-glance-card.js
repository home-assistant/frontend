import { html } from "@polymer/polymer/lib/utils/html-tag.js";
import { PolymerElement } from "@polymer/polymer/polymer-element.js";

import getEntity from "../data/entity.js";
import provideHass from "../data/provide_hass.js";
import "../components/demo-cards.js";

const ENTITIES = [
  getEntity("light", "bed_light", "on", {
    friendly_name: "Bed Light",
  }),
  getEntity("group", "kitchen", "on", {
    entity_id: ["light.bed_light"],
    order: 8,
    friendly_name: "Kitchen",
  }),
  getEntity("lock", "kitchen_door", "locked", {
    friendly_name: "Kitchen Door",
  }),
  getEntity("cover", "kitchen_window", "open", {
    friendly_name: "Kitchen Window",
    supported_features: 11,
  }),
  getEntity("scene", "romantic_lights", "scening", {
    entity_id: ["light.bed_light", "light.ceiling_lights"],
    friendly_name: "Romantic lights",
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
  getEntity("input_number", "noise_allowance", 5, {
    min: 0,
    max: 10,
    step: 1,
    mode: "slider",
    unit_of_measurement: "dB",
    friendly_name: "Allowed Noise",
    icon: "mdi:bell-ring",
  }),
];

const CONFIGS = [
  {
    heading: "Basic example",
    config: `
- type: glance
  entities:
    - device_tracker.demo_paulus
    - media_player.living_room
    - sun.sun
    - cover.kitchen_window
    - light.kitchen_lights
    - lock.kitchen_door
    - light.ceiling_lights
    `,
  },
  {
    heading: "With title",
    config: `
- type: glance
  title: This is glance
  entities:
    - device_tracker.demo_paulus
    - media_player.living_room
    - sun.sun
    - cover.kitchen_window
    - light.kitchen_lights
    - lock.kitchen_door
    - light.ceiling_lights
    `,
  },
  {
    heading: "Custom column width",
    config: `
- type: glance
  column_width: calc(100% / 7)
  entities:
    - device_tracker.demo_paulus
    - media_player.living_room
    - sun.sun
    - cover.kitchen_window
    - light.kitchen_lights
    - lock.kitchen_door
    - light.ceiling_lights
    `,
  },
  {
    heading: "No name",
    config: `
- type: glance
  show_name: false
  entities:
    - device_tracker.demo_paulus
    - media_player.living_room
    - sun.sun
    - cover.kitchen_window
    - light.kitchen_lights
    - lock.kitchen_door
    - light.ceiling_lights
    `,
  },
  {
    heading: "No state",
    config: `
- type: glance
  show_state: false
  entities:
    - device_tracker.demo_paulus
    - media_player.living_room
    - sun.sun
    - cover.kitchen_window
    - light.kitchen_lights
    - lock.kitchen_door
    - light.ceiling_lights
    `,
  },
  {
    heading: "No name and no state",
    config: `
- type: glance
  show_name: false
  show_state: false
  entities:
    - device_tracker.demo_paulus
    - media_player.living_room
    - sun.sun
    - cover.kitchen_window
    - light.kitchen_lights
    - lock.kitchen_door
    - light.ceiling_lights
    `,
  },
  {
    heading: "Custom name, custom icon",
    config: `
- type: glance
  entities:
    - entity: device_tracker.demo_paulus
      name: ¯\\_(ツ)_/¯
      icon: mdi:home-assistant
    - media_player.living_room
    - sun.sun
    - cover.kitchen_window
    - entity: light.kitchen_lights
      icon: mdi:alarm-light
    - lock.kitchen_door
    - light.ceiling_lights
    `,
  },
  {
    heading: "Custom tap action",
    config: `
- type: glance
  entities:
    - entity: lock.kitchen_door
      tap_action: toggle
    - entity: light.ceiling_lights
      tap_action: call-service
      service: light.turn_on
    - device_tracker.demo_paulus
    - media_player.living_room
    - sun.sun
    - cover.kitchen_window
    - light.kitchen_lights
    `,
  },
  {
    heading: "Selectively hidden name",
    config: `
- type: glance
  entities:
    - device_tracker.demo_paulus
    - entity: media_player.living_room
      name:
    - sun.sun
    - entity: cover.kitchen_window
      name:
    - light.kitchen_lights
    `,
  },
  {
    heading: "Primary theme",
    config: `
- type: glance
  theming: primary
  entities:
    - device_tracker.demo_paulus
    - media_player.living_room
    - sun.sun
    - cover.kitchen_window
    - light.kitchen_lights
    - lock.kitchen_door
    - light.ceiling_lights
    `,
  },
];

class DemoPicEntity extends PolymerElement {
  static get template() {
    return html`
      <demo-cards
        id='demos'
        configs="[[_configs]]"
      ></demo-cards>
    `;
  }

  static get properties() {
    return {
      _configs: {
        type: Object,
        value: CONFIGS,
      },
    };
  }

  ready() {
    super.ready();
    const hass = provideHass(this.$.demos);
    hass.addEntities(ENTITIES);
  }
}

customElements.define("demo-hui-glance-card", DemoPicEntity);

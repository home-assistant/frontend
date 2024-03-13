import { html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, query } from "lit/decorators";
import { getEntity } from "../../../../src/fake_data/entity";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import "../../components/demo-cards";
import { mockIcons } from "../../../../demo/src/stubs/icons";

const ENTITIES = [
  getEntity("device_tracker", "demo_paulus", "work", {
    source_type: "gps",
    latitude: 32.877105,
    longitude: 117.232185,
    gps_accuracy: 91,
    battery: 25,
    friendly_name: "Paulus",
  }),
  getEntity("device_tracker", "demo_anne_therese", "school", {
    source_type: "gps",
    latitude: 32.877105,
    longitude: 117.232185,
    gps_accuracy: 91,
    battery: 50,
    friendly_name: "Anne Therese",
  }),
  getEntity("device_tracker", "demo_home_boy", "home", {
    source_type: "gps",
    latitude: 32.877105,
    longitude: 117.232185,
    gps_accuracy: 91,
    battery: 75,
    friendly_name: "Home Boy",
  }),
  getEntity("light", "bed_light", "on", {
    friendly_name: "Bed Light",
  }),
  getEntity("light", "kitchen_lights", "on", {
    friendly_name: "Kitchen Lights",
  }),
  getEntity("light", "ceiling_lights", "off", {
    friendly_name: "Ceiling Lights",
  }),
  getEntity("sensor", "battery_1", 20, {
    device_class: "battery",
    friendly_name: "Battery 1",
    unit_of_measurement: "%",
  }),
  getEntity("sensor", "battery_2", 35, {
    device_class: "battery",
    friendly_name: "Battery 2",
    unit_of_measurement: "%",
  }),
  getEntity("sensor", "battery_3", 40, {
    device_class: "battery",
    friendly_name: "Battery 3",
    unit_of_measurement: "%",
  }),
  getEntity("sensor", "battery_4", 80, {
    device_class: "battery",
    friendly_name: "Battery 4",
    unit_of_measurement: "%",
  }),
  getEntity("input_number", "min_battery_level", 30, {
    mode: "slider",
    step: 10,
    min: 0,
    max: 100,
    icon: "mdi:battery-alert-variant",
    friendly_name: "Minimum Battery Level",
    unit_of_measurement: "%",
  }),
];

const CONFIGS = [
  {
    heading: "Unfiltered entities",
    config: `
- type: entities
  entities:
    - device_tracker.demo_anne_therese
    - device_tracker.demo_home_boy
    - device_tracker.demo_paulus
    - light.bed_light
    - light.ceiling_lights
    - light.kitchen_lights
    `,
  },
  {
    heading: "On and home entities",
    config: `
- type: entity-filter
  entities:
    - device_tracker.demo_anne_therese
    - device_tracker.demo_home_boy
    - device_tracker.demo_paulus
    - light.bed_light
    - light.ceiling_lights
    - light.kitchen_lights
  conditions:
    - condition: state
      state:
        - "on"
        - home
    `,
  },
  {
    heading: "Same state as Bed Light",
    config: `
- type: entity-filter
  entities:
    - device_tracker.demo_anne_therese
    - device_tracker.demo_home_boy
    - device_tracker.demo_paulus
    - light.bed_light
    - light.ceiling_lights
    - light.kitchen_lights
  conditions:
    - condition: state
      state:
        - light.bed_light
    `,
  },
  {
    heading: 'With "entities" card config',
    config: `
- type: entity-filter
  entities:
    - device_tracker.demo_anne_therese
    - device_tracker.demo_home_boy
    - device_tracker.demo_paulus
    - light.bed_light
    - light.ceiling_lights
    - light.kitchen_lights
  conditions:
    - condition: state
      state:
        - "on"
        - home
  card:
    type: entities
    title: Custom Title
    show_header_toggle: false
    `,
  },
  {
    heading: 'With "glance" card config',
    config: `
- type: entity-filter
  entities:
    - device_tracker.demo_anne_therese
    - device_tracker.demo_home_boy
    - device_tracker.demo_paulus
    - light.bed_light
    - light.ceiling_lights
    - light.kitchen_lights
  conditions:
    - condition: state
      state:
        - "on"
        - home
  card:
    type: glance
    show_state: true
    title: Custom Title
    `,
  },
  {
    heading:
      "Filtered entities by battery attribute (< '30') using state filter",
    config: `
- type: entity-filter
  entities:
    - device_tracker.demo_anne_therese
    - device_tracker.demo_home_boy
    - device_tracker.demo_paulus
  state_filter:
    - operator: <
      attribute: battery
      value: "30"
    `,
  },
  {
    heading: "Unfiltered number entities",
    config: `
- type: entities
  entities:
    - input_number.min_battery_level
    - sensor.battery_1
    - sensor.battery_3
    - sensor.battery_2
    - sensor.battery_4
    `,
  },
  {
    heading: "Battery lower than 50%",
    config: `
- type: entity-filter
  entities:
    - sensor.battery_1
    - sensor.battery_3
    - sensor.battery_2
    - sensor.battery_4
  conditions:
    - condition: numeric_state
      below: 50
    `,
  },
  {
    heading: "Battery lower than min battery level",
    config: `
- type: entity-filter
  entities:
    - sensor.battery_1
    - sensor.battery_3
    - sensor.battery_2
    - sensor.battery_4
  conditions:
    - condition: numeric_state
      below: input_number.min_battery_level
    `,
  },
  {
    heading: "Battery between min battery level and 70%",
    config: `
- type: entity-filter
  entities:
    - sensor.battery_1
    - sensor.battery_3
    - sensor.battery_2
    - sensor.battery_4
  conditions:
    - condition: numeric_state
      above: input_number.min_battery_level
      below: 70
    `,
  },
  {
    heading: "Error: Entities must be specified",
    config: `
- type: entity-filter
    `,
  },
  {
    heading: "Error: Incorrect filter config",
    config: `
- type: entity-filter
  entities:
    - sensor.gas_station_lowest_price
    `,
  },
];

@customElement("demo-lovelace-entity-filter-card")
class DemoEntityFilter extends LitElement {
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
    mockIcons(hass);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-lovelace-entity-filter-card": DemoEntityFilter;
  }
}

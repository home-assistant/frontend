import { html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, query } from "lit/decorators";
import { getEntity } from "../../../../src/fake_data/entity";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import "../../components/demo-cards";

const ENTITIES = [
  getEntity("device_tracker", "demo_paulus", "work", {
    source_type: "gps",
    latitude: 32.877105,
    longitude: 117.232185,
    gps_accuracy: 91,
    battery: 71,
    friendly_name: "Paulus",
  }),
  getEntity("device_tracker", "demo_anne_therese", "school", {
    source_type: "gps",
    latitude: 32.877105,
    longitude: 117.232185,
    gps_accuracy: 91,
    battery: 71,
    friendly_name: "Anne Therese",
  }),
  getEntity("device_tracker", "demo_home_boy", "home", {
    source_type: "gps",
    latitude: 32.877105,
    longitude: 117.232185,
    gps_accuracy: 91,
    battery: 71,
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
  getEntity("sensor", "gas_station_auchan_saint_priest_e10", 1.712, {
    device_class: "monetary",
    icon: "mdi:gas-station",
    friendly_name: "Gas station Auchan Saint Priest E10",
    unit_of_measurement: "€",
  }),
  getEntity("sensor", "gas_station_carrefour_venissieux_e10", 1.724, {
    device_class: "monetary",
    icon: "mdi:gas-station",
    friendly_name: "Gas station Carrefour Venissieux E10",
    unit_of_measurement: "€",
  }),
  getEntity("sensor", "gas_station_relais_lyon_mermoz_e10", 1.751, {
    device_class: "monetary",
    icon: "mdi:gas-station",
    friendly_name: "Gas station Relais Lyon Mermoz E10",
    unit_of_measurement: "€",
  }),
  getEntity("sensor", "gas_station_lowest_price", 1.712, {
    state_class: "measurement",
    min_entity_id: "sensor.gas_station_auchan_saint_priest_e10",
    icon: "mdi:gas-station-in-use",
    friendly_name: "Gas station Lowest Price",
    unit_of_measurement: "€",
  }),
];

const CONFIGS = [
  {
    heading: "Unfiltered entities",
    config: `
- type: entities
  entities:
  - light.bed_light
  - light.ceiling_lights
  - light.kitchen_lights
    `,
  },
  {
    heading: "Filtered entities",
    config: `
- type: entity-filter
  entities:
    - device_tracker.demo_anne_therese
    - device_tracker.demo_home_boy
    - device_tracker.demo_paulus
    - light.bed_light
    - light.ceiling_lights
    - light.kitchen_lights
  state_filter:
    - "on"
    - home
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
  state_filter:
    - "on"
    - not_home
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
  state_filter:
    - "on"
    - not_home
  card:
    type: glance
    show_state: true
    title: Custom Title
    `,
  },
  {
    heading: "Unfiltered number entities",
    config: `
- type: entities
  entities:
    - sensor.gas_station_auchan_saint_priest_e10
    - sensor.gas_station_carrefour_venissieux_e10
    - sensor.gas_station_relais_lyon_mermoz_e10
    - sensor.gas_station_lowest_price
    `,
  },
  {
    heading: "Filtered entities with operator & number value",
    config: `
- type: entity-filter
  entities:
    - sensor.gas_station_auchan_saint_priest_e10
    - sensor.gas_station_carrefour_venissieux_e10
    - sensor.gas_station_relais_lyon_mermoz_e10
  state_filter:
    - operator: <=
      value: 1.73
    `,
  },
  {
    heading: "Filtered entities with operator & entity_id value",
    config: `
- type: entity-filter
  entities:
    - sensor.gas_station_auchan_saint_priest_e10
    - sensor.gas_station_carrefour_venissieux_e10
    - sensor.gas_station_relais_lyon_mermoz_e10
  state_filter:
    - operator: ==
      value: sensor.gas_station_lowest_price
    `,
  },
  {
    heading: "Filtered entities with condition operator",
    config: `
- type: entity-filter
  entities:
    - sensor.gas_station_auchan_saint_priest_e10
    - sensor.gas_station_carrefour_venissieux_e10
    - sensor.gas_station_relais_lyon_mermoz_e10
  state_filter:
    - condition: operator
      operator: in
      value: sensor.gas_station_lowest_price
    `,
  },
  {
    heading: "Filtered entities with condition state_not",
    config: `
- type: entity-filter
  entities:
    - sensor.gas_station_auchan_saint_priest_e10
    - sensor.gas_station_carrefour_venissieux_e10
    - sensor.gas_station_relais_lyon_mermoz_e10
  state_filter:
    - condition: state
      state_not: sensor.gas_station_lowest_price
    `,
  },
  {
    heading: "Filtered entities with condition above",
    config: `
- type: entity-filter
  entities:
    - sensor.gas_station_auchan_saint_priest_e10
    - sensor.gas_station_carrefour_venissieux_e10
    - sensor.gas_station_relais_lyon_mermoz_e10
  state_filter:
    - condition: numeric_state
      above: sensor.gas_station_lowest_price
    `,
  },
  {
    heading: "Filtered entities with condition in conditions",
    config: `
- type: entity-filter
  entities:
    - sensor.gas_station_auchan_saint_priest_e10
    - sensor.gas_station_carrefour_venissieux_e10
    - sensor.gas_station_relais_lyon_mermoz_e10
  conditions:
    - condition: numeric_state
      above: sensor.gas_station_lowest_price
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
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-lovelace-entity-filter-card": DemoEntityFilter;
  }
}

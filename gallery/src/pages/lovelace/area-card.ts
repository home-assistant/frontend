import { html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, query } from "lit/decorators";
import { getEntity } from "../../../../src/fake_data/entity";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import "../../components/demo-cards";

const ENTITIES = [
  getEntity("light", "bed_light", "on", {
    friendly_name: "Bed Light",
  }),
  getEntity("switch", "bed_ac", "on", {
    friendly_name: "Ecobee",
  }),
  getEntity("sensor", "bed_temp", "72", {
    friendly_name: "Bedroom Temp",
    device_class: "temperature",
    unit_of_measurement: "°F",
  }),
  getEntity("light", "living_room_light", "off", {
    friendly_name: "Living Room Light",
  }),
  getEntity("fan", "living_room", "on", {
    friendly_name: "Living Room Fan",
  }),
  getEntity("sensor", "office_humidity", "73", {
    friendly_name: "Office Humidity",
    device_class: "humidity",
    unit_of_measurement: "%",
  }),
  getEntity("light", "office", "on", {
    friendly_name: "Office Light",
  }),
  getEntity("fan", "kitchen", "on", {
    friendly_name: "Kitchen Fan",
  }),
  getEntity("binary_sensor", "kitchen_door", "on", {
    friendly_name: "Office Door",
    device_class: "door",
  }),
];

// TODO: Update image here
const CONFIGS = [
  {
    heading: "Bedroom",
    config: `
- type: area
  area: bedroom
    `,
  },
  {
    heading: "Living Room",
    config: `
- type: area
  area: living_room
    `,
  },
  {
    heading: "Office",
    config: `
- type: area
  area: office
    `,
  },
  {
    heading: "Kitchen",
    config: `
- type: area
  area: kitchen
    `,
  },
];

@customElement("demo-lovelace-area-card")
class DemoArea extends LitElement {
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
    hass.mockWS("config/area_registry/list", () => [
      {
        name: "Bedroom",
        area_id: "bedroom",
        picture: "/images/bed.png",
      },
      {
        name: "Living Room",
        area_id: "living_room",
        picture: "/images/living_room.png",
      },
      {
        name: "Office",
        area_id: "office",
        picture: "/images/office.jpg",
      },
      {
        name: "Kitchen",
        area_id: "kitchen",
        picture: "/images/kitchen.png",
      },
    ]);
    hass.mockWS("config/device_registry/list", () => []);
    hass.mockWS("config/entity_registry/list", () => [
      {
        area_id: "bedroom",
        entity_id: "light.bed_light",
      },
      {
        area_id: "bedroom",
        entity_id: "switch.bed_ac",
      },
      {
        area_id: "bedroom",
        entity_id: "sensor.bed_temp",
      },
      {
        area_id: "living_room",
        entity_id: "light.living_room_light",
      },
      {
        area_id: "living_room",
        entity_id: "fan.living_room",
      },
      {
        area_id: "office",
        entity_id: "light.office",
      },
      {
        area_id: "office",
        entity_id: "sensor.office_humidity",
      },
      {
        area_id: "kitchen",
        entity_id: "fan.kitchen",
      },
      {
        area_id: "kitchen",
        entity_id: "binary_sensor.kitchen_door",
      },
    ]);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-lovelace-area-card": DemoArea;
  }
}

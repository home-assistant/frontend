import { html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, query } from "lit/decorators";
import { getEntity } from "../../../src/fake_data/entity";
import { provideHass } from "../../../src/fake_data/provide_hass";
import "../components/demo-cards";

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
  getEntity("fan", "second_office", "on", {
    friendly_name: "Second Office Fan",
  }),
];

// TODO: Update image here
const CONFIGS = [
  {
    heading: "Bedroom",
    config: `
- type: area
  area: bedroom
  image: "https://blogmickey.com/wp-content/uploads/2019/01/Riviera-Resort-One-or-Two-Bedroom-Villa-Bedroom-16x9-1024x576.jpg"
    `,
  },
  {
    heading: "Living Room",
    config: `
- type: area
  area: living_room
  image: "https://thirtynineframes.com/wp-content/uploads/2019/01/Youngs_Eames-16x9x1920.jpg"
    `,
  },
  {
    heading: "Office",
    config: `
- type: area
  area: office
  image: "https://www.boardandvellum.com/wp-content/uploads/2019/09/16x9-private_offices_vs_open_office_concepts-1242x699.jpg"
    `,
  },
  {
    heading: "Second Office",
    config: `
- type: area
  area: second_office
  image: "https://images.wallpaperscraft.com/image/single/office_work_interior_walls_80538_1600x900.jpg"
    `,
  },
];

@customElement("demo-hui-area-card")
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
      },
      {
        name: "Living Room",
        area_id: "living_room",
      },
      {
        name: "Office",
        area_id: "office",
      },
      {
        name: "Second Office",
        area_id: "second_office",
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
        area_id: "second_office",
        entity_id: "fan.second_office",
      },
    ]);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-hui-area-card": DemoArea;
  }
}

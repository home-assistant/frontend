import { html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, query } from "lit/decorators";
import { getEntity } from "../../../src/fake_data/entity";
import { provideHass } from "../../../src/fake_data/provide_hass";
import "../components/demo-cards";

const ENTITIES = [
  getEntity("light", "bed_light", "on", {
    friendly_name: "Bed Light",
  }),
  getEntity("switch", "ac", "on", {
    friendly_name: "Ecobee",
  }),
  getEntity("sensor", "bed_temp", "72", {
    friendly_name: "Bedroom Temp",
    device_class: "temperature",
    unit_of_measurement: "°F",
  }),
];

// TODO: Update image here
const CONFIGS = [
  {
    heading: "Basic example",
    config: `
- type: area
  area: bedroom
  image: "https://blogmickey.com/wp-content/uploads/2019/01/Riviera-Resort-One-or-Two-Bedroom-Villa-Bedroom-16x9-1024x576.jpg"
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
    ]);
    hass.mockWS("config/device_registry/list", () => []);
    hass.mockWS("config/entity_registry/list", () => [
      {
        area_id: "bedroom",
        entity_id: "light.bed_light",
      },
      {
        area_id: "bedroom",
        entity_id: "switch.ac",
      },
      {
        area_id: "bedroom",
        entity_id: "sensor.bed_temp",
      },
    ]);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-hui-area-card": DemoArea;
  }
}

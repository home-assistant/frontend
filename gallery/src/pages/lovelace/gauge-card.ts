import type { PropertyValues, TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, query } from "lit/decorators";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import "../../components/demo-cards";
import { mockIcons } from "../../../../demo/src/stubs/icons";

const ENTITIES = [
  { entity_id: "sensor.brightness", state: "12", attributes: {} },
  { entity_id: "sensor.brightness_medium", state: "53", attributes: {} },
  { entity_id: "sensor.brightness_high", state: "87", attributes: {} },
  { entity_id: "plant.bonsai", state: "ok", attributes: {} },
  { entity_id: "sensor.not_working", state: "unavailable", attributes: {} },
  {
    entity_id: "sensor.outside_humidity",
    state: "54",
    attributes: {
      unit_of_measurement: "%",
    },
  },
  {
    entity_id: "sensor.outside_temperature",
    state: "15.6",
    attributes: {
      unit_of_measurement: "°C",
    },
  },
];

const CONFIGS = [
  {
    heading: "Basic example",
    config: `
- type: gauge
  entity: sensor.outside_humidity
  name: Outside Humidity
    `,
  },
  {
    heading: "Custom unit of measurement",
    config: `
- type: gauge
  entity: sensor.outside_temperature
  unit_of_measurement: C
  name: Outside Temperature
    `,
  },
  {
    heading: "Rendering needle",
    config: `
- type: gauge
  entity: sensor.outside_humidity
  name: Outside Humidity
  needle: true
    `,
  },
  {
    heading: "Rendering needle and severity levels",
    config: `
- type: gauge
  entity: sensor.brightness_high
  name: Brightness High
  needle: true
  severity:
    red: 75
    green: 0
    yellow: 50
    `,
  },
  {
    heading: "Setting severity levels",
    config: `
- type: gauge
  entity: sensor.brightness
  name: Brightness Low
  severity:
    red: 75
    green: 0
    yellow: 50
    `,
  },
  {
    heading: "Setting severity levels",
    config: `
- type: gauge
  entity: sensor.brightness_medium
  name: Brightness Medium
  severity:
    red: 75
    green: 0
    yellow: 50
    `,
  },
  {
    heading: "Setting severity levels",
    config: `
- type: gauge
  entity: sensor.brightness_high
  name: Brightness High
  severity:
    red: 75
    green: 0
    yellow: 50
    `,
  },
  {
    heading: "Setting min (0) and mx (15) values",
    config: `
- type: gauge
  entity: sensor.brightness
  name: Brightness
  min: 0
  max: 15
    `,
  },
  {
    heading: "Invalid entity",
    config: `
- type: gauge
  entity: sensor.invalid_entity
    `,
  },
  {
    heading: "Non-numeric value",
    config: `
- type: gauge
  entity: plant.bonsai
    `,
  },
  {
    heading: "Unavailable entity",
    config: `
- type: gauge
  entity: sensor.not_working
    `,
  },
  {
    heading: "Lower minimum",
    config: `
- type: gauge
  entity: sensor.brightness_high
  needle: true
  severity:
    green: 0
    yellow: 0.45
    red: 0.9
  min: -0.05
  name: " "
  max: 1.9
  unit: GBP/h`,
  },
];

@customElement("demo-lovelace-gauge-card")
class DemoGaugeEntity extends LitElement {
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
    "demo-lovelace-gauge-card": DemoGaugeEntity;
  }
}

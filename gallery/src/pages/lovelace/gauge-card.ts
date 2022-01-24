import { html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, query } from "lit/decorators";
import { getEntity } from "../../../../src/fake_data/entity";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import "../../components/demo-cards";

const ENTITIES = [
  getEntity("sensor", "brightness", "12", {}),
  getEntity("sensor", "brightness_medium", "53", {}),
  getEntity("sensor", "brightness_high", "87", {}),
  getEntity("plant", "bonsai", "ok", {}),
  getEntity("sensor", "not_working", "unavailable", {}),
  getEntity("sensor", "outside_humidity", "54", {
    unit_of_measurement: "%",
  }),
  getEntity("sensor", "outside_temperature", "15.6", {
    unit_of_measurement: "°C",
  }),
];

const CONFIGS = [
  {
    heading: "Basic example",
    config: `
- type: gauge
  title: Humidity
  entity: sensor.outside_humidity
  name: Outside Humidity
    `,
  },
  {
    heading: "Custom Unit of Measurement",
    config: `
- type: gauge
  entity: sensor.outside_temperature
  unit_of_measurement: C
  name: Outside Temperature
    `,
  },
  {
    heading: "Setting Severity Levels",
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
    heading: "Setting Severity Levels",
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
    heading: "Setting Severity Levels",
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
    heading: "Setting Min (0) and Max (15) Values",
    config: `
- type: gauge
  entity: sensor.brightness
  name: Brightness
  min: 0
  max: 15
    `,
  },
  {
    heading: "Invalid Entity",
    config: `
- type: gauge
  entity: sensor.invalid_entity
    `,
  },
  {
    heading: "Non-Numeric Value",
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
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-lovelace-gauge-card": DemoGaugeEntity;
  }
}

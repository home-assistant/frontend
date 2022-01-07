import { html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, query } from "lit/decorators";
import { getEntity } from "../../../../src/fake_data/entity";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import "../../components/demo-cards";

const ENTITIES = [
  getEntity("climate", "ecobee", "auto", {
    current_temperature: 73,
    min_temp: 45,
    max_temp: 95,
    temperature: null,
    target_temp_high: 75,
    target_temp_low: 70,
    fan_mode: "Auto Low",
    fan_modes: ["On Low", "On High", "Auto Low", "Auto High", "Off"],
    hvac_modes: ["heat", "cool", "auto", "off"],
    swing_mode: "Auto",
    swing_modes: ["Auto", "1", "2", "3", "Off"],
    friendly_name: "Ecobee",
    supported_features: 59,
    preset_mode: "eco",
    preset_modes: ["away", "eco"],
  }),
  getEntity("climate", "nest", "heat", {
    current_temperature: 17,
    min_temp: 15,
    max_temp: 25,
    temperature: 19,
    fan_mode: "Auto Low",
    fan_modes: ["On Low", "On High", "Auto Low", "Auto High", "Off"],
    hvac_modes: ["heat", "cool", "auto", "off"],
    swing_mode: "Auto",
    swing_modes: ["Auto", "1", "2", "3", "Off"],
    friendly_name: "Nest",
    supported_features: 43,
  }),
  getEntity("climate", "unavailable", "unavailable", {
    supported_features: 43,
  }),
];

const CONFIGS = [
  {
    heading: "Range example",
    config: `
- type: thermostat
  entity: climate.ecobee
- type: thermostat
  entity: climate.nest
    `,
  },
  {
    heading: "Single temp example",
    config: `
- type: thermostat
  entity: climate.nest
    `,
  },
  {
    heading: "Unavailable",
    config: `
- type: thermostat
  entity: climate.unavailable
    `,
  },
  {
    heading: "Non existing",
    config: `
- type: thermostat
  entity: climate.nonexisting
    `,
  },
];

@customElement("demo-lovelace-thermostat-card")
class DemoThermostatEntity extends LitElement {
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
    "demo-lovelace-thermostat-card": DemoThermostatEntity;
  }
}

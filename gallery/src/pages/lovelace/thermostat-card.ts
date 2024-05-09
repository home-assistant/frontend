import { html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, query } from "lit/decorators";
import { getEntity } from "../../../../src/fake_data/entity";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import "../../components/demo-cards";
import { mockIcons } from "../../../../demo/src/stubs/icons";

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
  getEntity("climate", "overkiz_radiator", "heat", {
    current_temperature: 18,
    min_temp: 7,
    max_temp: 35,
    temperature: 20,
    hvac_modes: ["heat", "auto", "off"],
    friendly_name: "Overkiz radiator",
    supported_features: 17,
    preset_mode: "comfort",
    preset_modes: [
      "none",
      "frost_protection",
      "eco",
      "comfort",
      "comfort-1",
      "comfort-2",
      "auto",
      "boost",
      "external",
      "prog",
    ],
  }),
  getEntity("climate", "overkiz_towel_dryer", "heat", {
    current_temperature: null,
    min_temp: 7,
    max_temp: 35,
    hvac_modes: ["heat", "off"],
    friendly_name: "Overkiz towel dryer",
    supported_features: 16,
    preset_mode: "eco",
    preset_modes: [
      "none",
      "frost_protection",
      "eco",
      "comfort",
      "comfort-1",
      "comfort-2",
    ],
  }),
  getEntity("climate", "sensibo", "fan_only", {
    current_temperature: null,
    temperature: null,
    min_temp: 0,
    max_temp: 1,
    target_temp_step: 1,
    hvac_modes: ["fan_only", "off"],
    friendly_name: "Sensibo purifier",
    fan_modes: ["low", "high"],
    fan_mode: "low",
    swing_modes: ["on", "off", "both", "vertical", "horizontal"],
    swing_mode: "vertical",
    supported_features: 41,
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
    heading: "Feature example",
    config: `
- type: thermostat
  entity: climate.overkiz_radiator
  features:
    - type: climate-hvac-modes
      hvac_modes:
        - heat
        - 'off'
        - auto
    - type: climate-preset-modes
      style: icons
      preset_modes:
        - none
        - frost_protection
        - eco
        - comfort
        - comfort-1
        - comfort-2
        - auto
        - boost
        - external
        - prog
    - type: climate-preset-modes
      style: dropdown
      preset_modes:
        - none
        - frost_protection
        - eco
        - comfort
        - comfort-1
        - comfort-2
        - auto
        - boost
        - external
        - prog
    `,
  },
  {
    heading: "Preset only example",
    config: `
- type: thermostat
  entity: climate.overkiz_towel_dryer
  features:
    - type: climate-hvac-modes
      hvac_modes:
        - heat
        - 'off'
    - type: climate-preset-modes
      style: icons
      preset_modes:
        - none
        - frost_protection
        - eco
        - comfort
        - comfort-1
        - comfort-2
    `,
  },
  {
    heading: "Fan only example",
    config: `
- type: thermostat
  entity: climate.sensibo
  features:
    - type: climate-hvac-modes
      hvac_modes:
        - fan_only
        - 'off'
    - type: climate-fan-modes
      style: icons
      fan_modes:
        - low
        - high
    - type: climate-swing-modes
      style: icons
      swing_modes:
        - 'on'
        - 'off'
        - 'both'
        - 'vertical'
        - 'horizontal'
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
    mockIcons(hass);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-lovelace-thermostat-card": DemoThermostatEntity;
  }
}

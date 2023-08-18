import { html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, property, query } from "lit/decorators";
import "../../../../src/components/ha-card";
import "../../../../src/dialogs/more-info/more-info-content";
import { getEntity } from "../../../../src/fake_data/entity";
import {
  MockHomeAssistant,
  provideHass,
} from "../../../../src/fake_data/provide_hass";
import "../../components/demo-more-infos";
import { ClimateEntityFeature } from "../../../../src/data/climate";

const ENTITIES = [
  getEntity("climate", "thermostat", "heat", {
    friendly_name: "Basic heater",
    hvac_modes: ["heat", "off"],
    hvac_mode: "heat",
    current_temperature: 18,
    temperature: 20,
    min_temp: 10,
    max_temp: 30,
    supported_features: ClimateEntityFeature.TARGET_TEMPERATURE,
  }),
  getEntity("climate", "ac", "cool", {
    friendly_name: "Basic air conditioning",
    hvac_modes: ["cool", "off"],
    hvac_mode: "cool",
    current_temperature: 18,
    temperature: 20,
    min_temp: 10,
    max_temp: 30,
    supported_features: ClimateEntityFeature.TARGET_TEMPERATURE,
  }),
  getEntity("climate", "hvac", "auto", {
    friendly_name: "Basic hvac",
    hvac_modes: ["auto", "off"],
    hvac_mode: "auto",
    current_temperature: 18,
    min_temp: 10,
    max_temp: 30,
    target_temp_step: 1,
    supported_features: ClimateEntityFeature.TARGET_TEMPERATURE_RANGE,
    target_temp_low: 20,
    target_temp_high: 25,
  }),
  getEntity("climate", "advanced", "auto", {
    friendly_name: "Advanced hvac",
    supported_features:
      // eslint-disable-next-line no-bitwise
      ClimateEntityFeature.TARGET_TEMPERATURE_RANGE |
      ClimateEntityFeature.TARGET_HUMIDITY |
      ClimateEntityFeature.PRESET_MODE,
    hvac_modes: ["auto", "off"],
    hvac_mode: "auto",
    preset_modes: ["eco", "comfort", "boost"],
    preset_mode: "eco",
    current_temperature: 18,
    min_temp: 10,
    max_temp: 30,
    target_temp_step: 1,
    target_temp_low: 20,
    target_temp_high: 25,
    current_humidity: 40,
    min_humidity: 0,
    max_humidity: 100,
    humidity: 50,
  }),
  getEntity("climate", "unavailable", "unavailable", {
    friendly_name: "Unavailable heater",
    hvac_modes: ["heat", "off"],
    hvac_mode: "heat",
    min_temp: 10,
    max_temp: 30,
    supported_features: ClimateEntityFeature.TARGET_TEMPERATURE,
  }),
];

@customElement("demo-more-info-climate")
class DemoMoreInfoClimate extends LitElement {
  @property() public hass!: MockHomeAssistant;

  @query("demo-more-infos") private _demoRoot!: HTMLElement;

  protected render(): TemplateResult {
    return html`
      <demo-more-infos
        .hass=${this.hass}
        .entities=${ENTITIES.map((ent) => ent.entityId)}
      ></demo-more-infos>
    `;
  }

  protected firstUpdated(changedProperties: PropertyValues) {
    super.firstUpdated(changedProperties);
    const hass = provideHass(this._demoRoot);
    hass.updateTranslations(null, "en");
    hass.addEntities(ENTITIES);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-more-info-climate": DemoMoreInfoClimate;
  }
}

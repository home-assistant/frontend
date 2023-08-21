import { html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, property, query } from "lit/decorators";
import "../../../../src/components/ha-card";
import { WaterHeaterEntityFeature } from "../../../../src/data/water_heater";
import "../../../../src/dialogs/more-info/more-info-content";
import { getEntity } from "../../../../src/fake_data/entity";
import {
  MockHomeAssistant,
  provideHass,
} from "../../../../src/fake_data/provide_hass";
import "../../components/demo-more-infos";

const ENTITIES = [
  getEntity("water_heater", "basic", "eco", {
    friendly_name: "Basic heater",
    operation_list: ["heat_pump", "eco", "performance", "off"],
    operation_mode: "eco",
    away_mode: "off",
    target_temp_step: 1,
    current_temperature: 55,
    temperature: 60,
    min_temp: 20,
    max_temp: 70,
    supported_features:
      // eslint-disable-next-line no-bitwise
      WaterHeaterEntityFeature.TARGET_TEMPERATURE |
      WaterHeaterEntityFeature.OPERATION_MODE |
      WaterHeaterEntityFeature.AWAY_MODE,
  }),
  getEntity("water_heater", "unavailable", "unavailable", {
    friendly_name: "Unavailable heater",
    operation_list: ["heat_pump", "eco", "performance", "off"],
    operation_mode: "off",
    min_temp: 20,
    max_temp: 70,
    supported_features:
      // eslint-disable-next-line no-bitwise
      WaterHeaterEntityFeature.TARGET_TEMPERATURE |
      WaterHeaterEntityFeature.OPERATION_MODE,
  }),
];

@customElement("demo-more-info-water-heater")
class DemoMoreInfoWaterHeater extends LitElement {
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
    "demo-more-info-water-heater": DemoMoreInfoWaterHeater;
  }
}

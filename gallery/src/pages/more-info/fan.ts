import type { PropertyValues, TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property, query } from "lit/decorators";
import "../../../../src/components/ha-card";
import "../../../../src/dialogs/more-info/more-info-content";
import type { MockHomeAssistant } from "../../../../src/fake_data/provide_hass";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import "../../components/demo-more-infos";
import { FanEntityFeature } from "../../../../src/data/fan";

const ENTITIES = [
  {
    entity_id: "fan.fan",
    state: "on",
    attributes: {
      friendly_name: "Fan",
      device_class: "fan",
      supported_features:
        FanEntityFeature.OSCILLATE +
        FanEntityFeature.DIRECTION +
        FanEntityFeature.SET_SPEED,
    },
  },
  {
    entity_id: "fan.one_speed_fan",
    state: "on",
    attributes: {
      friendly_name: "One speed fan",
      device_class: "fan",
      percentage: 100,
      percentage_step: 100,
      supported_features: FanEntityFeature.SET_SPEED,
    },
  },
  {
    entity_id: "fan.two_speed_fan",
    state: "on",
    attributes: {
      friendly_name: "Two speed fan",
      device_class: "fan",
      percentage: 50,
      percentage_step: 50,
      supported_features: FanEntityFeature.SET_SPEED,
    },
  },
  {
    entity_id: "fan.three_speed_fan",
    state: "on",
    attributes: {
      friendly_name: "Three speed fan",
      device_class: "fan",
      percentage: 67,
      percentage_step: 100 / 3,
      supported_features: FanEntityFeature.SET_SPEED,
    },
  },
  {
    entity_id: "fan.four_speed_fan",
    state: "on",
    attributes: {
      friendly_name: "Four speed fan",
      device_class: "fan",
      percentage: 50,
      percentage_step: 25,
      supported_features: FanEntityFeature.SET_SPEED,
    },
  },
  {
    entity_id: "fan.five_speed_fan",
    state: "on",
    attributes: {
      friendly_name: "Five speed fan",
      device_class: "fan",
      percentage: 80,
      percentage_step: 20,
      supported_features: FanEntityFeature.SET_SPEED,
    },
  },
  {
    entity_id: "fan.six_speed_fan",
    state: "on",
    attributes: {
      friendly_name: "Six speed fan",
      device_class: "fan",
      percentage: 50,
      percentage_step: 100 / 6,
      supported_features:
        FanEntityFeature.SET_SPEED +
        FanEntityFeature.TURN_ON +
        FanEntityFeature.TURN_OFF,
    },
  },
  {
    entity_id: "fan.ten_speed_fan",
    state: "on",
    attributes: {
      friendly_name: "Ten speed fan",
      device_class: "fan",
      percentage: 70,
      percentage_step: 10,
      supported_features: FanEntityFeature.SET_SPEED,
    },
  },
  {
    entity_id: "fan.eleven_speed_fan",
    state: "on",
    attributes: {
      friendly_name: "Eleven speed fan",
      device_class: "fan",
      percentage: 45,
      percentage_step: 100 / 11,
      supported_features: FanEntityFeature.SET_SPEED,
    },
  },
];

@customElement("demo-more-info-fan")
class DemoMoreInfoFan extends LitElement {
  @property({ attribute: false }) public hass!: MockHomeAssistant;

  @query("demo-more-infos") private _demoRoot!: HTMLElement;

  protected render(): TemplateResult {
    return html`
      <demo-more-infos
        .hass=${this.hass}
        .entities=${ENTITIES.map((ent) => ent.entity_id)}
      ></demo-more-infos>
    `;
  }

  protected firstUpdated(changedProperties: PropertyValues<this>) {
    super.firstUpdated(changedProperties);
    const hass = provideHass(this._demoRoot);
    hass.updateTranslations(null, "en");
    hass.addEntities(ENTITIES);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-more-info-fan": DemoMoreInfoFan;
  }
}

import type { PropertyValues, TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property, query } from "lit/decorators";
import "../../../../src/components/ha-card";
import "../../../../src/dialogs/more-info/more-info-content";
import type { MockHomeAssistant } from "../../../../src/fake_data/provide_hass";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import "../../components/demo-more-infos";

const ENTITIES = [
  {
    entity_id: "humidifier.humidifier",
    state: "on",
    attributes: {
      friendly_name: "Humidifier",
      device_class: "humidifier",
      current_humidity: 50,
      humidity: 30,
    },
  },
  {
    entity_id: "humidifier.dehumidifier",
    state: "on",
    attributes: {
      friendly_name: "Dehumidifier",
      device_class: "dehumidifier",
      current_humidity: 50,
      humidity: 30,
    },
  },
  {
    entity_id: "humidifier.unavailable",
    state: "unavailable",
    attributes: {
      friendly_name: "Unavailable humidifier",
    },
  },
];

@customElement("demo-more-info-humidifier")
class DemoMoreInfoHumidifier extends LitElement {
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

  protected firstUpdated(changedProperties: PropertyValues) {
    super.firstUpdated(changedProperties);
    const hass = provideHass(this._demoRoot);
    hass.updateTranslations(null, "en");
    hass.addEntities(ENTITIES);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-more-info-humidifier": DemoMoreInfoHumidifier;
  }
}

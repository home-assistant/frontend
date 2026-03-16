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
    entity_id: "number.box1",
    state: "0",
    attributes: {
      friendly_name: "Box1",
      min: 0,
      max: 100,
      step: 1,
      initial: 0,
      mode: "box",
      unit_of_measurement: "items",
    },
  },
  {
    entity_id: "number.slider1",
    state: "0",
    attributes: {
      friendly_name: "Slider1",
      min: 0,
      max: 100,
      step: 1,
      initial: 0,
      mode: "slider",
      unit_of_measurement: "items",
    },
  },
  {
    entity_id: "number.auto1",
    state: "0",
    attributes: {
      friendly_name: "Auto1",
      min: 0,
      max: 1000,
      step: 1,
      initial: 0,
      mode: "auto",
      unit_of_measurement: "items",
    },
  },
  {
    entity_id: "number.auto2",
    state: "0",
    attributes: {
      friendly_name: "Auto2",
      min: 0,
      max: 100,
      step: 1,
      initial: 0,
      mode: "auto",
      unit_of_measurement: "items",
    },
  },
];

@customElement("demo-more-info-number")
class DemoMoreInfoNumber extends LitElement {
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
    "demo-more-info-number": DemoMoreInfoNumber;
  }
}

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

const ENTITIES = [
  getEntity("number", "box1", 0, {
    friendly_name: "Box1",
    min: 0,
    max: 100,
    step: 1,
    initial: 0,
    mode: "box",
    unit_of_measurement: "items",
  }),
  getEntity("number", "slider1", 0, {
    friendly_name: "Slider1",
    min: 0,
    max: 100,
    step: 1,
    initial: 0,
    mode: "slider",
    unit_of_measurement: "items",
  }),
  getEntity("number", "auto1", 0, {
    friendly_name: "Auto1",
    min: 0,
    max: 1000,
    step: 1,
    initial: 0,
    mode: "auto",
    unit_of_measurement: "items",
  }),
  getEntity("number", "auto2", 0, {
    friendly_name: "Auto2",
    min: 0,
    max: 100,
    step: 1,
    initial: 0,
    mode: "auto",
    unit_of_measurement: "items",
  }),
];

@customElement("demo-more-info-number")
class DemoMoreInfoNumber extends LitElement {
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
    "demo-more-info-number": DemoMoreInfoNumber;
  }
}

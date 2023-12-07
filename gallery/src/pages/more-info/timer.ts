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
  getEntity("timer", "timer", "idle", {
    friendly_name: "Timer",
    duration: "0:05:00",
  }),
];

@customElement("demo-more-info-timer")
class DemoMoreInfoTimer extends LitElement {
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
    "demo-more-info-timer": DemoMoreInfoTimer;
  }
}

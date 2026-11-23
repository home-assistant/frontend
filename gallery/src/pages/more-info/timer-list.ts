import type { PropertyValues, TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property, query } from "lit/decorators";
import { mockTimerList } from "../../../../demo/src/stubs/timer_list";
import "../../../../src/components/ha-card";
import "../../../../src/dialogs/more-info/more-info-content";
import type { MockHomeAssistant } from "../../../../src/fake_data/provide_hass";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import "../../components/demo-more-infos";
import { TIMER_LIST_ENTITIES, TIMER_LIST_TIMERS } from "../../data/timer_list";

@customElement("demo-more-info-timer-list")
class DemoMoreInfoTimerList extends LitElement {
  @property({ attribute: false }) public hass!: MockHomeAssistant;

  @query("demo-more-infos") private _demoRoot!: HTMLElement;

  protected render(): TemplateResult {
    return html`
      <demo-more-infos
        .hass=${this.hass}
        .entities=${TIMER_LIST_ENTITIES.map((ent) => ent.entity_id)}
      ></demo-more-infos>
    `;
  }

  protected firstUpdated(changedProperties: PropertyValues<this>) {
    super.firstUpdated(changedProperties);
    const hass = provideHass(this._demoRoot);
    hass.updateTranslations(null, "en");
    hass.addEntities(TIMER_LIST_ENTITIES);
    mockTimerList(hass, TIMER_LIST_TIMERS);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-more-info-timer-list": DemoMoreInfoTimerList;
  }
}

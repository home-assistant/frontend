import type { HassEntity } from "home-assistant-js-websocket";
import { html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../components/timer-list/ha-timer-list";

@customElement("more-info-timer_list")
class MoreInfoTimerList extends LitElement {
  @property({ attribute: false }) public stateObj?: HassEntity;

  protected render() {
    if (!this.stateObj) {
      return nothing;
    }
    return html`
      <ha-timer-list
        create-at-end
        .entityId=${this.stateObj.entity_id}
      ></ha-timer-list>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-timer_list": MoreInfoTimerList;
  }
}

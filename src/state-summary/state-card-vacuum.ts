import type { HassEntity } from "home-assistant-js-websocket";
import { CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import "../components/entity/state-info";
import "../components/ha-vacuum-state";
import { HomeAssistant } from "../types";
import { haStyle } from "../resources/styles";

@customElement("state-card-vacuum")
class StateCardVacuum extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: HassEntity;

  @property({ type: Boolean }) public inDialog = false;

  protected render(): TemplateResult {
    return html`
      <div class="horizontal justified layout">
        <state-info
          .hass=${this.hass}
          .stateObj=${this.stateObj}
          .inDialog=${this.inDialog}
        >
        </state-info>

        <ha-vacuum-state
          .hass=${this.hass}
          .stateObj=${this.stateObj}
        ></ha-vacuum-state>
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return [haStyle];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "state-card-vacuum": StateCardVacuum;
  }
}

import { HassEntity } from "home-assistant-js-websocket";
import { CSSResultGroup, LitElement, html } from "lit";
import { customElement, property } from "lit/decorators";
import "../components/entity/state-info";
import "../components/ha-lawn_mower-action-button";
import { haStyle } from "../resources/styles";
import type { HomeAssistant } from "../types";

@customElement("state-card-lawn_mower")
class StateCardLawnMower extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public stateObj!: HassEntity;

  @property({ type: Boolean }) public inDialog = false;

  public render() {
    const stateObj = this.stateObj;
    return html`
      <div class="horizontal justified layout">
        <state-info
          .hass=${this.hass}
          .stateObj=${stateObj}
          .inDialog=${this.inDialog}
        ></state-info>
        <ha-lawn_mower-action-button
          .hass=${this.hass}
          .stateObj=${stateObj}
        ></ha-lawn_mower-action-button>
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return haStyle;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "state-card-lawn_mower": StateCardLawnMower;
  }
}

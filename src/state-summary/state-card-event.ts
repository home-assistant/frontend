import { HassEntity } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import "../components/entity/ha-entity-toggle";
import "../components/entity/state-info";
import { haStyle } from "../resources/styles";
import { HomeAssistant } from "../types";

@customElement("state-card-event")
export class StateCardEvent extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public stateObj!: HassEntity;

  @property({ type: Boolean }) public inDialog = false;

  protected render() {
    return html`
      <div class="horizontal justified layout">
        <state-info
          .hass=${this.hass}
          .stateObj=${this.stateObj}
          .inDialog=${this.inDialog}
        ></state-info>
        <div class="container">
          <div class="event_type">
            ${this.hass.formatEntityState(this.stateObj)}
          </div>
          <div class="event_data">
            ${this.hass.formatEntityAttributeValue(this.stateObj, "event_type")}
          </div>
        </div>
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .container {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }
        .event_data {
          color: var(--secondary-text-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "state-card-event": StateCardEvent;
  }
}

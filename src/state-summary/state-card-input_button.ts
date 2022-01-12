import "@material/mwc-button";
import { HassEntity } from "home-assistant-js-websocket";
import { CSSResultGroup, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import "../components/entity/ha-entity-toggle";
import "../components/entity/state-info";
import { UNAVAILABLE } from "../data/entity";
import { haStyle } from "../resources/styles";
import { HomeAssistant } from "../types";

@customElement("state-card-input_button")
export class StateCardInputButton extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public stateObj!: HassEntity;

  @property({ type: Boolean }) public inDialog = false;

  protected render() {
    const stateObj = this.stateObj;
    return html`
      <div class="horizontal justified layout">
        <state-info
          .hass=${this.hass}
          .stateObj=${stateObj}
          .inDialog=${this.inDialog}
        ></state-info>
        <mwc-button
          @click=${this._pressButton}
          .disabled=${stateObj.state === UNAVAILABLE}
        >
          ${this.hass.localize("ui.card.button.press")}
        </mwc-button>
      </div>
    `;
  }

  private _pressButton(ev: Event) {
    ev.stopPropagation();
    this.hass.callService("input_button", "press", {
      entity_id: this.stateObj.entity_id,
    });
  }

  static get styles(): CSSResultGroup {
    return haStyle;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "state-card-input_button": StateCardInputButton;
  }
}

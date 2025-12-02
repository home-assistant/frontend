import type { HassEntity } from "home-assistant-js-websocket";
import type { CSSResultGroup } from "lit";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import "../components/entity/ha-entity-toggle";
import "../components/entity/state-info";
import "../components/ha-button";
import { UNAVAILABLE } from "../data/entity";
import { haStyle } from "../resources/styles";
import type { HomeAssistant } from "../types";

@customElement("state-card-input_button")
class StateCardInputButton extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: HassEntity;

  @property({ attribute: "in-dialog", type: Boolean }) public inDialog = false;

  protected render() {
    const stateObj = this.stateObj;
    return html`
      <div class="horizontal justified layout">
        <state-info
          .hass=${this.hass}
          .stateObj=${stateObj}
          .inDialog=${this.inDialog}
        ></state-info>
        <ha-button
          appearance="plain"
          @click=${this._pressButton}
          .disabled=${stateObj.state === UNAVAILABLE}
        >
          ${this.hass.localize("ui.card.button.press")}
        </ha-button>
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

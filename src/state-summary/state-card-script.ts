import "@material/mwc-button";
import "../components/entity/ha-entity-toggle";
import "../components/entity/state-info";
import { HomeAssistant } from "../types";
import {
  html,
  customElement,
  LitElement,
  property,
  CSSResult,
} from "lit-element";
import { HassEntity } from "home-assistant-js-websocket";
import { haStyle } from "../resources/styles";
import { UNAVAILABLE_STATES } from "../data/entity";
import { canExcecute, ScriptEntity } from "../data/script";

@customElement("state-card-script")
export class StateCardScript extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public stateObj!: HassEntity;

  @property({ type: Boolean }) public inDialog = false;

  protected render() {
    const stateObj = this.stateObj as ScriptEntity;
    return html`
      <div class="horizontal justified layout">
        <state-info
          .hass=${this.hass}
          .stateObj=${stateObj}
          .inDialog=${this.inDialog}
        ></state-info>
        ${stateObj.state === "on"
          ? html`<mwc-button @click=${this._cancelScript}>
              ${(stateObj.attributes.current || 0) > 0
                ? this.hass.localize(
                    "ui.card.script.cancel_multiple",
                    "number",
                    stateObj.attributes.current
                  )
                : this.hass.localize("ui.card.script.cancel")}
            </mwc-button>`
          : ""}
        ${stateObj.state === "off" || stateObj.attributes.max
          ? html`<mwc-button
              @click=${this._executeScript}
              .disabled=${UNAVAILABLE_STATES.includes(stateObj.state) ||
              !canExcecute(stateObj)}
            >
              ${this.hass!.localize("ui.card.script.execute")}
            </mwc-button>`
          : ""}
      </div>
    `;
  }

  private _cancelScript(ev: Event) {
    ev.stopPropagation();
    this._callService("turn_off");
  }

  private _executeScript(ev: Event) {
    ev.stopPropagation();
    this._callService("turn_on");
  }

  private _callService(service: string): void {
    this.hass.callService("script", service, {
      entity_id: this.stateObj.entity_id,
    });
  }

  static get styles(): CSSResult {
    return haStyle;
  }
}

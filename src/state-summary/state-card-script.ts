import "@material/mwc-button";
import { HassEntity } from "home-assistant-js-websocket";
import { CSSResultGroup, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import "../components/entity/ha-entity-toggle";
import "../components/entity/state-info";
import { isUnavailableState } from "../data/entity";
import { canRun, ScriptEntity } from "../data/script";
import { haStyle } from "../resources/styles";
import { HomeAssistant } from "../types";

@customElement("state-card-script")
export class StateCardScript extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

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
              ${stateObj.attributes.mode !== "single" &&
              (stateObj.attributes.current || 0) > 0
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
              @click=${this._runScript}
              .disabled=${isUnavailableState(stateObj.state) ||
              !canRun(stateObj)}
            >
              ${this.hass!.localize("ui.card.script.run")}
            </mwc-button>`
          : ""}
      </div>
    `;
  }

  private _cancelScript(ev: Event) {
    ev.stopPropagation();
    this._callService("turn_off");
  }

  private _runScript(ev: Event) {
    ev.stopPropagation();
    this._callService("turn_on");
  }

  private _callService(service: string): void {
    this.hass.callService("script", service, {
      entity_id: this.stateObj.entity_id,
    });
  }

  static get styles(): CSSResultGroup {
    return haStyle;
  }
}

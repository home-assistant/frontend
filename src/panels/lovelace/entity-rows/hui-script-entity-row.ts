import "@material/mwc-button/mwc-button";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  internalProperty,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import { UNAVAILABLE_STATES } from "../../../data/entity";
import { HomeAssistant } from "../../../types";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import "../components/hui-generic-entity-row";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import { ActionRowConfig, LovelaceRow } from "./types";
import { canExcecute, ScriptEntity } from "../../../data/script";

@customElement("hui-script-entity-row")
class HuiScriptEntityRow extends LitElement implements LovelaceRow {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @internalProperty() private _config?: ActionRowConfig;

  public setConfig(config: ActionRowConfig): void {
    if (!config) {
      throw new Error("Configuration error");
    }
    this._config = config;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return hasConfigOrEntityChanged(this, changedProps);
  }

  protected render(): TemplateResult {
    if (!this._config || !this.hass) {
      return html``;
    }

    const stateObj = this.hass.states[this._config.entity] as ScriptEntity;

    if (!stateObj) {
      return html`
        <hui-warning>
          ${createEntityNotFoundWarning(this.hass, this._config.entity)}
        </hui-warning>
      `;
    }

    return html`
      <hui-generic-entity-row .hass=${this.hass} .config=${this._config}>
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
              ${this._config.action_name ||
              this.hass!.localize("ui.card.script.execute")}
            </mwc-button>`
          : ""}
      </hui-generic-entity-row>
    `;
  }

  static get styles(): CSSResult {
    return css`
      mwc-button:last-child {
        margin-right: -0.57em;
      }
    `;
  }

  private _cancelScript(ev): void {
    ev.stopPropagation();
    this._callService("turn_off");
  }

  private _executeScript(ev): void {
    ev.stopPropagation();
    this._callService("turn_on");
  }

  private _callService(service: string): void {
    this.hass!.callService("script", service, {
      entity_id: this._config!.entity,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-script-entity-row": HuiScriptEntityRow;
  }
}

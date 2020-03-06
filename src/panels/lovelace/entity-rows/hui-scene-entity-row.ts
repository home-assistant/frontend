import {
  html,
  LitElement,
  TemplateResult,
  CSSResult,
  css,
  property,
  customElement,
  PropertyValues,
} from "lit-element";

import "../components/hui-generic-entity-row";
import "../../../components/entity/ha-entity-toggle";
import "../components/hui-warning";

import { HomeAssistant } from "../../../types";
import { LovelaceRow, ActionRowConfig } from "./types";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import { activateScene } from "../../../data/scene";

@customElement("hui-scene-entity-row")
class HuiSceneEntityRow extends LitElement implements LovelaceRow {
  @property() public hass!: HomeAssistant;

  @property() private _config?: ActionRowConfig;

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

    const stateObj = this.hass.states[this._config.entity];

    if (!stateObj) {
      return html`
        <hui-warning
          >${this.hass.localize(
            "ui.panel.lovelace.warning.entity_not_found",
            "entity",
            this._config.entity
          )}</hui-warning
        >
      `;
    }

    return html`
      <hui-generic-entity-row .hass=${this.hass} .config=${this._config}>
        <mwc-button @click="${this._callService}" class="text-content">
          ${this._config.action_name ||
            this.hass!.localize("ui.card.scene.activate")}
        </mwc-button>
      </hui-generic-entity-row>
    `;
  }

  static get styles(): CSSResult {
    return css`
      mwc-button {
        margin-right: -0.57em;
      }
    `;
  }

  private _callService(ev: Event): void {
    ev.stopPropagation();
    activateScene(this.hass, this._config!.entity);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-scene-entity-row": HuiSceneEntityRow;
  }
}

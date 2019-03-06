import {
  html,
  LitElement,
  TemplateResult,
  property,
  CSSResult,
  css,
  customElement,
} from "lit-element";

import "../components/hui-generic-entity-row";
import "../components/hui-warning";

import computeStateDisplay from "../../../common/entity/compute_state_display";

import { HomeAssistant } from "../../../types";
import { EntityRow, EntityConfig } from "./types";
import { longPress } from "../common/directives/long-press-directive";
import { handleClick } from "../common/handle-click";

@customElement("hui-text-entity-row")
class HuiTextEntityRow extends LitElement implements EntityRow {
  @property() public hass?: HomeAssistant;

  @property() private _config?: EntityConfig;

  public setConfig(config: EntityConfig): void {
    if (!config) {
      throw new Error("Configuration error");
    }
    this._config = config;
  }

  protected render(): TemplateResult | void {
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
      <hui-generic-entity-row
        .hass="${this.hass}"
        .config="${this._config}"
        @ha-click="${this._handleTap}"
        @ha-hold="${this._handleHold}"
        .longPress="${longPress()}"
      >
        <div>
          ${computeStateDisplay(
            this.hass!.localize,
            stateObj,
            this.hass.language
          )}
        </div>
      </hui-generic-entity-row>
    `;
  }

  static get styles(): CSSResult {
    return css`
      div {
        text-align: right;
      }
    `;
  }

  private _handleTap() {
    handleClick(this, this.hass!, this._config!, false);
  }

  private _handleHold() {
    handleClick(this, this.hass!, this._config!, true);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-text-entity-row": HuiTextEntityRow;
  }
}

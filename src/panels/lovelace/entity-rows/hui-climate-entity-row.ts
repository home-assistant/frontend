import {
  html,
  LitElement,
  TemplateResult,
  property,
  css,
  CSSResult,
  customElement,
  PropertyValues,
} from "lit-element";

import "../../../components/ha-climate-state";
import "../components/hui-generic-entity-row";
import "../components/hui-warning";

import { HomeAssistant } from "../../../types";
import { LovelaceRow, EntityConfig } from "./types";
import { hasConfigOrEntityChanged } from "../common/has-changed";

@customElement("hui-climate-entity-row")
class HuiClimateEntityRow extends LitElement implements LovelaceRow {
  @property() public hass?: HomeAssistant;

  @property() private _config?: EntityConfig;

  public setConfig(config: EntityConfig): void {
    if (!config || !config.entity) {
      throw new Error("Invalid Configuration: 'entity' required");
    }

    this._config = config;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return hasConfigOrEntityChanged(this, changedProps);
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
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
      <hui-generic-entity-row .hass="${this.hass}" .config="${this._config}">
        <ha-climate-state
          .hass="${this.hass}"
          .stateObj="${stateObj}"
        ></ha-climate-state>
      </hui-generic-entity-row>
    `;
  }

  static get styles(): CSSResult {
    return css`
      ha-climate-state {
        text-align: right;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-climate-entity-row": HuiClimateEntityRow;
  }
}

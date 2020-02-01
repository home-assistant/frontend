import {
  html,
  LitElement,
  TemplateResult,
  property,
  CSSResult,
  css,
  customElement,
  PropertyValues,
} from "lit-element";

import "../components/hui-generic-entity-row";
import "../components/hui-warning";

import { HomeAssistant } from "../../../types";
import { LovelaceRow, AttributeRowConfig } from "../entity-rows/types";
import { hasConfigOrEntityChanged } from "../common/has-changed";

@customElement("hui-attribute-row")
class HuiAttributeRow extends LitElement implements LovelaceRow {
  @property() public hass?: HomeAssistant;
  @property() private _config?: AttributeRowConfig;

  public setConfig(config: AttributeRowConfig): void {
    if (!config) {
      throw new Error("Configuration error");
    }
    if (!config.entity) {
      throw new Error("entity not defined");
    }
    if (!config.attribute) {
      throw new Error("attribute not defined");
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
    const attribute = stateObj.attributes[this._config.attribute];

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

    if (!attribute && !this._config.default) {
      return html`
        <hui-warning
          >${this.hass.localize(
            "ui.panel.lovelace.warning.attribute_not_found",
            "attribute",
            this._config.attribute
          )}</hui-warning
        >
      `;
    }

    return html`
      <hui-generic-entity-row .hass=${this.hass} .config=${this._config}>
        <div>
          ${this._config.prefix} ${attribute || this._config.default}
          ${this._config.suffix}
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
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-attribute-row": HuiAttributeRow;
  }
}

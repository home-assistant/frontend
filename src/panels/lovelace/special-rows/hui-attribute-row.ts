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
      throw new Error("Entity not defined");
    }
    if (!config.attribute) {
      throw new Error("Attribute not defined");
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

    return html`
      <hui-generic-entity-row .hass=${this.hass} .config=${this._config}>
        ${attribute
          ? html`
              <div>
                ${this._config.prefix} ${attribute} ${this._config.suffix}
              </div>
            `
          : html`
              <span>-</span>
            `}
      </hui-generic-entity-row>
    `;
  }

  static get styles(): CSSResult {
    return css`
      div {
        text-align: right;
      }
      span {
        padding-right: 16px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-attribute-row": HuiAttributeRow;
  }
}

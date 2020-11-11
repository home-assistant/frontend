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

import { HomeAssistant } from "../../../types";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import { AttributeRowConfig, LovelaceRow } from "../entity-rows/types";
import { createEntityNotFoundWarning } from "../components/hui-warning";

import "../components/hui-timestamp-display";
import "../components/hui-generic-entity-row";

@customElement("hui-attribute-row")
class HuiAttributeRow extends LitElement implements LovelaceRow {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @internalProperty() private _config?: AttributeRowConfig;

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
        <hui-warning>
          ${createEntityNotFoundWarning(this.hass, this._config.entity)}
        </hui-warning>
      `;
    }

    return html`
      <hui-generic-entity-row .hass=${this.hass} .config=${this._config}>
        <div>
          ${this._config.prefix}
          ${this._config.format
            ? html`
                <hui-timestamp-display
                  .hass=${this.hass}
                  .ts=${new Date(attribute)}
                  .format=${this._config.format}
                ></hui-timestamp-display>
              `
            : attribute || "-"}
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

import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  TemplateResult,
} from "lit-element";
import { styleMap } from "lit-html/directives/style-map";
import { HomeAssistant } from "../../../types";
import { DividerConfig, LovelaceRow } from "../entity-rows/types";

@customElement("hui-divider-row")
class HuiDividerRow extends LitElement implements LovelaceRow {
  public hass?: HomeAssistant;

  @internalProperty() private _config?: DividerConfig;

  public setConfig(config): void {
    if (!config) {
      throw new Error("Error in card configuration.");
    }

    this._config = config;
  }

  protected render(): TemplateResult {
    if (!this._config) {
      return html``;
    }

    return html`<div style=${styleMap(this._config.style)}></div>`;
  }

  static get styles(): CSSResult {
    return css`
      div {
        height: 1px;
        background-color: var(--entities-divider-color, var(--divider-color));
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-divider-row": HuiDividerRow;
  }
}

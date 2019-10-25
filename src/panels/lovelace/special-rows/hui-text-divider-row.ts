import {
  html,
  LitElement,
  TemplateResult,
  customElement,
  property,
  CSSResult,
  css,
} from "lit-element";

import { EntityRow, TextDividerConfig } from "../entity-rows/types";
import { HomeAssistant } from "../../../types";

@customElement("hui-text-divider-row")
class HuiTextDividerRow extends LitElement implements EntityRow {
  public hass?: HomeAssistant;

  @property() private _config?: TextDividerConfig;

  public setConfig(config): void {
    if (!config || !config.label) {
      throw new Error("Error in card configuration.");
    }

    this._config = config;
  }

  protected render(): TemplateResult | void {
    if (!this._config) {
      return html``;
    }

    return html`
      <h2 class="text-divider"><span>${this._config.label}</span></h2>
    `;
  }

  static get styles(): CSSResult {
    return css`
      .text-divider {
        margin: 1em 0;
        line-height: 0;
        text-align: center;
        white-space: nowrap;
        display: flex;
        align-items: center;
      }
      .text-divider span {
        padding: 1em;
        color: var(--secondary-text-color);
      }
      .text-divider:before,
      .text-divider:after {
        content: "";
        background: var(--secondary-text-color);
        display: block;
        height: 1px;
        width: 100%;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-text-divider-row": HuiTextDividerRow;
  }
}

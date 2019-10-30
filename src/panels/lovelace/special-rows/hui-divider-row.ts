import {
  html,
  LitElement,
  TemplateResult,
  customElement,
  property,
  CSSResult,
  css,
} from "lit-element";

import { EntityRow, DividerConfig } from "../entity-rows/types";
import { HomeAssistant } from "../../../types";
import { styleMap } from "lit-html/directives/style-map";

@customElement("hui-divider-row")
class HuiDividerRow extends LitElement implements EntityRow {
  public hass?: HomeAssistant;

  @property() private _config?: DividerConfig;

  public setConfig(config): void {
    if (!config) {
      throw new Error("Error in card configuration.");
    }

    this._config = {
      ...config,
    };
  }

  protected render(): TemplateResult | void {
    if (!this._config) {
      return html``;
    }

    const style = {};

    if (this._config.style) {
      Object.keys(this._config.style).forEach((prop) => {
        style[prop] = this._config!.style[prop];
      });
    }

    return html`
      <h2 class="text-divider" style=${styleMap(style)}>
        ${this._config.label
          ? html`
              <span>${this._config.label}</span>
            `
          : ""}
      </h2>
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
    "hui-divider-row": HuiDividerRow;
  }
}

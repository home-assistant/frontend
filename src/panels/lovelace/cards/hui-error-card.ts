import { safeDump } from "js-yaml";
import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  TemplateResult,
} from "lit-element";
import { HomeAssistant } from "../../../types";
import { LovelaceCard } from "../types";
import { ErrorCardConfig } from "./types";

@customElement("hui-error-card")
export class HuiErrorCard extends LitElement implements LovelaceCard {
  public hass?: HomeAssistant;

  @internalProperty() private _config?: ErrorCardConfig;

  public getCardSize(): number {
    return 4;
  }

  public setConfig(config: ErrorCardConfig): void {
    this._config = config;
  }

  protected render(): TemplateResult {
    if (!this._config) {
      return html``;
    }

    return html`
      ${this._config.error}
      ${this._config.origConfig
        ? html`<pre>${safeDump(this._config.origConfig)}</pre>`
        : ""}
    `;
  }

  static get styles(): CSSResult {
    return css`
      :host {
        display: block;
        background-color: var(--error-color);
        color: var(--color-on-error, white);
        padding: 8px;
        font-weight: 500;
        user-select: text;
        cursor: default;
      }
      pre {
        font-family: var(--code-font-family, monospace);
        text-overflow: ellipsis;
        overflow: hidden;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-error-card": HuiErrorCard;
  }
}

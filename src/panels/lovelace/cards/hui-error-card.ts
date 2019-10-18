import {
  html,
  LitElement,
  TemplateResult,
  customElement,
  property,
  css,
  CSSResult,
} from "lit-element";
import yaml from "js-yaml";

import { LovelaceCard } from "../types";
import { HomeAssistant } from "../../../types";
import { ErrorCardConfig } from "./types";

export const createErrorCardElement = (config) => {
  const el = document.createElement("hui-error-card");
  el.setConfig(config);
  return el;
};

export const createErrorCardConfig = (error, origConfig) => ({
  type: "error",
  error,
  origConfig,
});

@customElement("hui-error-card")
export class HuiErrorCard extends LitElement implements LovelaceCard {
  public hass?: HomeAssistant;

  @property() private _config?: ErrorCardConfig;

  public getCardSize(): number {
    return 4;
  }

  public setConfig(config: ErrorCardConfig): void {
    this._config = config;
  }

  protected render(): TemplateResult | void {
    if (!this._config) {
      return html``;
    }

    return html`
      ${this._config.error}
      <pre>${yaml.safeDump(this._config.origConfig)}</pre>
    `;
  }

  static get styles(): CSSResult {
    return css`
      :host {
        display: block;
        background-color: #ef5350;
        color: white;
        padding: 8px;
        font-weight: 500;
        user-select: text;
        cursor: default;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-error-card": HuiErrorCard;
  }
}

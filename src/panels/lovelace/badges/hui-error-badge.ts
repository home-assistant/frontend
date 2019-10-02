import {
  html,
  LitElement,
  TemplateResult,
  customElement,
  property,
  css,
  CSSResult,
} from "lit-element";

import { LovelaceBadge } from "../types";
import { LovelaceBadgeConfig } from "../../../data/lovelace";
import { HomeAssistant } from "../../../types";
import { ErrorBadgeConfig } from "./types";

export const createErrorBadgeElement = (config) => {
  const el = document.createElement("hui-error-badge");
  el.setConfig(config);
  return el;
};

export const createErrorBadgeConfig = (error, origConfig) => ({
  type: "error",
  error,
  origConfig,
});

@customElement("hui-error-badge")
export class HuiErrorBadge extends LitElement implements LovelaceBadge {
  public hass?: HomeAssistant;

  @property() private _config?: ErrorBadgeConfig;

  public setConfig(config: ErrorBadgeConfig): void {
    this._config = config;
  }

  protected render(): TemplateResult | void {
    if (!this._config) {
      return html``;
    }

    return html`
      ${this._config.error}
      <pre>${this._toStr(this._config.origConfig)}</pre>
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

  private _toStr(config: LovelaceBadgeConfig): string {
    return JSON.stringify(config, null, 2);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-error-badge": HuiErrorBadge;
  }
}

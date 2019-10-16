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
import { HomeAssistant } from "../../../types";
import { ErrorBadgeConfig } from "./types";

import "../../../components/ha-label-badge";

export const createErrorBadgeElement = (config) => {
  const el = document.createElement("hui-error-badge");
  el.setConfig(config);
  return el;
};

export const createErrorBadgeConfig = (error) => ({
  type: "error",
  error,
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
      <ha-label-badge
        label="Error"
        icon="hass:alert"
        description=${this._config.error}
      ></ha-label-badge>
    `;
  }

  static get styles(): CSSResult {
    return css`
      :host {
        --ha-label-badge-color: var(--label-badge-red, #fce588);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-error-badge": HuiErrorBadge;
  }
}

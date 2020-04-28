import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { HomeAssistant } from "../../../types";
import { LovelaceCard } from "../types";
import { ErrorCardConfig } from "./types";
import { until } from "lit-html/directives/until";

export const createErrorCardElement = (config: ErrorCardConfig) => {
  const el = document.createElement("hui-error-card");
  el.setConfig(config);
  return el;
};

export const createErrorCardConfig = (error, origConfig) => ({
  type: "error",
  error,
  origConfig,
});

let jsYamlPromise: Promise<typeof import("js-yaml")>;

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

  protected render(): TemplateResult {
    if (!this._config) {
      return html``;
    }

    return html`
      ${this._config.error}
      ${this._config.origConfig
        ? html`${this._renderConfig(this._config.origConfig)}`
        : ""}
    `;
  }

  private _renderConfig(config) {
    if (!jsYamlPromise) {
      jsYamlPromise = import(/* webpackChunkName: "js-yaml" */ "js-yaml");
    }
    const yaml = jsYamlPromise.then((jsYaml) => jsYaml.safeDump(config));
    return html` <pre>${until(yaml, "")}</pre> `;
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

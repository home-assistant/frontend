import { html, LitElement } from "@polymer/lit-element";

import { LovelaceCard } from "../types";
import { LovelaceCardConfig } from "../../../data/lovelace";
import { TemplateResult } from "lit-html";

interface Config extends LovelaceCardConfig {
  error: string;
  origConfig: LovelaceCardConfig;
}

class HuiErrorCard extends LitElement implements LovelaceCard {
  private _config?: Config;

  static get properties() {
    return {
      _config: {},
    };
  }

  public getCardSize(): number {
    return 4;
  }

  public setConfig(config: Config): void {
    this._config = config;
  }

  protected render(): TemplateResult {
    if (!this._config) {
      return html``;
    }

    return html`
      ${this.renderStyle()} ${this._config.error}
      <pre>${this._toStr(this._config.origConfig)}</pre>
    `;
  }

  private renderStyle(): TemplateResult {
    return html`
      <style>
        :host {
          display: block;
          background-color: #ef5350;
          color: white;
          padding: 8px;
          font-weight: 500;
        }
      </style>
    `;
  }

  private _toStr(config: LovelaceCardConfig): string {
    return JSON.stringify(config, null, 2);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-error-card": HuiErrorCard;
  }
}

customElements.define("hui-error-card", HuiErrorCard);

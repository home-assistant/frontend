import { html, LitElement } from "@polymer/lit-element";

import { LovelaceCard, LovelaceConfig } from "../types";
import { TemplateResult } from "lit-html";

interface Config extends LovelaceConfig {
  error: string;
  origConfig: LovelaceConfig;
}

class HuiErrorCard extends LitElement implements LovelaceCard {
  protected config?: Config;

  static get properties() {
    return {
      config: {},
    };
  }

  public getCardSize(): number {
    return 4;
  }

  public setConfig(config): void {
    this.config = config;
  }

  protected render(): TemplateResult {
    if (!this.config) {
      return html``;
    }

    return html`
      ${this.renderStyle()}
      ${this.config.error}
      <pre>${this._toStr(this.config.origConfig)}</pre>
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

  private _toStr(config: LovelaceConfig): string {
    return JSON.stringify(config, null, 2);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-error-card": HuiErrorCard;
  }
}

customElements.define("hui-error-card", HuiErrorCard);

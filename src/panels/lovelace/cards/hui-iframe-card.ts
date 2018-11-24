import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";

import "../../../components/ha-card";

import { LovelaceCard, LovelaceCardConfig } from "../types";
import { TemplateResult } from "lit-html";
import { styleMap } from "lit-html/directives/styleMap";

interface Config extends LovelaceCardConfig {
  aspect_ratio?: string;
  title?: string;
  url: string;
}

export class HuiIframeCard extends LitElement implements LovelaceCard {
  protected _config?: Config;

  static get properties(): PropertyDeclarations {
    return {
      _config: {},
    };
  }

  public getCardSize(): number {
    return 1 + this.offsetHeight / 50;
  }

  public setConfig(config: Config): void {
    if (!config.url) {
      throw new Error("URL required");
    }

    this._config = config;
  }

  protected render(): TemplateResult {
    if (!this._config) {
      return html``;
    }

    const aspectRatio = this._config.aspect_ratio || "50%";

    return html`
      ${this.renderStyle()}
      <ha-card .header="${this._config.title}">
        <div
          id="root"
          style="${
            styleMap({
              "padding-top": aspectRatio,
            })
          }"
        >
          <iframe src="${this._config.url}"></iframe>
        </div>
      </ha-card>
    `;
  }

  private renderStyle(): TemplateResult {
    return html`
      <style>
        ha-card {
          overflow: hidden;
        }
        #root {
          width: 100%;
          position: relative;
          padding-top: ${this._config!.aspect_ratio || "50%"};
        }
        iframe {
          position: absolute;
          border: none;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
        }
      </style>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-iframe-card": HuiIframeCard;
  }
}

customElements.define("hui-iframe-card", HuiIframeCard);

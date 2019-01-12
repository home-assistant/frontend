import {
  html,
  LitElement,
  PropertyDeclarations,
  TemplateResult,
} from "lit-element";

import "../../../components/ha-card";

import { LovelaceCard, LovelaceCardEditor } from "../types";
import { LovelaceCardConfig } from "../../../data/lovelace";
import { styleMap } from "lit-html/directives/style-map";

export interface Config extends LovelaceCardConfig {
  aspect_ratio?: string;
  title?: string;
  url: string;
}

export class HuiIframeCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import(/* webpackChunkName: "hui-iframe-card-editor" */ "../editor/config-elements/hui-iframe-card-editor");
    return document.createElement("hui-iframe-card-editor");
  }
  public static getStubConfig(): object {
    return { url: "https://www.home-assistant.io", aspect_ratio: "50%" };
  }

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

  protected render(): TemplateResult | void {
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

import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { classMap } from "lit-html/directives/classMap";

import "../../../components/ha-card";
import "../../../components/ha-markdown";

import { LovelaceCard, LovelaceConfig } from "../types";
import { TemplateResult } from "lit-html";

interface Config extends LovelaceConfig {
  content: string;
  title?: string;
}

export class HuiMarkdownCard extends LitElement implements LovelaceCard {
  private _config?: Config;

  static get properties(): PropertyDeclarations {
    return {
      _config: {},
    };
  }

  public getCardSize(): number {
    return this._config!.content.split("\n").length;
  }

  public setConfig(config: Config): void {
    if (!config.content) {
      throw new Error("Invalid Configuration: Content Required");
    }

    this._config = config;
  }

  protected render(): TemplateResult {
    if (!this._config) {
      return html``;
    }

    return html`
      ${this.renderStyle()}
      <ha-card .header="${this._config.title}">
        <ha-markdown
          class="markdown ${
            classMap({
              "no-header": !this._config.title,
            })
          }"
          .content="${this._config.content}"
        ></ha-markdown>
      </ha-card>
    `;
  }

  private renderStyle(): TemplateResult {
    return html`
      <style>
        :host {
          @apply --paper-font-body1;
        }
        ha-markdown {
          display: block;
          padding: 0 16px 16px;
          -ms-user-select: initial;
          -webkit-user-select: initial;
          -moz-user-select: initial;
        }
        .markdown.no-header {
          padding-top: 16px;
        }
        ha-markdown > *:first-child {
          margin-top: 0;
        }
        ha-markdown > *:last-child {
          margin-bottom: 0;
        }
        ha-markdown a {
          color: var(--primary-color);
        }
        ha-markdown img {
          max-width: 100%;
        }
      </style>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-markdown-card": HuiMarkdownCard;
  }
}

customElements.define("hui-markdown-card", HuiMarkdownCard);

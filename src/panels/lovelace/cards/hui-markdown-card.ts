import { html, LitElement } from "@polymer/lit-element";
import { classMap } from "lit-html/directives/classMap.js";

import "../../../components/ha-card.js";
import "../../../components/ha-markdown.js";

import { LovelaceCard, LovelaceConfig } from "../types.js";

interface Config extends LovelaceConfig {
  content: string;
  title?: string;
}

export class HuiMarkdownCard extends LitElement
  implements LovelaceCard {
  protected config?: Config;

  static get properties() {
    return {
      config: {},
    };
  }

  public getCardSize() {
    return this.config!.content.split("\n").length;
  }

  public setConfig(config: Config) {
    if (!config.content) {
      throw new Error("Invalid Configuration: Content Required");
    }

    this.config = config;
  }

  protected render() {
    if (!this.config) {
      return html``;
    }

    return html`
      ${this.renderStyle()}
      <ha-card .header="${this.config.title}">
        <ha-markdown
          class="markdown ${classMap({
            "no-header": !this.config.title,
          })}"
          .content="${this.config.content}"
        ></ha-markdown>
      </ha-card>
    `;
  }

  private renderStyle() {
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

import {
  html,
  LitElement,
  TemplateResult,
  customElement,
  property,
  css,
  CSSResult,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";

import "../../../components/ha-card";
import "../../../components/ha-markdown";

import { LovelaceCard, LovelaceCardEditor } from "../types";
import { MarkdownCardConfig } from "./types";

@customElement("hui-markdown-card")
export class HuiMarkdownCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import(/* webpackChunkName: "hui-markdown-card-editor" */ "../editor/config-elements/hui-markdown-card-editor");
    return document.createElement("hui-markdown-card-editor");
  }

  public static getStubConfig(): object {
    return { content: " " };
  }

  @property() private _config?: MarkdownCardConfig;

  public getCardSize(): number {
    return (
      this._config!.content.split("\n").length + (this._config!.title ? 1 : 0)
    );
  }

  public setConfig(config: MarkdownCardConfig): void {
    if (!config.content) {
      throw new Error("Invalid Configuration: Content Required");
    }

    this._config = config;
  }

  protected render(): TemplateResult | void {
    if (!this._config) {
      return html``;
    }

    return html`
      <ha-card .header="${this._config.title}">
        <ha-markdown
          class="markdown ${classMap({
            "no-header": !this._config.title,
          })}"
          .content="${this._config.content}"
        ></ha-markdown>
      </ha-card>
    `;
  }

  static get styles(): CSSResult {
    return css`
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
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-markdown-card": HuiMarkdownCard;
  }
}

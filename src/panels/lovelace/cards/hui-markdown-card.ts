import { UnsubscribeFunc } from "home-assistant-js-websocket";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import "../../../components/ha-card";
import "../../../components/ha-markdown";
import { subscribeRenderTemplate } from "../../../data/ws-templates";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCard, LovelaceCardEditor } from "../types";
import type { MarkdownCardConfig } from "./types";

@customElement("hui-markdown-card")
export class HuiMarkdownCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import(
      /* webpackChunkName: "hui-markdown-card-editor" */ "../editor/config-elements/hui-markdown-card-editor"
    );
    return document.createElement("hui-markdown-card-editor");
  }

  public static getStubConfig(): MarkdownCardConfig {
    return {
      type: "markdown",
      content:
        "The **Markdown** card allows you to write any text. You can style it **bold**, *italicized*, ~strikethrough~ etc. You can do images, links, and more.\n\nFor more information see the [Markdown Cheatsheet](https://commonmark.org/help).",
    };
  }

  @property() public hass?: HomeAssistant;

  @property() private _config?: MarkdownCardConfig;

  @property() private _content = "";

  @property() private _unsubRenderTemplate?: Promise<UnsubscribeFunc>;

  public getCardSize(): number {
    return this._config === undefined
      ? 3
      : this._config.card_size === undefined
      ? this._config.content.split("\n").length + (this._config.title ? 1 : 0)
      : this._config.card_size;
  }

  public setConfig(config: MarkdownCardConfig): void {
    if (!config.content) {
      throw new Error("Invalid Configuration: Content Required");
    }

    if (this._config?.content !== config.content) {
      this._tryDisconnect();
    }
    this._config = config;
  }

  public connectedCallback() {
    super.connectedCallback();
    this._tryConnect();
  }

  public disconnectedCallback() {
    this._tryDisconnect();
  }

  protected render(): TemplateResult {
    if (!this._config) {
      return html``;
    }

    return html`
      <ha-card .header="${this._config.title}">
        <ha-markdown
          breaks
          class="markdown ${classMap({
            "no-header": !this._config.title,
          })}"
          .content="${this._content}"
        ></ha-markdown>
      </ha-card>
    `;
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (!this._config || !this.hass) {
      return;
    }

    this._tryConnect();

    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    const oldConfig = changedProps.get("_config") as
      | MarkdownCardConfig
      | undefined;

    if (
      !oldHass ||
      !oldConfig ||
      oldHass.themes !== this.hass.themes ||
      oldConfig.theme !== this._config.theme
    ) {
      applyThemesOnElement(this, this.hass.themes, this._config.theme);
    }
  }

  private async _tryConnect(): Promise<void> {
    if (
      this._unsubRenderTemplate !== undefined ||
      !this.hass ||
      !this._config
    ) {
      return;
    }

    this._unsubRenderTemplate = subscribeRenderTemplate(
      this.hass.connection,
      (result) => {
        this._content = result;
      },
      {
        template: this._config.content,
        entity_ids: this._config.entity_id,
        variables: {
          config: this._config,
          user: this.hass.user!.name,
        },
      }
    );
    this._unsubRenderTemplate.catch(() => {
      this._content = this._config!.content;
      this._unsubRenderTemplate = undefined;
    });
  }

  private async _tryDisconnect(): Promise<void> {
    if (!this._unsubRenderTemplate) {
      return;
    }

    try {
      const unsub = await this._unsubRenderTemplate;
      this._unsubRenderTemplate = undefined;
      unsub();
    } catch (e) {
      if (e.code === "not_found") {
        // If we get here, the connection was probably already closed. Ignore.
      } else {
        throw e;
      }
    }
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

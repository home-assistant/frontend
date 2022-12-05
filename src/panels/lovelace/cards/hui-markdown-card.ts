import { UnsubscribeFunc } from "home-assistant-js-websocket";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import "../../../components/ha-card";
import "../../../components/ha-markdown";
import {
  RenderTemplateResult,
  subscribeRenderTemplate,
} from "../../../data/ws-templates";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCard, LovelaceCardEditor } from "../types";
import type { MarkdownCardConfig } from "./types";

@customElement("hui-markdown-card")
export class HuiMarkdownCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("../editor/config-elements/hui-markdown-card-editor");
    return document.createElement("hui-markdown-card-editor");
  }

  public static getStubConfig(): MarkdownCardConfig {
    return {
      type: "markdown",
      content:
        "The **Markdown** card allows you to write any text. You can style it **bold**, *italicized*, ~strikethrough~ etc. You can do images, links, and more.\n\nFor more information see the [Markdown Cheatsheet](https://commonmark.org/help).",
    };
  }

  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: MarkdownCardConfig;

  @state() private _templateResult?: RenderTemplateResult;

  @state() private _unsubRenderTemplate?: Promise<UnsubscribeFunc>;

  public getCardSize(): number {
    return this._config === undefined
      ? 3
      : this._config.card_size === undefined
      ? Math.round(this._config.content.split("\n").length / 2) +
        (this._config.title ? 1 : 0)
      : this._config.card_size;
  }

  public setConfig(config: MarkdownCardConfig): void {
    if (!config.content) {
      throw new Error("Content required");
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
      <ha-card .header=${this._config.title}>
        <ha-markdown
          breaks
          class=${classMap({
            "no-header": !this._config.title,
          })}
          .content=${this._templateResult?.result}
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

    try {
      this._unsubRenderTemplate = subscribeRenderTemplate(
        this.hass.connection,
        (result) => {
          this._templateResult = result;
        },
        {
          template: this._config.content,
          entity_ids: this._config.entity_id,
          variables: {
            config: this._config,
            user: this.hass.user!.name,
          },
          strict: true,
        }
      );
    } catch (_err) {
      this._templateResult = {
        result: this._config!.content,
        listeners: { all: false, domains: [], entities: [], time: false },
      };
      this._unsubRenderTemplate = undefined;
    }
  }

  private async _tryDisconnect(): Promise<void> {
    if (!this._unsubRenderTemplate) {
      return;
    }

    try {
      const unsub = await this._unsubRenderTemplate;
      unsub();
      this._unsubRenderTemplate = undefined;
    } catch (err: any) {
      if (err.code === "not_found") {
        // If we get here, the connection was probably already closed. Ignore.
      } else {
        throw err;
      }
    }
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-card {
        height: 100%;
      }
      ha-markdown {
        padding: 0 16px 16px;
        word-wrap: break-word;
      }
      ha-markdown.no-header {
        padding-top: 16px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-markdown-card": HuiMarkdownCard;
  }
}

import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import hash from "object-hash";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-alert";
import "../../../components/ha-card";
import "../../../components/ha-markdown";
import type { RenderTemplateResult } from "../../../data/ws-templates";
import { subscribeRenderTemplate } from "../../../data/ws-templates";
import type { HomeAssistant } from "../../../types";
import { CacheManager } from "../../../util/cache-manager";
import type { LovelaceCard, LovelaceCardEditor } from "../types";
import type { MarkdownCardConfig } from "./types";

const templateCache = new CacheManager<RenderTemplateResult>(1000);

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

  @property({ type: Boolean }) public preview = false;

  @state() private _config?: MarkdownCardConfig;

  @state() private _error?: string;

  @state() private _errorLevel?: "ERROR" | "WARNING";

  @state() private _templateResult?: RenderTemplateResult;

  private _unsubRenderTemplate?: Promise<UnsubscribeFunc>;

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

  private _computeCacheKey() {
    return hash(this._config);
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._tryDisconnect();

    if (this._config && this._templateResult) {
      const key = this._computeCacheKey();
      templateCache.set(key, this._templateResult);
    }
  }

  protected willUpdate(_changedProperties: PropertyValues): void {
    super.willUpdate(_changedProperties);
    if (!this._config) {
      return;
    }

    if (!this._templateResult) {
      const key = this._computeCacheKey();
      if (templateCache.has(key)) {
        this._templateResult = templateCache.get(key);
      }
    }
  }

  protected render() {
    if (!this._config) {
      return nothing;
    }

    return html`
      ${this._error
        ? html`
            <ha-alert
              .alertType=${(this._errorLevel?.toLowerCase() as
                | "error"
                | "warning") || "error"}
            >
              ${this._error}
            </ha-alert>
          `
        : nothing}
      <ha-card
        .header=${!this._config.text_only ? this._config.title : undefined}
        class=${classMap({
          "with-header": !!this._config.title,
          "text-only": this._config.text_only ?? false,
        })}
      >
        <ha-markdown
          cache
          breaks
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

    if (changedProps.has("_config")) {
      this._tryConnect();
    }
    const shouldBeHidden =
      !!this._templateResult &&
      this._config.show_empty === false &&
      this._templateResult.result.length === 0;
    if (shouldBeHidden !== this.hidden) {
      this.style.display = shouldBeHidden ? "none" : "";
      this.toggleAttribute("hidden", shouldBeHidden);
      fireEvent(this, "card-visibility-changed", { value: !shouldBeHidden });
    }
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

    this._error = undefined;
    this._errorLevel = undefined;

    try {
      this._unsubRenderTemplate = subscribeRenderTemplate(
        this.hass.connection,
        (result) => {
          if ("error" in result) {
            // We show the latest error, or a warning if there are no errors
            if (result.level === "ERROR" || this._errorLevel !== "ERROR") {
              this._error = result.error;
              this._errorLevel = result.level;
            }
            return;
          }
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
          report_errors: this.preview,
        }
      );
      await this._unsubRenderTemplate;
    } catch (e: any) {
      if (this.preview) {
        this._error = e.message;
        this._errorLevel = undefined;
      }
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

    this._unsubRenderTemplate.then((unsub) => unsub()).catch(/* ignore */);
    this._unsubRenderTemplate = undefined;
    this._error = undefined;
    this._errorLevel = undefined;
  }

  static styles = css`
    ha-card {
      height: 100%;
      overflow-y: auto;
    }
    ha-alert {
      margin-bottom: 8px;
    }
    ha-markdown {
      padding: 16px;
      word-wrap: break-word;
      text-align: var(--card-text-align, inherit);
    }
    .with-header ha-markdown {
      padding: 0 16px 16px;
    }
    .text-only {
      background: none;
      box-shadow: none;
      border: none;
    }
    .text-only ha-markdown {
      padding: 2px 4px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-markdown-card": HuiMarkdownCard;
  }
}

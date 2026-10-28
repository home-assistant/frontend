import type { Connection, UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import hash from "object-hash";
import { consume } from "../../../common/decorators/consume";
import { transform } from "../../../common/decorators/transform";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-alert";
import "../../../components/ha-card";
import "../../../components/ha-markdown";
import "../../../components/ha-ripple";
import {
  configContext,
  connectionContext,
  uiContext,
} from "../../../data/context";
import type { Themes } from "../../../data/ws-themes";
import type { RenderTemplateResult } from "../../../data/ws-templates";
import { subscribeRenderTemplate } from "../../../data/ws-templates";
import type {
  CurrentUser,
  HomeAssistantConfig,
  HomeAssistantConnection,
  HomeAssistantUI,
} from "../../../types";
import { CacheManager } from "../../../util/cache-manager";
import type { LovelaceCard, LovelaceCardEditor } from "../types";
import type { MarkdownCardConfig } from "./types";
import type { ActionHandlerEvent } from "../../../data/lovelace/action_handler";
import { actionHandler } from "../common/directives/action-handler-directive";
import { hasAction } from "../common/has-action";

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

  @property({ type: Boolean }) public preview = false;

  @state()
  @consume({ context: connectionContext, subscribe: true })
  @transform<HomeAssistantConnection, Connection>({
    transformer: ({ connection }) => connection,
  })
  private _connection?: Connection;

  @state()
  @consume({ context: configContext, subscribe: true })
  @transform<HomeAssistantConfig, CurrentUser | undefined>({
    transformer: ({ user }) => user,
  })
  private _user?: CurrentUser;

  @state()
  @consume({ context: uiContext, subscribe: true })
  @transform<HomeAssistantUI, Themes>({
    transformer: ({ themes }) => themes,
  })
  private _themes!: Themes;

  @state() private _config?: MarkdownCardConfig;

  @state() private _error?: string;

  @state() private _errorLevel?: "ERROR" | "WARNING";

  @state() private _templateResult?: RenderTemplateResult;

  private _unsubRenderTemplate?: Promise<UnsubscribeFunc>;

  private _subscribedTo?: { connection: Connection; user?: string };

  public getCardSize(): number {
    return this._config === undefined
      ? 3
      : this._config.card_size === undefined
        ? Math.round(this._config.content.split("\n").length / 2) +
          (this._config.title ? 1 : 0)
        : this._config.card_size;
  }

  private get _interactive() {
    return (
      hasAction(this._config?.tap_action) ||
      hasAction(this._config?.hold_action) ||
      hasAction(this._config?.double_tap_action)
    );
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

  protected willUpdate(_changedProperties: PropertyValues<this>): void {
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
    const safeHandleAction = this._interactive ? this._handleAction : undefined;
    const safeActionHandler = this._interactive
      ? actionHandler({
          hasHold: hasAction(this._config.hold_action),
          hasDoubleClick: hasAction(this._config.double_tap_action),
        })
      : undefined;
    return html`
      ${
        this._error
          ? html`
              <ha-alert
                .alertType=${
                  (this._errorLevel?.toLowerCase() as "error" | "warning") ||
                  "error"
                }
              >
                ${this._error}
              </ha-alert>
            `
          : nothing
      }
      <ha-card
        .header=${!this._config.text_only ? this._config.title : undefined}
        class=${classMap({
          "with-header": !!this._config.title,
          "text-only": this._config.text_only ?? false,
          action: this._interactive,
        })}
        tabindex=${ifDefined(this._interactive ? "0" : undefined)}
        role=${ifDefined(this._interactive ? "button" : undefined)}
        @action=${safeHandleAction}
        .actionHandler=${safeActionHandler}
      >
        ${
          this._interactive
            ? html`<div
                class="background"
                @focus=${this._handleFocus}
                @blur=${this._handleBlur}
              >
                <ha-ripple></ha-ripple>
              </div>`
            : nothing
        }
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
    if (!this._config) {
      return;
    }

    // The first context values arrive before connectedCallback() subscribes,
    // so only drop a subscription when the connection or user it was made
    // with differs. _tryConnect() keeps a live subscription and retries a
    // missing one.
    if (
      this._subscribedTo !== undefined &&
      (this._subscribedTo.connection !== this._connection ||
        this._subscribedTo.user !== this._user?.name)
    ) {
      this._tryDisconnect();
    }
    if (
      changedProps.has("_config") ||
      changedProps.has("_connection") ||
      changedProps.has("_user")
    ) {
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
    if (!this._themes) {
      return;
    }
    const oldThemes = changedProps.get("_themes") as Themes | undefined;
    const oldConfig = changedProps.get("_config") as
      MarkdownCardConfig | undefined;

    if (
      !oldThemes ||
      !oldConfig ||
      oldThemes !== this._themes ||
      oldConfig.theme !== this._config.theme
    ) {
      applyThemesOnElement(this, this._themes, this._config.theme);
    }
  }

  private async _tryConnect(): Promise<void> {
    if (
      this._unsubRenderTemplate !== undefined ||
      !this._connection ||
      !this._config
    ) {
      return;
    }

    this._error = undefined;
    this._errorLevel = undefined;
    this._subscribedTo = {
      connection: this._connection,
      user: this._user?.name,
    };

    try {
      this._unsubRenderTemplate = subscribeRenderTemplate(
        this._connection,
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
            user: this._user?.name,
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
      this._subscribedTo = undefined;
    }
  }

  private async _tryDisconnect(): Promise<void> {
    if (!this._unsubRenderTemplate) {
      return;
    }

    this._unsubRenderTemplate.then((unsub) => unsub()).catch(/* ignore */);
    this._unsubRenderTemplate = undefined;
    this._subscribedTo = undefined;
    this._error = undefined;
    this._errorLevel = undefined;
  }

  private _handleAction(ev: ActionHandlerEvent) {
    fireEvent(this, "hass-action", {
      config: this._config!,
      action: ev.detail.action,
    });
  }

  private _handleFocus(ev: FocusEvent) {
    if ((ev.target as HTMLElement).matches(":focus-visible")) {
      this.setAttribute("focused", "");
    }
  }

  private _handleBlur() {
    this.removeAttribute("focused");
  }

  static styles = css`
    :host {
      -webkit-tap-highlight-color: transparent;
      --ha-ripple-hover-opacity: 0.04;
      --ha-ripple-pressed-opacity: 0.12;
    }
    ha-card {
      height: 100%;
      overflow-y: auto;
    }
    .background {
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      right: 0;
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
      backdrop-filter: none;
      box-shadow: none;
      border: none;
    }
    .text-only ha-markdown {
      padding: 2px 4px;
    }
    .action {
      cursor: pointer;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-markdown-card": HuiMarkdownCard;
  }
}

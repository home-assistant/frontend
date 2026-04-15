import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { computeCssColor } from "../../../common/color/compute-color";
import "../../../components/ha-card";
import "../../../components/tile/ha-tile-container";
import "../../../components/tile/ha-tile-icon";
import "../../../components/tile/ha-tile-info";
import {
  DEFAULT_NAVIGATION_PATH_INFO,
  subscribeNavigationPathInfo,
  type NavigationPathInfo,
} from "../../../data/compute-navigation-path-info";
import type { ActionHandlerEvent } from "../../../data/lovelace/action_handler";
import type { HomeAssistant } from "../../../types";
import { handleAction } from "../common/handle-action";
import { hasAction } from "../common/has-action";
import type {
  LovelaceCard,
  LovelaceCardEditor,
  LovelaceGridOptions,
} from "../types";
import { getShortcutCardDefaults } from "./hui-shortcut-card-defaults";
import { tileCardStyle } from "./tile/tile-card-style";
import type { ShortcutCardConfig } from "./types";

@customElement("hui-shortcut-card")
export class HuiShortcutCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("../editor/config-elements/hui-shortcut-card-editor");
    return document.createElement("hui-shortcut-card-editor");
  }

  public static getStubConfig(): ShortcutCardConfig {
    return {
      type: "shortcut",
      tap_action: {
        action: "navigate",
        navigation_path: "/home",
      },
    };
  }

  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: ShortcutCardConfig;

  private _navInfo: NavigationPathInfo = DEFAULT_NAVIGATION_PATH_INFO;

  private _unsubNavInfo?: UnsubscribeFunc;

  private _subscribedPath?: string;

  public setConfig(config: ShortcutCardConfig): void {
    this._config = {
      tap_action: {
        action: "none",
      },
      ...config,
    };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    if (this.hasUpdated) {
      this._updateNavInfo();
    }
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._unsubNavInfo?.();
    this._unsubNavInfo = undefined;
    this._subscribedPath = undefined;
  }

  public getCardSize(): number {
    return this._config?.vertical ? 2 : 1;
  }

  public getGridOptions(): LovelaceGridOptions {
    if (this._config?.vertical) {
      return {
        columns: 6,
        rows: 2,
        min_columns: 3,
        min_rows: 2,
      };
    }
    return {
      columns: 6,
      rows: 1,
      min_columns: 6,
      min_rows: 1,
    };
  }

  protected willUpdate(changedProps: PropertyValues): void {
    if (changedProps.has("hass") || changedProps.has("_config")) {
      this._updateNavInfo();
    }
  }

  private _updateNavInfo(): void {
    if (!this.hass) return;

    const action = this._config?.tap_action;
    const navPath =
      action?.action === "navigate" ? action.navigation_path : undefined;

    if (navPath === this._subscribedPath) return;

    this._unsubNavInfo?.();
    this._unsubNavInfo = undefined;
    this._subscribedPath = navPath;

    if (!navPath) {
      this._navInfo = DEFAULT_NAVIGATION_PATH_INFO;
      return;
    }

    this._unsubNavInfo = subscribeNavigationPathInfo(
      this.hass,
      navPath,
      (info) => {
        this._navInfo = info;
        this.requestUpdate();
      }
    );
  }

  private _handleAction(ev: ActionHandlerEvent) {
    handleAction(this, this.hass!, this._config!, ev.detail.action!);
  }

  private get _hasCardAction() {
    return (
      hasAction(this._config?.tap_action) ||
      hasAction(this._config?.hold_action) ||
      hasAction(this._config?.double_tap_action)
    );
  }

  protected render() {
    if (!this._config || !this.hass) {
      return nothing;
    }

    const defaults = getShortcutCardDefaults(
      this.hass,
      this._config.tap_action,
      this._navInfo
    );
    const label = this._config.label || defaults.label;
    const description = this._config.description;
    const icon = this._config.icon || defaults.icon;
    const iconPath = icon ? undefined : defaults.iconPath;

    const color = this._config.color
      ? computeCssColor(this._config.color)
      : undefined;

    const style = color ? { "--tile-color": color } : {};

    return html`
      <ha-card style=${styleMap(style)}>
        <ha-tile-container
          .vertical=${Boolean(this._config.vertical)}
          .interactive=${this._hasCardAction}
          .actionHandlerOptions=${{
            hasHold: hasAction(this._config.hold_action),
            hasDoubleClick: hasAction(this._config.double_tap_action),
          }}
          @action=${this._handleAction}
        >
          <ha-tile-icon
            slot="icon"
            .icon=${icon || undefined}
            .iconPath=${iconPath}
          ></ha-tile-icon>
          <ha-tile-info slot="info">
            <span slot="primary">${label}</span>
            ${description
              ? html`<span slot="secondary">${description}</span>`
              : nothing}
          </ha-tile-info>
        </ha-tile-container>
      </ha-card>
    `;
  }

  static styles = [
    tileCardStyle,
    css`
      :host {
        --tile-color: var(--primary-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-shortcut-card": HuiShortcutCard;
  }
}

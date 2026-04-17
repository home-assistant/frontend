import { css, html, LitElement, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { computeCssColor } from "../../../common/color/compute-color";
import "../../../components/ha-card";
import "../../../components/tile/ha-tile-container";
import "../../../components/tile/ha-tile-icon";
import "../../../components/tile/ha-tile-info";
import type { ActionHandlerEvent } from "../../../data/lovelace/action_handler";
import { NavigationPathInfoController } from "../../../data/navigation-path-controller";
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

  private _navInfo = new NavigationPathInfoController(this);

  public setConfig(config: ShortcutCardConfig): void {
    this._config = {
      tap_action: {
        action: "none",
      },
      ...config,
    };
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
    if (
      (changedProps.has("hass") || changedProps.has("_config")) &&
      this.hass
    ) {
      const action = this._config?.tap_action;
      this._navInfo.update(
        this.hass,
        action?.action === "navigate" ? action.navigation_path : undefined
      );
    }
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
      this._navInfo.info
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

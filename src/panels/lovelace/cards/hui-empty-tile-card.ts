import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { computeCssColor } from "../../../common/color/compute-color";
import "../../../components/ha-card";
import "../../../components/tile/ha-tile-container";
import "../../../components/tile/ha-tile-icon";
import "../../../components/tile/ha-tile-info";
import type { ActionHandlerEvent } from "../../../data/lovelace/action_handler";
import type { HomeAssistant } from "../../../types";
import { handleAction } from "../common/handle-action";
import { hasAction } from "../common/has-action";
import type { LovelaceCard, LovelaceGridOptions } from "../types";
import { tileCardStyle } from "./tile/tile-card-style";
import type { EmptyTileCardConfig } from "./types";

@customElement("hui-empty-tile-card")
export class HuiEmptyTileCard extends LitElement implements LovelaceCard {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: EmptyTileCardConfig;

  public setConfig(config: EmptyTileCardConfig): void {
    this._config = config;
  }

  public getCardSize(): number {
    return 1;
  }

  public getGridOptions(): LovelaceGridOptions {
    return {
      columns: 6,
      rows: 1,
      min_columns: 6,
      min_rows: 1,
    };
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

    const color = this._config.color
      ? computeCssColor(this._config.color)
      : undefined;

    const style = color ? { "--tile-color": color } : {};

    return html`
      <ha-card style=${styleMap(style)}>
        <ha-tile-container
          .interactive=${this._hasCardAction}
          .actionHandlerOptions=${{
            hasHold: hasAction(this._config.hold_action),
            hasDoubleClick: hasAction(this._config.double_tap_action),
          }}
          @action=${this._handleAction}
        >
          <ha-tile-icon
            slot="icon"
            .icon=${this._config.icon_path
              ? undefined
              : this._config.icon || "mdi:link"}
            .iconPath=${this._config.icon_path}
          ></ha-tile-icon>
          <ha-tile-info
            slot="info"
            .primary=${this._config.name}
          ></ha-tile-info>
        </ha-tile-container>
      </ha-card>
    `;
  }

  static styles = [
    tileCardStyle,
    css`
      :host {
        --tile-color: var(--state-inactive-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-empty-tile-card": HuiEmptyTileCard;
  }
}

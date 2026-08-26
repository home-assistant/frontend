import { consume, type ContextType } from "@lit/context";
import type { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { computeCssColor } from "../../../common/color/compute-color";
import { consumeEntityState } from "../../../common/decorators/consume-context-entry";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { isValidEntityId } from "../../../common/entity/valid_entity_id";
import "../../../components/ha-card";
import "../../../components/ha-relative-time";
import "../../../components/ha-state-icon";
import "../../../components/tile/ha-tile-container";
import "../../../components/tile/ha-tile-icon";
import "../../../components/tile/ha-tile-info";
import { formattersContext } from "../../../data/context";
import type { ActionHandlerEvent } from "../../../data/lovelace/action_handler";
import type { LovelaceCard, LovelaceGridOptions } from "../types";
import { tileCardStyle } from "./tile/tile-card-style";
import type { AlertCardConfig } from "./types";

@customElement("hui-alert-card")
export class HuiAlertCard extends LitElement implements LovelaceCard {
  @state() private _config?: AlertCardConfig;

  @state()
  @consumeEntityState({ entityIdPath: ["_config", "entity"] })
  private _stateObj?: HassEntity;

  @state()
  @consume({ context: formattersContext, subscribe: true })
  private _formatters!: ContextType<typeof formattersContext>;

  public setConfig(config: AlertCardConfig): void {
    if (
      !isValidEntityId(config.entity) ||
      (config.color !== undefined && typeof config.color !== "string") ||
      (config.pulse !== undefined && typeof config.pulse !== "boolean")
    ) {
      throw new Error("Invalid configuration");
    }
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

  protected render() {
    if (!this._config || !this._formatters) {
      return nothing;
    }

    const stateObj = this._stateObj;
    if (!stateObj) {
      return nothing;
    }

    const stateDisplay = this._formatters.formatEntityState(stateObj);
    const areaName = this._formatters.formatEntityName(stateObj, {
      type: "area",
    });
    const pulse = this._config.pulse === true;
    const hasColor =
      this._config.color !== undefined && this._config.color !== "none";

    return html`
      <ha-card
        class=${classMap({ pulse, "no-color": !hasColor })}
        style=${styleMap({
          "--ha-alert-color":
            this._config.color && hasColor
              ? computeCssColor(this._config.color)
              : undefined,
          "--ha-alert-static-opacity": pulse
            ? undefined
            : "var(--ha-alert-pulse-opacity)",
        })}
      >
        <ha-tile-container
          .interactive=${true}
          .actionHandlerOptions=${{ hasHold: false, hasDoubleClick: false }}
          @action=${this._handleAction}
        >
          <ha-tile-icon slot="icon">
            <ha-state-icon slot="icon" .stateObj=${stateObj}></ha-state-icon>
          </ha-tile-icon>
          <ha-tile-info slot="info">
            <span slot="primary">${computeStateName(stateObj)}</span>
            <span slot="secondary">
              ${stateDisplay} ·
              <ha-relative-time
                .datetime=${stateObj.last_changed}
                .format=${"short"}
              ></ha-relative-time>
              ${areaName ? html` · ${areaName}` : nothing}
            </span>
          </ha-tile-info>
        </ha-tile-container>
      </ha-card>
    `;
  }

  private _handleAction(ev: ActionHandlerEvent): void {
    if (ev.detail.action === "tap" && this._config) {
      fireEvent(this, "hass-more-info", { entityId: this._config.entity });
    }
  }

  static styles = [
    tileCardStyle,
    css`
      @keyframes pulse-opacity {
        from {
          opacity: 0;
        }
        to {
          opacity: var(--ha-pulse-opacity, 0.3);
        }
      }
      :host {
        display: block;
        --ha-alert-pulse-duration: 1s;
        --ha-alert-pulse-opacity: 0.3;
        --ha-alert-static-opacity: 0;
      }
      ha-card {
        position: relative;
        overflow: hidden;
        height: 100%;
      }
      ha-card:not(.no-color) {
        --tile-color: var(--ha-alert-color);
      }
      ha-card.no-color {
        --tile-color: var(--secondary-text-color);
      }
      ha-card::before {
        position: absolute;
        inset: 0;
        border-radius: var(--ha-card-border-radius, var(--ha-border-radius-lg));
        background-color: var(--ha-alert-color);
        content: "";
        opacity: var(--ha-alert-static-opacity);
        pointer-events: none;
      }
      ha-card.pulse::before {
        --ha-pulse-opacity: var(--ha-alert-pulse-opacity);
        animation: pulse-opacity var(--ha-alert-pulse-duration) ease-in-out
          infinite alternate;
      }
      ha-card:not(.pulse)::before {
        animation: none;
      }
      ha-tile-container {
        position: relative;
      }
      @media (prefers-reduced-motion: reduce) {
        ha-card::before {
          animation: none;
          opacity: var(--ha-alert-pulse-opacity);
        }
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-alert-card": HuiAlertCard;
  }
}

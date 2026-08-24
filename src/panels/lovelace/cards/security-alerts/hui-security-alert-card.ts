import { consume, type ContextType } from "@lit/context";
import type { HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { computeCssColor } from "../../../../common/color/compute-color";
import { computeStateName } from "../../../../common/entity/compute_state_name";
import { consumeEntityStates } from "../../../../common/decorators/consume-context-entry";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-card";
import "../../../../components/ha-relative-time";
import "../../../../components/ha-state-icon";
import "../../../../components/tile/ha-tile-container";
import "../../../../components/tile/ha-tile-icon";
import "../../../../components/tile/ha-tile-info";
import {
  configContext,
  formattersContext,
  internationalizationContext,
} from "../../../../data/context";
import type { ActionHandlerEvent } from "../../../../data/lovelace/action_handler";
import { tileCardStyle } from "../tile/tile-card-style";
import type { LovelaceCard, LovelaceGridOptions } from "../../types";
import type { SecurityAlertCardConfig } from "../types";
import {
  computeSecurityAlertItem,
  computeSecurityAlertItems,
  extractSecurityAlertEntityIds,
  isValidSecurityAlertEntityConfig,
  type SecurityAlertItem,
} from "./helpers";

@customElement("hui-security-alert-card")
export class HuiSecurityAlertCard extends LitElement implements LovelaceCard {
  public connectedWhileHidden = true;

  @property({ attribute: false }) public alert?: SecurityAlertItem;

  @property({ type: Boolean }) public preview = false;

  @state() private _config?: SecurityAlertCardConfig;

  @state() private _alertEntityIds?: string[];

  @state()
  @consumeEntityStates({ entityIdPath: ["_alertEntityIds"] })
  private _states?: Record<string, HassEntity>;

  @state()
  @consume({ context: configContext, subscribe: true })
  private _hassConfig!: ContextType<typeof configContext>;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @state()
  @consume({ context: formattersContext, subscribe: true })
  private _formatters!: ContextType<typeof formattersContext>;

  public setConfig(config: SecurityAlertCardConfig): void {
    if (!isValidSecurityAlertEntityConfig(config)) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
    this._alertEntityIds = extractSecurityAlertEntityIds([config]);
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

  private get _visibleAlert(): SecurityAlertItem | undefined {
    if (this.alert) {
      return this.alert;
    }
    if (!this._config || !this._alertEntityIds?.length || !this._states) {
      return undefined;
    }
    if (this.preview) {
      const stateObj = this._states[this._config.entity];
      return stateObj
        ? computeSecurityAlertItem(stateObj, this._config)
        : undefined;
    }
    return computeSecurityAlertItems(
      { ...this._hassConfig, ...this._i18n, states: this._states },
      [this._config]
    )[0];
  }

  protected willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);

    if (!this._config) {
      return;
    }

    const shouldBeHidden = !this.preview && !this._visibleAlert;
    if (shouldBeHidden !== this.hidden) {
      this.style.display = shouldBeHidden ? "none" : "";
      this.toggleAttribute("hidden", shouldBeHidden);
      fireEvent(this, "card-visibility-changed", { value: !shouldBeHidden });
    }
  }

  protected render() {
    const alert = this._visibleAlert;
    if (!alert || !this._formatters || (this._config && this.hidden)) {
      return nothing;
    }

    const stateDisplay = this._formatters.formatEntityState(alert.stateObj);
    const pulse = alert.pulse === true;
    const hasColor = alert.color !== undefined && alert.color !== "none";

    return html`
      <ha-card
        class=${classMap({ pulse, "no-color": !hasColor })}
        style=${styleMap({
          "--ha-security-alert-color":
            alert.color && hasColor ? computeCssColor(alert.color) : undefined,
          "--ha-security-alert-static-opacity": pulse
            ? undefined
            : "var(--ha-security-alert-pulse-opacity)",
        })}
      >
        <ha-tile-container
          .interactive=${true}
          .actionHandlerOptions=${{ hasHold: false, hasDoubleClick: false }}
          @action=${this._handleAction}
        >
          <ha-tile-icon
            slot="icon"
            .icon=${alert.icon}
            .iconPath=${alert.iconPath}
          >
            ${
              !alert.icon && !alert.iconPath
                ? html`<ha-state-icon
                    slot="icon"
                    .stateObj=${alert.stateObj}
                  ></ha-state-icon>`
                : nothing
            }
          </ha-tile-icon>
          <ha-tile-info slot="info">
            <span slot="primary">${computeStateName(alert.stateObj)}</span>
            <span slot="secondary">
              ${stateDisplay} ·
              <ha-relative-time
                .datetime=${alert.stateObj.last_changed}
              ></ha-relative-time>
            </span>
          </ha-tile-info>
        </ha-tile-container>
      </ha-card>
    `;
  }

  private _handleAction(ev: ActionHandlerEvent): void {
    const alert = this._visibleAlert;
    if (ev.detail.action === "tap" && alert) {
      fireEvent(this, "hass-more-info", { entityId: alert.entityId });
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
        --ha-security-alert-pulse-duration: 1s;
        --ha-security-alert-pulse-opacity: 0.3;
        --ha-security-alert-static-opacity: 0;
      }
      ha-card {
        position: relative;
        overflow: hidden;
        height: 100%;
      }
      ha-card:not(.no-color) {
        --tile-color: var(--ha-security-alert-color);
      }
      ha-card.no-color {
        --tile-color: var(--secondary-text-color);
      }
      ha-card::before {
        position: absolute;
        inset: 0;
        border-radius: var(--ha-card-border-radius, var(--ha-border-radius-lg));
        background-color: var(--ha-security-alert-color);
        content: "";
        opacity: var(--ha-security-alert-static-opacity);
        pointer-events: none;
      }
      ha-card.pulse::before {
        --ha-pulse-opacity: var(--ha-security-alert-pulse-opacity);
        animation: pulse-opacity var(--ha-security-alert-pulse-duration)
          ease-in-out infinite alternate;
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
          opacity: var(--ha-security-alert-pulse-opacity);
        }
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-security-alert-card": HuiSecurityAlertCard;
  }
}

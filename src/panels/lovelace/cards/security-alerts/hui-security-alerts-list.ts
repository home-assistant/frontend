import { consume, type ContextType } from "@lit/context";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { computeCssColor } from "../../../../common/color/compute-color";
import { computeStateName } from "../../../../common/entity/compute_state_name";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-card";
import "../../../../components/ha-relative-time";
import "../../../../components/ha-state-icon";
import "../../../../components/tile/ha-tile-container";
import "../../../../components/tile/ha-tile-icon";
import "../../../../components/tile/ha-tile-info";
import { formattersContext } from "../../../../data/context";
import type { ActionHandlerEvent } from "../../../../data/lovelace/action_handler";
import { pulseOpacityAnimation } from "../../../../resources/animations";
import type { SecurityAlertItem } from "./helpers";
import { tileCardStyle } from "../tile/tile-card-style";
import { securityAlertsContext } from "./context";

@customElement("hui-security-alerts-list")
export class HuiSecurityAlertsList extends LitElement {
  @state()
  @consume({ context: securityAlertsContext, subscribe: true })
  private _alerts: SecurityAlertItem[] = [];

  @state()
  @consume({ context: formattersContext, subscribe: true })
  private _formatters!: ContextType<typeof formattersContext>;

  protected render() {
    if (!this._alerts.length) {
      return nothing;
    }

    return html`
      <div class="alerts">
        ${this._alerts.map((alert) => this._renderAlert(alert))}
      </div>
    `;
  }

  private _handleAction(ev: ActionHandlerEvent): void {
    const entityId = (ev.currentTarget as HTMLElement).dataset.entityId;
    if (ev.detail.action === "tap" && entityId) {
      fireEvent(this, "hass-more-info", { entityId });
    }
  }

  private _renderAlert(alert: SecurityAlertItem) {
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
          data-entity-id=${alert.entityId}
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

  static styles = [
    tileCardStyle,
    pulseOpacityAnimation,
    css`
      :host {
        display: block;
        --ha-security-alert-pulse-duration: 1s;
        --ha-security-alert-pulse-opacity: 0.3;
        --ha-security-alert-static-opacity: 0;
      }
      .alerts {
        display: flex;
        flex-direction: column;
        gap: var(--ha-space-2);
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
    "hui-security-alerts-list": HuiSecurityAlertsList;
  }
}

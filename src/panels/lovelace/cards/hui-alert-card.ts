import type { ContextType } from "@lit/context";
import type { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { consume } from "../../../common/decorators/consume";
import { computeCssColor } from "../../../common/color/compute-color";
import { consumeEntityState } from "../../../common/decorators/consume-context-entry";
import { fireEvent } from "../../../common/dom/fire_event";
import {
  ALERT_DOMAINS,
  DEFAULT_ALERT_COLOR,
  isAlertActive,
} from "../../../common/entity/alert_active";
import { computeDomain } from "../../../common/entity/compute_domain";
import { isValidEntityId } from "../../../common/entity/valid_entity_id";
import "../../../components/ha-card";
import "../../../components/ha-relative-time";
import "../../../components/ha-state-icon";
import "../../../components/tile/ha-tile-container";
import "../../../components/tile/ha-tile-icon";
import "../../../components/tile/ha-tile-info";
import { connectionContext, formattersContext } from "../../../data/context";
import type { ActionHandlerEvent } from "../../../data/lovelace/action_handler";
import "../../../state-display/state-display";
import type { HomeAssistant, HomeAssistantConnection } from "../../../types";
import { findEntities } from "../common/find-entities";
import { hasAction } from "../common/has-action";
import type {
  LovelaceCard,
  LovelaceCardEditor,
  LovelaceGridOptions,
} from "../types";
import {
  getTileActionDefaults,
  getTileIconActionConfig,
  getTileImageUrl,
  hasTileCardAction,
  hasTileIconAction,
} from "./tile/tile-card-helpers";
import { tileCardStyle } from "./tile/tile-card-style";
import type { AlertCardConfig } from "./types";

@customElement("hui-alert-card")
export class HuiAlertCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("../editor/config-elements/hui-alert-card-editor");

    return document.createElement("hui-alert-card-editor");
  }

  public static getStubConfig(
    hass: HomeAssistant,
    entities: string[],
    entitiesFallback: string[]
  ): AlertCardConfig {
    const [entity] = findEntities(
      hass,
      1,
      entities,
      entitiesFallback,
      ALERT_DOMAINS
    );

    return { type: "alert", entity: entity || "" };
  }

  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: AlertCardConfig;

  @state()
  @consumeEntityState({ entityIdPath: ["_config", "entity"] })
  private _stateObj?: HassEntity;

  @state()
  @consume({ context: connectionContext, subscribe: true })
  private _connection!: HomeAssistantConnection;

  @state()
  @consume({ context: formattersContext, subscribe: true })
  private _formatters!: ContextType<typeof formattersContext>;

  public setConfig(config: AlertCardConfig): void {
    if (
      !isValidEntityId(config.entity) ||
      (config.alert_color !== undefined &&
        typeof config.alert_color !== "string") ||
      (config.clear_color !== undefined &&
        typeof config.clear_color !== "string") ||
      (config.pulse !== undefined && typeof config.pulse !== "boolean")
    ) {
      throw new Error("Invalid configuration");
    }

    if (!ALERT_DOMAINS.includes(computeDomain(config.entity))) {
      throw new Error(
        `Specify an entity from within the ${ALERT_DOMAINS.join(", ")} domains`
      );
    }

    this._config = {
      ...getTileActionDefaults(config.entity),
      ...config,
    };
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
    if (!this._config || !this._formatters || !this._connection || !this.hass) {
      return nothing;
    }

    const stateObj = this._stateObj;
    if (!stateObj) {
      return nothing;
    }

    const active = isAlertActive(stateObj);

    const color = active
      ? (this._config.alert_color ?? DEFAULT_ALERT_COLOR)
      : this._config.clear_color;

    const pulse = active && this._config.pulse === true;
    const hasColor = color !== undefined && color !== "none";

    const imageUrl = this._config.show_entity_picture
      ? getTileImageUrl(this._connection, stateObj)
      : undefined;

    return html`
      <ha-card
        class=${classMap({ pulse, "no-color": !hasColor })}
        style=${styleMap({
          "--ha-alert-color":
            color && hasColor ? computeCssColor(color) : undefined,
          "--ha-alert-static-opacity": pulse
            ? undefined
            : "var(--ha-alert-pulse-opacity)",
        })}
      >
        <ha-tile-container
          .interactive=${hasTileCardAction(this._config)}
          .actionHandlerOptions=${{
            hasHold: hasAction(this._config.hold_action),
            hasDoubleClick: hasAction(this._config.double_tap_action),
          }}
          @action=${this._handleAction}
        >
          <ha-tile-icon
            slot="icon"
            .interactive=${hasTileIconAction(this._config)}
            .actionHandlerOptions=${{
              hasHold: hasAction(this._config.icon_hold_action),
              hasDoubleClick: hasAction(this._config.icon_double_tap_action),
            }}
            .imageUrl=${imageUrl}
            @action=${this._handleIconAction}
          >
            ${
              imageUrl
                ? nothing
                : html`<ha-state-icon
                    slot="icon"
                    .icon=${this._config.icon}
                    .stateObj=${stateObj}
                  ></ha-state-icon>`
            }
          </ha-tile-icon>
          <ha-tile-info slot="info">
            <span slot="primary"
              >${this._formatters.formatEntityName(
                stateObj,
                this._config.name
              )}</span
            >
            <span slot="secondary">
              ${
                this._config.state_content
                  ? html`<state-display
                      .stateObj=${stateObj}
                      .hass=${this.hass}
                      .content=${this._config.state_content}
                      .timeFormat=${this._config.time_format}
                    ></state-display>`
                  : this._renderDefaultSecondary(stateObj)
              }
            </span>
          </ha-tile-info>
        </ha-tile-container>
      </ha-card>
    `;
  }

  private _renderDefaultSecondary(stateObj: HassEntity) {
    const areaName = this._formatters.formatEntityName(stateObj, {
      type: "area",
    });

    return html`
      ${this._formatters.formatEntityState(stateObj)} ·
      <ha-relative-time
        .datetime=${stateObj.last_changed}
        .format=${"short"}
      ></ha-relative-time>
      ${areaName ? html` · ${areaName}` : nothing}
    `;
  }

  private _handleAction(ev: ActionHandlerEvent): void {
    fireEvent(this, "hass-action", {
      config: this._config!,
      action: ev.detail.action!,
    });
  }

  private _handleIconAction(ev: ActionHandlerEvent): void {
    ev.stopPropagation();
    fireEvent(this, "hass-action", {
      config: getTileIconActionConfig(this._config!.entity, this._config!),
      action: ev.detail.action!,
    });
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
        ha-card::before,
        ha-card.pulse::before {
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

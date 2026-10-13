import type { ContextType } from "@lit/context";
import { mdiAlertCircle } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { computeCssColor } from "../../../common/color/compute-color";
import { consume } from "../../../common/decorators/consume";
import {
  consumeEntityState,
  consumeLocalize,
} from "../../../common/decorators/consume-context-entry";
import { fireEvent } from "../../../common/dom/fire_event";
import {
  ALERT_DOMAINS,
  DEFAULT_ALERT_COLOR,
  isAlertActive,
} from "../../../common/entity/alert_active";
import { computeDomain } from "../../../common/entity/compute_domain";
import { isValidEntityId } from "../../../common/entity/valid_entity_id";
import "../../../components/ha-badge";
import "../../../components/ha-state-icon";
import "../../../components/ha-svg-icon";
import type { LocalizeFunc } from "../../../common/translations/localize";
import { formattersContext } from "../../../data/context";
import type { ActionHandlerEvent } from "../../../data/lovelace/action_handler";
import type { HomeAssistant } from "../../../types";
import { actionHandler } from "../common/directives/action-handler-directive";
import { findEntities } from "../common/find-entities";
import type { LovelaceBadge, LovelaceBadgeEditor } from "../types";
import type { AlertBadgeConfig } from "./types";

@customElement("hui-alert-badge")
export class HuiAlertBadge extends LitElement implements LovelaceBadge {
  public static async getConfigElement(): Promise<LovelaceBadgeEditor> {
    await import("../editor/config-elements/hui-alert-badge-editor");

    return document.createElement("hui-alert-badge-editor");
  }

  public static getStubConfig(
    hass: HomeAssistant,
    entities: string[],
    entitiesFallback: string[]
  ): AlertBadgeConfig {
    const [entity] = findEntities(
      hass,
      1,
      entities,
      entitiesFallback,
      ALERT_DOMAINS
    );

    return { type: "alert", entity: entity || "" };
  }

  @state() private _config?: AlertBadgeConfig;

  @state()
  @consumeEntityState({ entityIdPath: ["_config", "entity"] })
  private _stateObj?: HassEntity;

  @state()
  @consume({ context: formattersContext, subscribe: true })
  private _formatters!: ContextType<typeof formattersContext>;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  public setConfig(config: AlertBadgeConfig): void {
    if (
      !isValidEntityId(config.entity) ||
      (config.color !== undefined && typeof config.color !== "string") ||
      (config.inactive_color !== undefined &&
        typeof config.inactive_color !== "string") ||
      (config.pulse !== undefined && typeof config.pulse !== "boolean")
    ) {
      throw new Error("Invalid configuration");
    }

    if (!ALERT_DOMAINS.includes(computeDomain(config.entity))) {
      throw new Error(
        `Specify an entity from within the ${ALERT_DOMAINS.join(", ")} domains`
      );
    }

    this._config = config;
  }

  protected render() {
    if (!this._config || !this._formatters || !this._localize) {
      return nothing;
    }

    const stateObj = this._stateObj;

    if (!stateObj) {
      return html`
        <ha-badge .label=${this._config.entity} class="error">
          <ha-svg-icon slot="icon" .path=${mdiAlertCircle}></ha-svg-icon>
          ${this._localize("ui.badge.entity.not_found")}
        </ha-badge>
      `;
    }

    const active = isAlertActive(stateObj);

    const color = active
      ? (this._config.color ?? DEFAULT_ALERT_COLOR)
      : this._config.inactive_color;

    const pulse = active && this._config.pulse === true;
    const hasColor = color !== undefined && color !== "none";

    return html`
      <ha-badge
        type="button"
        .label=${this._formatters.formatEntityName(stateObj)}
        class=${classMap({ alert: true, pulse, "no-color": !hasColor })}
        style=${styleMap({
          "--ha-alert-color":
            color && hasColor ? computeCssColor(color) : undefined,
        })}
        @action=${this._handleAction}
        .actionHandler=${actionHandler({
          hasHold: false,
          hasDoubleClick: false,
        })}
      >
        <ha-state-icon slot="icon" .stateObj=${stateObj}></ha-state-icon>
        ${this._formatters.formatEntityState(stateObj)}
      </ha-badge>
    `;
  }

  private _handleAction(ev: ActionHandlerEvent): void {
    if (ev.detail.action === "tap" && this._config) {
      fireEvent(this, "hass-more-info", { entityId: this._config.entity });
    }
  }

  static styles = css`
    @keyframes pulse-opacity {
      from {
        opacity: 0;
      }
      to {
        opacity: var(--ha-alert-pulse-opacity);
      }
    }
    :host {
      --ha-alert-pulse-duration: 1s;
      --ha-alert-pulse-opacity: 0.3;
      --ha-alert-badge-background: var(
        --ha-card-background,
        var(--card-background-color, white)
      );
    }
    ha-badge.error {
      --badge-color: var(--red-color);
    }
    ha-badge.alert {
      display: block;
      position: relative;
      isolation: isolate;
      border-radius: var(
        --ha-badge-border-radius,
        calc(var(--ha-badge-size, 36px) / 2)
      );
      background: var(--ha-alert-badge-background);
      --ha-card-background: transparent;
      --badge-color: var(--ha-alert-color);
    }
    ha-badge.alert.no-color {
      --badge-color: var(--secondary-text-color);
    }
    ha-badge.alert::before {
      position: absolute;
      inset: 0;
      z-index: -1;
      border-radius: inherit;
      background-color: var(--ha-alert-color);
      content: "";
      opacity: var(--ha-alert-pulse-opacity);
      pointer-events: none;
    }
    ha-badge.alert.pulse::before {
      animation: pulse-opacity var(--ha-alert-pulse-duration) ease-in-out
        infinite alternate;
    }
    @media (prefers-reduced-motion: reduce) {
      ha-badge.alert.pulse::before {
        animation: none;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-alert-badge": HuiAlertBadge;
  }
}

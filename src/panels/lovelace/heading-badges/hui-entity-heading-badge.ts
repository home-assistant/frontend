import { mdiAlertCircle } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { computeCssColor } from "../../../common/color/compute-color";
import { hsv2rgb, rgb2hex, rgb2hsv } from "../../../common/color/convert-color";
import { computeDomain } from "../../../common/entity/compute_domain";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { stateActive } from "../../../common/entity/state_active";
import { stateColor } from "../../../common/entity/state_color";
import "../../../components/ha-heading-badge";
import "../../../components/ha-state-icon";
import type { ActionHandlerEvent } from "../../../data/lovelace/action_handler";
import "../../../state-display/state-display";
import type { HomeAssistant } from "../../../types";
import { actionHandler } from "../common/directives/action-handler-directive";
import { handleAction } from "../common/handle-action";
import { hasAction } from "../common/has-action";
import { DEFAULT_CONFIG } from "../editor/heading-badge-editor/hui-entity-heading-badge-editor";
import type {
  LovelaceHeadingBadge,
  LovelaceHeadingBadgeEditor,
} from "../types";
import type { EntityHeadingBadgeConfig } from "./types";

const DEFAULT_ACTIONS: Pick<
  EntityHeadingBadgeConfig,
  "tap_action" | "hold_action" | "double_tap_action"
> = {
  tap_action: { action: "none" },
  hold_action: { action: "none" },
  double_tap_action: { action: "none" },
};
@customElement("hui-entity-heading-badge")
export class HuiEntityHeadingBadge
  extends LitElement
  implements LovelaceHeadingBadge
{
  public static async getConfigElement(): Promise<LovelaceHeadingBadgeEditor> {
    await import(
      "../editor/heading-badge-editor/hui-entity-heading-badge-editor"
    );
    return document.createElement("hui-heading-entity-editor");
  }

  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: EntityHeadingBadgeConfig;

  @property({ type: Boolean }) public preview = false;

  public setConfig(config): void {
    this._config = {
      ...DEFAULT_CONFIG,
      ...DEFAULT_ACTIONS,
      ...config,
    };
  }

  get hasAction() {
    return (
      hasAction(this._config?.tap_action) ||
      hasAction(this._config?.hold_action) ||
      hasAction(this._config?.double_tap_action)
    );
  }

  private _handleAction(ev: ActionHandlerEvent) {
    handleAction(this, this.hass!, this._config!, ev.detail.action!);
  }

  private _computeStateColor = memoizeOne(
    (entity: HassEntity, color?: string) => {
      if (!color || color === "none") {
        return undefined;
      }

      if (color === "state") {
        // Use light color if the light support rgb
        if (
          computeDomain(entity.entity_id) === "light" &&
          entity.attributes.rgb_color
        ) {
          const hsvColor = rgb2hsv(entity.attributes.rgb_color);

          // Modify the real rgb color for better contrast
          if (hsvColor[1] < 0.4) {
            // Special case for very light color (e.g: white)
            if (hsvColor[1] < 0.1) {
              hsvColor[2] = 225;
            } else {
              hsvColor[1] = 0.4;
            }
          }
          return rgb2hex(hsv2rgb(hsvColor));
        }
        // Fallback to state color
        return stateColor(this, entity);
      }

      if (color) {
        // Use custom color if active
        return stateActive(entity) ? computeCssColor(color) : undefined;
      }
      return color;
    }
  );

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const config = this._config;

    const entityId = config.entity;
    const stateObj = this.hass!.states[entityId];

    if (!stateObj) {
      return html`
        <ha-heading-badge class="error" .title=${entityId}>
          <ha-svg-icon
            slot="icon"
            .hass=${this.hass}
            .path=${mdiAlertCircle}
          ></ha-svg-icon>
          -
        </ha-heading-badge>
      `;
    }

    const color = this._computeStateColor(stateObj, config.color);

    const style = {
      "--icon-color": color,
    };

    const name = config.name || computeStateName(stateObj);

    return html`
      <ha-heading-badge
        .type=${this.hasAction ? "button" : "badge"}
        @action=${this._handleAction}
        .actionHandler=${actionHandler({
          hasHold: hasAction(this._config!.hold_action),
          hasDoubleClick: hasAction(this._config!.double_tap_action),
        })}
        style=${styleMap(style)}
        .title=${name}
      >
        ${config.show_icon
          ? html`
              <ha-state-icon
                slot="icon"
                .hass=${this.hass}
                .icon=${config.icon}
                .stateObj=${stateObj}
              ></ha-state-icon>
            `
          : nothing}
        ${config.show_state
          ? html`
              <state-display
                .hass=${this.hass}
                .stateObj=${stateObj}
                .content=${config.state_content}
                .name=${config.name}
                dash-unavailable
              ></state-display>
            `
          : nothing}
      </ha-heading-badge>
    `;
  }

  static styles = css`
    [role="button"] {
      cursor: pointer;
    }
    ha-heading-badge {
      --state-inactive-color: initial;
    }
    ha-heading-badge.error {
      --icon-color: var(--red-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-entity-heading-badge": HuiEntityHeadingBadge;
  }
}

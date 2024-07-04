import { HassEntity } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { computeCssColor } from "../../../common/color/compute-color";
import { hsv2rgb, rgb2hex, rgb2hsv } from "../../../common/color/convert-color";
import { computeDomain } from "../../../common/entity/compute_domain";
import { stateActive } from "../../../common/entity/state_active";
import { stateColorCss } from "../../../common/entity/state_color";
import "../../../components/ha-ripple";
import "../../../components/ha-state-icon";
import { ActionHandlerEvent } from "../../../data/lovelace/action_handler";
import { HomeAssistant } from "../../../types";
import { actionHandler } from "../common/directives/action-handler-directive";
import { handleAction } from "../common/handle-action";
import { hasAction } from "../common/has-action";
import { LovelaceBadge } from "../types";
import { EntityBadgeConfig } from "./types";

@customElement("hui-entity-badge")
export class HuiEntityBadge extends LitElement implements LovelaceBadge {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() protected _config?: EntityBadgeConfig;

  public setConfig(config: EntityBadgeConfig): void {
    this._config = config;
  }

  get hasAction() {
    return (
      !this._config?.tap_action ||
      hasAction(this._config?.tap_action) ||
      hasAction(this._config?.hold_action) ||
      hasAction(this._config?.double_tap_action)
    );
  }

  private _computeStateColor = memoizeOne(
    (stateObj: HassEntity, color?: string) => {
      // Use custom color if active
      if (color) {
        return stateActive(stateObj) ? computeCssColor(color) : undefined;
      }

      // Use light color if the light support rgb
      if (
        computeDomain(stateObj.entity_id) === "light" &&
        stateObj.attributes.rgb_color
      ) {
        const hsvColor = rgb2hsv(stateObj.attributes.rgb_color);

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
      return stateColorCss(stateObj);
    }
  );

  protected render() {
    if (!this._config || !this.hass) {
      return nothing;
    }

    const stateObj = this.hass.states[this._config.entity!];

    const color = this._computeStateColor(stateObj, this._config.color);

    const style = {
      "--badge-color": color,
    };

    return html`
      <div
        style=${styleMap(style)}
        class="badge"
        @action=${this._handleAction}
        .actionHandler=${actionHandler({
          hasHold: hasAction(this._config!.hold_action),
          hasDoubleClick: hasAction(this._config!.double_tap_action),
        })}
        role=${ifDefined(this.hasAction ? "button" : undefined)}
        tabindex=${ifDefined(this.hasAction ? "0" : undefined)}
      >
        <ha-ripple .disabled=${!this.hasAction}></ha-ripple>
        <ha-state-icon .hass=${this.hass} .stateObj=${stateObj}></ha-state-icon>
        <span>${this.hass.formatEntityState(stateObj)}</span>
      </div>
    `;
  }

  private _handleAction(ev: ActionHandlerEvent) {
    handleAction(this, this.hass!, this._config!, ev.detail.action!);
  }

  static get styles(): CSSResultGroup {
    return css`
      .badge {
        position: relative;
        --ha-ripple-color: var(--badge-color);
        --ha-ripple-hover-opacity: 0.04;
        --ha-ripple-pressed-opacity: 0.12;
        display: inline-flex;
        flex-direction: row;
        align-items: center;
        gap: 8px;
        height: 32px;
        padding: 6px 16px 6px 12px;
        margin: calc(-1 * var(--ha-card-border-width, 1px));
        box-sizing: border-box;
        width: auto;
        border-radius: 16px;
        background-color: var(--card-background-color, white);
        border-width: var(--ha-card-border-width, 1px);
        border-style: solid;
        border-color: var(
          --ha-card-border-color,
          var(--divider-color, #e0e0e0)
        );
        --mdc-icon-size: 18px;
        cursor: pointer;
        color: var(--primary-text-color);
        text-align: center;
        font-family: Roboto;
        font-size: 14px;
        font-style: normal;
        font-weight: 500;
        line-height: 20px;
        letter-spacing: 0.1px;
      }
      ha-state-icon {
        color: var(--badge-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-entity-badge": HuiEntityBadge;
  }
}

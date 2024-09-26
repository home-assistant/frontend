import { HassEntity } from "home-assistant-js-websocket";
import { CSSResultGroup, LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { computeCssColor } from "../../../common/color/compute-color";
import { hsv2rgb, rgb2hex, rgb2hsv } from "../../../common/color/convert-color";
import { computeDomain } from "../../../common/entity/compute_domain";
import { stateActive } from "../../../common/entity/state_active";
import { stateColorCss } from "../../../common/entity/state_color";
import "../../../components/ha-card";
import "../../../components/ha-icon";
import "../../../components/ha-icon-next";
import "../../../components/ha-state-icon";
import { ActionHandlerEvent } from "../../../data/lovelace/action_handler";
import "../../../state-display/state-display";
import { HomeAssistant } from "../../../types";
import { actionHandler } from "../common/directives/action-handler-directive";
import { handleAction } from "../common/handle-action";
import { hasAction } from "../common/has-action";
import { DEFAULT_CONFIG } from "../editor/heading-item-editor/hui-heading-entity-editor";
import { LovelaceHeadingItem, LovelaceHeadingItemEditor } from "../types";
import { EntityHeadingItemConfig } from "./types";

@customElement("hui-entity-heading-item")
export class HuiEntityHeadingItem
  extends LitElement
  implements LovelaceHeadingItem
{
  public static async getConfigElement(): Promise<LovelaceHeadingItemEditor> {
    await import("../editor/heading-item-editor/hui-heading-entity-editor");
    return document.createElement("hui-heading-entity-editor");
  }

  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: EntityHeadingItemConfig;

  @property({ type: Boolean }) public preview = false;

  public setConfig(config): void {
    this._config = {
      ...DEFAULT_CONFIG,
      tap_action: {
        action: "none",
      },
      ...config,
    };
  }

  private _handleAction(ev: ActionHandlerEvent) {
    const config: EntityHeadingItemConfig = {
      tap_action: {
        action: "none",
      },
      ...this._config!,
    };
    handleAction(this, this.hass!, config, ev.detail.action!);
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
        return stateColorCss(entity);
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

    const stateObj = this.hass!.states[config.entity];

    if (!stateObj) {
      return nothing;
    }

    const color = this._computeStateColor(stateObj, config.color);

    const actionable = hasAction(config.tap_action);

    const style = {
      "--color": color,
    };

    return html`
      <div
        class="entity"
        @action=${this._handleAction}
        .actionHandler=${actionHandler()}
        role=${ifDefined(actionable ? "button" : undefined)}
        tabindex=${ifDefined(actionable ? "0" : undefined)}
        style=${styleMap(style)}
      >
        ${config.show_icon
          ? html`
              <ha-state-icon
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
              ></state-display>
            `
          : nothing}
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      [role="button"] {
        cursor: pointer;
      }
      .entity {
        display: flex;
        flex-direction: row;
        white-space: nowrap;
        align-items: center;
        gap: 3px;
        color: var(--secondary-text-color);
        font-family: Roboto;
        font-size: 14px;
        font-style: normal;
        font-weight: 500;
        line-height: 20px; /* 142.857% */
        letter-spacing: 0.1px;
        --mdc-icon-size: 14px;
        --state-inactive-color: initial;
      }
      .entity ha-state-icon {
        --ha-icon-display: block;
        color: var(--color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-entity-heading-item": HuiEntityHeadingItem;
  }
}

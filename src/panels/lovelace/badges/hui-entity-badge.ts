import { HassEntity } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
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
import { findEntities } from "../common/find-entities";
import { handleAction } from "../common/handle-action";
import { hasAction } from "../common/has-action";
import { LovelaceBadge, LovelaceBadgeEditor } from "../types";
import { EntityBadgeConfig } from "./types";
import { computeStateDomain } from "../../../common/entity/compute_state_domain";
import { cameraUrlWithWidthHeight } from "../../../data/camera";

export const DISPLAY_TYPES = ["minimal", "standard", "complete"] as const;

export type DisplayType = (typeof DISPLAY_TYPES)[number];

export const DEFAULT_DISPLAY_TYPE: DisplayType = "standard";

@customElement("hui-entity-badge")
export class HuiEntityBadge extends LitElement implements LovelaceBadge {
  public static async getConfigElement(): Promise<LovelaceBadgeEditor> {
    await import("../editor/config-elements/hui-entity-badge-editor");
    return document.createElement("hui-entity-badge-editor");
  }

  public static getStubConfig(
    hass: HomeAssistant,
    entities: string[],
    entitiesFallback: string[]
  ): EntityBadgeConfig {
    const includeDomains = ["sensor", "light", "switch"];
    const maxEntities = 1;
    const foundEntities = findEntities(
      hass,
      maxEntities,
      entities,
      entitiesFallback,
      includeDomains
    );

    return {
      type: "entity",
      entity: foundEntities[0] || "",
    };
  }

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

  private _getImageUrl(stateObj: HassEntity): string | undefined {
    const entityPicture =
      stateObj.attributes.entity_picture_local ||
      stateObj.attributes.entity_picture;

    if (!entityPicture) return undefined;

    let imageUrl = this.hass!.hassUrl(entityPicture);
    if (computeStateDomain(stateObj) === "camera") {
      imageUrl = cameraUrlWithWidthHeight(imageUrl, 32, 32);
    }

    return imageUrl;
  }

  protected render() {
    if (!this._config || !this.hass) {
      return nothing;
    }

    const entityId = this._config.entity;
    const stateObj = entityId ? this.hass.states[entityId] : undefined;

    if (!stateObj) {
      return nothing;
    }

    const active = stateActive(stateObj);
    const color = this._computeStateColor(stateObj, this._config.color);

    const style = {
      "--badge-color": color,
    };

    const stateDisplay = html`
      <state-display
        .stateObj=${stateObj}
        .hass=${this.hass}
        .content=${this._config.state_content}
        .name=${this._config.name}
      >
      </state-display>
    `;

    const name = this._config.name || stateObj.attributes.friendly_name;

    const displayType = this._config.display_type || DEFAULT_DISPLAY_TYPE;

    const imageUrl = this._config.show_entity_picture
      ? this._getImageUrl(stateObj)
      : undefined;

    return html`
      <div
        style=${styleMap(style)}
        class="badge ${classMap({
          active,
          [displayType]: true,
        })}"
        @action=${this._handleAction}
        .actionHandler=${actionHandler({
          hasHold: hasAction(this._config!.hold_action),
          hasDoubleClick: hasAction(this._config!.double_tap_action),
        })}
        role=${ifDefined(this.hasAction ? "button" : undefined)}
        tabindex=${ifDefined(this.hasAction ? "0" : undefined)}
      >
        <ha-ripple .disabled=${!this.hasAction}></ha-ripple>
        ${imageUrl
          ? html`<img src=${imageUrl} aria-hidden />`
          : html`
              <ha-state-icon
                .hass=${this.hass}
                .stateObj=${stateObj}
                .icon=${this._config.icon}
              ></ha-state-icon>
            `}
        ${displayType !== "minimal"
          ? html`
              <span class="content">
                ${displayType === "complete"
                  ? html`<span class="name">${name}</span>`
                  : nothing}
                <span class="state">${stateDisplay}</span>
              </span>
            `
          : nothing}
      </div>
    `;
  }

  private _handleAction(ev: ActionHandlerEvent) {
    handleAction(this, this.hass!, this._config!, ev.detail.action!);
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        --badge-color: var(--state-inactive-color);
        -webkit-tap-highlight-color: transparent;
      }
      .badge {
        position: relative;
        --ha-ripple-color: var(--badge-color);
        --ha-ripple-hover-opacity: 0.04;
        --ha-ripple-pressed-opacity: 0.12;
        transition:
          box-shadow 180ms ease-in-out,
          border-color 180ms ease-in-out;
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;
        gap: 8px;
        height: 36px;
        min-width: 36px;
        padding: 0px 8px;
        box-sizing: border-box;
        width: auto;
        border-radius: 18px;
        background-color: var(--card-background-color, white);
        border-width: var(--ha-card-border-width, 1px);
        border-style: solid;
        border-color: var(
          --ha-card-border-color,
          var(--divider-color, #e0e0e0)
        );
        --mdc-icon-size: 18px;
        text-align: center;
        font-family: Roboto;
      }
      .badge:focus-visible {
        --shadow-default: var(--ha-card-box-shadow, 0 0 0 0 transparent);
        --shadow-focus: 0 0 0 1px var(--badge-color);
        border-color: var(--badge-color);
        box-shadow: var(--shadow-default), var(--shadow-focus);
      }
      button,
      [role="button"] {
        cursor: pointer;
      }
      button:focus,
      [role="button"]:focus {
        outline: none;
      }
      .badge.active {
        --badge-color: var(--primary-color);
      }
      .content {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        padding-right: 4px;
        padding-inline-end: 4px;
        padding-inline-start: initial;
      }
      .name {
        font-size: 10px;
        font-style: normal;
        font-weight: 500;
        line-height: 10px;
        letter-spacing: 0.1px;
        color: var(--secondary-text-color);
      }
      .state {
        font-size: 12px;
        font-style: normal;
        font-weight: 500;
        line-height: 16px;
        letter-spacing: 0.1px;
        color: var(--primary-text-color);
      }
      ha-state-icon {
        color: var(--badge-color);
        line-height: 0;
      }
      img {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        object-fit: cover;
        overflow: hidden;
      }
      .badge.minimal {
        padding: 0;
      }
      .badge:not(.minimal) img {
        margin-left: -6px;
        margin-inline-start: -6px;
        margin-inline-end: initial;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-entity-badge": HuiEntityBadge;
  }
}

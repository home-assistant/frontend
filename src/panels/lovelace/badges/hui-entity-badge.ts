import { mdiAlertCircle } from "@mdi/js";
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
import { computeStateDomain } from "../../../common/entity/compute_state_domain";
import { stateActive } from "../../../common/entity/state_active";
import { stateColorCss } from "../../../common/entity/state_color";
import "../../../components/ha-ripple";
import "../../../components/ha-state-icon";
import "../../../components/ha-svg-icon";
import { cameraUrlWithWidthHeight } from "../../../data/camera";
import { ActionHandlerEvent } from "../../../data/lovelace/action_handler";
import { HomeAssistant } from "../../../types";
import { actionHandler } from "../common/directives/action-handler-directive";
import { findEntities } from "../common/find-entities";
import { handleAction } from "../common/handle-action";
import { hasAction } from "../common/has-action";
import { LovelaceBadge, LovelaceBadgeEditor } from "../types";
import { EntityBadgeConfig } from "./types";

export const DISPLAY_TYPES = ["minimal", "standard", "complete"] as const;
export type DisplayType = (typeof DISPLAY_TYPES)[number];
export const DEFAULT_DISPLAY_TYPE: DisplayType = "standard";

export const DEFAULT_CONFIG: EntityBadgeConfig = {
  type: "entity",
  show_name: false,
  show_state: true,
  show_icon: true,
};

export const migrateLegacyEntityBadgeConfig = (
  config: EntityBadgeConfig
): EntityBadgeConfig => {
  const newConfig = { ...config };
  if (config.display_type) {
    if (config.show_name === undefined) {
      if (config.display_type === "complete") {
        newConfig.show_name = true;
      }
    }
    if (config.show_state === undefined) {
      if (config.display_type === "minimal") {
        newConfig.show_state = false;
      }
    }
    delete newConfig.display_type;
  }
  return newConfig;
};

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
    this._config = {
      ...DEFAULT_CONFIG,
      ...migrateLegacyEntityBadgeConfig(config),
    };
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
      return html`
        <div class="badge error">
          <ha-svg-icon .hass=${this.hass} .path=${mdiAlertCircle}></ha-svg-icon>
          <span class="info">
            <span class="label">${entityId}</span>
            <span class="content">
              ${this.hass.localize("ui.badge.entity.not_found")}
            </span>
          </span>
        </div>
      `;
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

    const showState = this._config.show_state;
    const showName = this._config.show_name;
    const showIcon = this._config.show_icon;
    const showEntityPicture = this._config.show_entity_picture;

    const imageUrl = showEntityPicture
      ? this._getImageUrl(stateObj)
      : undefined;

    const label = showState && showName ? name : undefined;
    const content = showState ? stateDisplay : showName ? name : undefined;

    return html`
      <div
        style=${styleMap(style)}
        class="badge ${classMap({
          active,
          "no-info": !showState && !showName,
          "no-icon": !showIcon,
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
        ${showIcon
          ? imageUrl
            ? html`<img src=${imageUrl} aria-hidden />`
            : html`
                <ha-state-icon
                  .hass=${this.hass}
                  .stateObj=${stateObj}
                  .icon=${this._config.icon}
                ></ha-state-icon>
              `
          : nothing}
        ${content
          ? html`
              <span class="info">
                ${label ? html`<span class="label">${name}</span>` : nothing}
                <span class="content">${content}</span>
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
      .badge.error {
        --badge-color: var(--red-color);
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
        height: var(--ha-badge-size, 36px);
        min-width: var(--ha-badge-size, 36px);
        padding: 0px 8px;
        box-sizing: border-box;
        width: auto;
        border-radius: var(
          --ha-badge-border-radius,
          calc(var(--ha-badge-size, 36px) / 2)
        );
        background: var(
          --ha-card-background,
          var(--card-background-color, white)
        );
        -webkit-backdrop-filter: var(--ha-card-backdrop-filter, none);
        backdrop-filter: var(--ha-card-backdrop-filter, none);
        border-width: var(--ha-card-border-width, 1px);
        box-shadow: var(--ha-card-box-shadow, none);
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
      .info {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        padding-right: 4px;
        padding-inline-end: 4px;
        padding-inline-start: initial;
      }
      .label {
        font-size: 10px;
        font-style: normal;
        font-weight: 500;
        line-height: 10px;
        letter-spacing: 0.1px;
        color: var(--secondary-text-color);
      }
      .content {
        font-size: 12px;
        font-style: normal;
        font-weight: 500;
        line-height: 16px;
        letter-spacing: 0.1px;
        color: var(--primary-text-color);
      }
      ha-state-icon,
      ha-svg-icon {
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
      .badge.no-info {
        padding: 0;
      }
      .badge:not(.no-icon) img {
        margin-left: -6px;
        margin-inline-start: -6px;
        margin-inline-end: initial;
      }
      .badge.no-icon .info {
        padding-right: 4px;
        padding-left: 4px;
        padding-inline-end: 4px;
        padding-inline-start: 4px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-entity-badge": HuiEntityBadge;
  }
}

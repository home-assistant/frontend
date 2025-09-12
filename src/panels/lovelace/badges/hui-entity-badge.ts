import { mdiAlertCircle } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { computeCssColor } from "../../../common/color/compute-color";
import { hsv2rgb, rgb2hex, rgb2hsv } from "../../../common/color/convert-color";
import { computeDomain } from "../../../common/entity/compute_domain";
import { computeStateDomain } from "../../../common/entity/compute_state_domain";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { stateActive } from "../../../common/entity/state_active";
import { stateColor } from "../../../common/entity/state_color";
import "../../../components/ha-badge";
import "../../../components/ha-ripple";
import "../../../components/ha-state-icon";
import "../../../components/ha-svg-icon";
import { cameraUrlWithWidthHeight } from "../../../data/camera";
import type { ActionHandlerEvent } from "../../../data/lovelace/action_handler";
import type { HomeAssistant } from "../../../types";
import { actionHandler } from "../common/directives/action-handler-directive";
import { findEntities } from "../common/find-entities";
import { handleAction } from "../common/handle-action";
import { hasAction } from "../common/has-action";
import type { LovelaceBadge, LovelaceBadgeEditor } from "../types";
import type { EntityBadgeConfig } from "./types";

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
      return stateColor(this, stateObj);
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
        <ha-badge .label=${entityId} class="error">
          <ha-svg-icon
            slot="icon"
            .hass=${this.hass}
            .path=${mdiAlertCircle}
          ></ha-svg-icon>
          ${this.hass.localize("ui.badge.entity.not_found")}
        </ha-badge>
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

    const name = this._config.name || computeStateName(stateObj);

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
      <ha-badge
        .type=${this.hasAction ? "button" : "badge"}
        @action=${this._handleAction}
        .actionHandler=${actionHandler({
          hasHold: hasAction(this._config!.hold_action),
          hasDoubleClick: hasAction(this._config!.double_tap_action),
        })}
        .label=${label}
        .iconOnly=${!content}
        style=${styleMap(style)}
        class=${classMap({ active })}
      >
        ${showIcon
          ? imageUrl
            ? html`<img slot="icon" src=${imageUrl} aria-hidden />`
            : html`
                <ha-state-icon
                  slot="icon"
                  .hass=${this.hass}
                  .stateObj=${stateObj}
                  .icon=${this._config.icon}
                ></ha-state-icon>
              `
          : nothing}
        ${content}
      </ha-badge>
    `;
  }

  private _handleAction(ev: ActionHandlerEvent) {
    handleAction(this, this.hass!, this._config!, ev.detail.action!);
  }

  static styles = css`
    ha-badge {
      --badge-color: var(--state-inactive-color);
    }
    ha-badge.error {
      --badge-color: var(--red-color);
    }
    ha-badge.active {
      --badge-color: var(--primary-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-entity-badge": HuiEntityBadge;
  }
}

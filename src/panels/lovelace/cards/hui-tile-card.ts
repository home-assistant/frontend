import type { HassEntity } from "home-assistant-js-websocket";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import memoizeOne from "memoize-one";
import { computeCssColor } from "../../../common/color/compute-color";
import { hsv2rgb, rgb2hex, rgb2hsv } from "../../../common/color/convert-color";
import { DOMAINS_TOGGLE } from "../../../common/const";
import { computeDomain } from "../../../common/entity/compute_domain";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { stateActive } from "../../../common/entity/state_active";
import { stateColorCss } from "../../../common/entity/state_color";
import { cameraUrlWithWidthHeight } from "../../../data/camera";
import type { ActionHandlerEvent } from "../../../data/lovelace/action_handler";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeatureContext } from "../card-features/types";
import { findEntities } from "../common/find-entities";
import { handleAction } from "../common/handle-action";
import { hasAction } from "../common/has-action";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import "../components/hui-tile";
import type {
  LovelaceCard,
  LovelaceCardEditor,
  LovelaceGridOptions,
} from "../types";
import { renderTileBadge } from "./tile/badges/tile-badge";
import type { TileCardConfig } from "./types";

export const getEntityDefaultTileIconAction = (entityId: string) => {
  const domain = computeDomain(entityId);
  const supportsIconAction =
    DOMAINS_TOGGLE.has(domain) ||
    ["button", "input_button", "scene"].includes(domain);

  return supportsIconAction ? "toggle" : "none";
};

@customElement("hui-tile-card")
export class HuiTileCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("../editor/config-elements/hui-tile-card-editor");
    return document.createElement("hui-tile-card-editor");
  }

  public static getStubConfig(
    hass: HomeAssistant,
    entities: string[],
    entitiesFallback: string[]
  ): TileCardConfig {
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
      type: "tile",
      entity: foundEntities[0] || "",
    };
  }

  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: TileCardConfig;

  @state() private _featureContext: LovelaceCardFeatureContext = {};

  public setConfig(config: TileCardConfig): void {
    if (!config.entity) {
      throw new Error("Specify an entity");
    }

    this._config = {
      tap_action: {
        action: "more-info",
      },
      icon_tap_action: {
        action: getEntityDefaultTileIconAction(config.entity),
      },
      ...config,
    };
    this._featureContext = {
      entity_id: config.entity,
    };
  }

  public getCardSize(): number {
    const featuresPosition = this._config?.vertical
      ? "bottom"
      : this._config?.features_position || "bottom";
    const featuresCount = this._config?.features?.length || 0;
    return (
      1 +
      (this._config?.vertical ? 1 : 0) +
      (featuresPosition === "inline" ? 0 : featuresCount)
    );
  }

  public getGridOptions(): LovelaceGridOptions {
    const columns = 6;
    let min_columns = 6;
    let rows = 1;
    const featurePosition = this._config?.vertical
      ? "bottom"
      : this._config?.features_position || "bottom";
    const featuresCount = this._config?.features?.length || 0;
    if (featuresCount) {
      if (featurePosition === "inline") {
        min_columns = 12;
      } else {
        rows += featuresCount;
      }
    }

    if (this._config?.vertical) {
      rows++;
      min_columns = 3;
    }
    return {
      columns,
      rows,
      min_columns,
      min_rows: rows,
    };
  }

  private _handleAction(ev: ActionHandlerEvent) {
    handleAction(this, this.hass!, this._config!, ev.detail.action!);
  }

  private _handleIconAction(ev: CustomEvent) {
    ev.stopPropagation();
    const config = {
      entity: this._config!.entity,
      tap_action: this._config!.icon_tap_action,
      hold_action: this._config!.icon_hold_action,
      double_tap_action: this._config!.icon_double_tap_action,
    };
    handleAction(this, this.hass!, config, ev.detail.action!);
  }

  private _onAction = (ev: ActionHandlerEvent) => {
    this._handleAction(ev);
  };

  private _onIconAction = (ev: CustomEvent) => {
    this._handleIconAction(ev);
  };

  private _getImageUrl(entity: HassEntity): string | undefined {
    const entityPicture =
      entity.attributes.entity_picture_local ||
      entity.attributes.entity_picture;

    if (!entityPicture) return undefined;

    let imageUrl = this.hass!.hassUrl(entityPicture);
    if (computeDomain(entity.entity_id) === "camera") {
      imageUrl = cameraUrlWithWidthHeight(imageUrl, 80, 80);
    }

    return imageUrl;
  }

  private _computeStateColor(entity: HassEntity, color?: string) {
    // Use custom color if active
    if (color) {
      return stateActive(entity) ? computeCssColor(color) : undefined;
    }

    // Use default color for person/device_tracker because color is on the badge
    if (
      computeDomain(entity.entity_id) === "person" ||
      computeDomain(entity.entity_id) === "device_tracker"
    ) {
      return undefined;
    }

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

  private get _hasCardAction() {
    return (
      !this._config?.tap_action ||
      hasAction(this._config?.tap_action) ||
      hasAction(this._config?.hold_action) ||
      hasAction(this._config?.double_tap_action)
    );
  }

  private get _hasIconAction() {
    return (
      !this._config?.icon_tap_action || hasAction(this._config?.icon_tap_action)
    );
  }

  private _featurePosition = memoizeOne((config: TileCardConfig) => {
    if (config.vertical) {
      return "bottom";
    }
    return config.features_position || "bottom";
  });

  private _displayedFeatures = memoizeOne((config: TileCardConfig) => {
    const features = config.features || [];
    const featurePosition = this._featurePosition(config);

    if (featurePosition === "inline") {
      return features.slice(0, 1);
    }
    return features;
  });

  protected render() {
    if (!this._config || !this.hass) {
      return nothing;
    }
    const entityId = this._config.entity;
    const stateObj = entityId ? this.hass.states[entityId] : undefined;

    if (!stateObj) {
      return html`
        <hui-warning .hass=${this.hass}>
          ${createEntityNotFoundWarning(this.hass, this._config.entity)}
        </hui-warning>
      `;
    }

    const name = this._config.name || computeStateName(stateObj);
    const color = this._computeStateColor(stateObj, this._config.color);
    const domain = computeDomain(stateObj.entity_id);

    const stateDisplay = this._config.hide_state
      ? nothing
      : html`
          <state-display
            .stateObj=${stateObj}
            .hass=${this.hass}
            .content=${this._config.state_content}
            .name=${this._config.name}
          >
          </state-display>
        `;

    const imageUrl = this._config.show_entity_picture
      ? this._getImageUrl(stateObj)
      : undefined;

    const features = this._displayedFeatures(this._config);

    return html`
      <hui-tile
        ?vertical=${this._config.vertical}
        color=${ifDefined(color)}
        .hasCardAction=${this._hasCardAction}
        .hasIconAction=${this._hasIconAction}
        .onAction=${this._onAction}
        .onIconAction=${this._onIconAction}
        .tapAction=${this._config.tap_action}
        .holdAction=${this._config.hold_action}
        .doubleTapAction=${this._config.double_tap_action}
        .iconTapAction=${this._config.icon_tap_action}
        .iconHoldAction=${this._config.icon_hold_action}
        .iconDoubleTapAction=${this._config.icon_double_tap_action}
        .featurePosition=${this._featurePosition(this._config)}
      >
        <ha-tile-icon
          slot="icon"
          role=${ifDefined(this._hasIconAction ? "button" : undefined)}
          tabindex=${ifDefined(this._hasIconAction ? "0" : undefined)}
          .imageUrl=${imageUrl}
          data-domain=${domain}
          data-state=${stateObj.state}
          class=${classMap({ image: Boolean(imageUrl) })}
        >
          <ha-state-icon
            slot="icon"
            .icon=${this._config.icon}
            .stateObj=${stateObj}
            .hass=${this.hass}
          ></ha-state-icon>
          ${renderTileBadge(stateObj, this.hass)}
        </ha-tile-icon>
        <ha-tile-info slot="info" id="info">
          <span slot="primary" class="primary">${name}</span>
          ${stateDisplay
            ? html`<span slot="secondary">${stateDisplay}</span>`
            : nothing}
        </ha-tile-info>
        ${features.length
          ? html`
              <hui-card-features
                slot="features"
                .hass=${this.hass}
                .context=${this._featureContext}
                .color=${this._config.color}
                .features=${features}
              ></hui-card-features>
            `
          : nothing}
      </hui-tile>
    `;
  }

  static styles = css`
    ha-tile-icon[data-domain="alarm_control_panel"][data-state="pending"],
    ha-tile-icon[data-domain="alarm_control_panel"][data-state="arming"],
    ha-tile-icon[data-domain="alarm_control_panel"][data-state="triggered"],
    ha-tile-icon[data-domain="lock"][data-state="jammed"] {
      animation: pulse 1s infinite;
    }

    /* Make sure we display the whole image */
    ha-tile-icon.image[data-domain="update"] {
      --tile-icon-border-radius: 0;
    }
    /* Make sure we display the almost the whole image but it often use text */
    ha-tile-icon.image[data-domain="media_player"] {
      --tile-icon-border-radius: min(
        var(--ha-tile-icon-border-radius, var(--ha-border-radius-sm)),
        var(--ha-border-radius-sm)
      );
    }

    ha-tile-badge {
      position: absolute;
      top: 3px;
      right: 3px;
      inset-inline-end: 3px;
      inset-inline-start: initial;
    }

    @keyframes pulse {
      0% {
        opacity: 1;
      }
      50% {
        opacity: 0;
      }
      100% {
        opacity: 1;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-tile-card": HuiTileCard;
  }
}

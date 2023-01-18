import { memoize } from "@fullcalendar/common";
import { Ripple } from "@material/mwc-ripple";
import { RippleHandlers } from "@material/mwc-ripple/ripple-handlers";
import { mdiExclamationThick, mdiHelp } from "@mdi/js";
import { HassEntity } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import {
  customElement,
  eventOptions,
  property,
  queryAsync,
  state,
} from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { computeCssColor } from "../../../common/color/compute-color";
import { hsv2rgb, rgb2hsv } from "../../../common/color/convert-color";
import { DOMAINS_TOGGLE } from "../../../common/const";
import { computeDomain } from "../../../common/entity/compute_domain";
import { computeStateDisplay } from "../../../common/entity/compute_state_display";
import { stateActive } from "../../../common/entity/state_active";
import { stateColorCss } from "../../../common/entity/state_color";
import { stateIconPath } from "../../../common/entity/state_icon_path";
import { blankBeforePercent } from "../../../common/translations/blank_before_percent";
import "../../../components/ha-card";
import "../../../components/tile/ha-tile-badge";
import "../../../components/tile/ha-tile-icon";
import "../../../components/tile/ha-tile-image";
import "../../../components/tile/ha-tile-info";
import { cameraUrlWithWidthHeight } from "../../../data/camera";
import { CoverEntity } from "../../../data/cover";
import { isUnavailableState, ON } from "../../../data/entity";
import { FanEntity } from "../../../data/fan";
import { LightEntity } from "../../../data/light";
import { ActionHandlerEvent } from "../../../data/lovelace";
import { SENSOR_DEVICE_CLASS_TIMESTAMP } from "../../../data/sensor";
import { HomeAssistant } from "../../../types";
import { actionHandler } from "../common/directives/action-handler-directive";
import { findEntities } from "../common/find-entities";
import { handleAction } from "../common/handle-action";
import "../components/hui-timestamp-display";
import { createTileFeatureElement } from "../create-element/create-tile-feature-element";
import { supportsTileFeature } from "../tile-features/tile-features";
import { LovelaceTileFeatureConfig } from "../tile-features/types";
import {
  LovelaceCard,
  LovelaceCardEditor,
  LovelaceTileFeature,
} from "../types";
import { HuiErrorCard } from "./hui-error-card";
import { computeTileBadge } from "./tile/badges/tile-badge";
import { ThermostatCardConfig, TileCardConfig } from "./types";

const TIMESTAMP_STATE_DOMAINS = ["button", "input_button", "scene"];

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

  public setConfig(config: ThermostatCardConfig): void {
    if (!config.entity) {
      throw new Error("Specify an entity");
    }

    const domain = computeDomain(config.entity);
    const supportsIconAction =
      DOMAINS_TOGGLE.has(domain) ||
      ["button", "input_button", "scene"].includes(domain);

    this._config = {
      tap_action: {
        action: "more-info",
      },
      icon_tap_action: {
        action: supportsIconAction ? "toggle" : "more-info",
      },
      ...config,
    };
  }

  public getCardSize(): number {
    return 1;
  }

  private _handleAction(ev: ActionHandlerEvent) {
    handleAction(this, this.hass!, this._config!, ev.detail.action!);
  }

  private _handleIconAction(ev: CustomEvent) {
    ev.stopPropagation();
    const config = {
      entity: this._config!.entity,
      tap_action: this._config!.icon_tap_action,
    };
    handleAction(this, this.hass!, config, "tap");
  }

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

  private _computeStateColor = memoize((entity: HassEntity, color?: string) => {
    // Use custom color if active
    if (color) {
      return stateActive(entity) ? computeCssColor(color) : undefined;
    }

    // Use default color for person/device_tracker because color is on the badge
    if (
      computeDomain(entity.entity_id) === "person" ||
      computeDomain(entity.entity_id) === "device_tracker"
    ) {
      return "rgb(var(--rgb-state-default-color))";
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
      return `rgb(${hsv2rgb(hsvColor).join(",")})`;
    }

    // Fallback to state color
    const stateColor =
      stateColorCss(entity) ?? "var(--rgb-state-default-color)";
    return `rgb(${stateColor})`;
  });

  private _computeStateDisplay(stateObj: HassEntity): TemplateResult | string {
    const domain = computeDomain(stateObj.entity_id);

    if (
      (stateObj.attributes.device_class === SENSOR_DEVICE_CLASS_TIMESTAMP ||
        TIMESTAMP_STATE_DOMAINS.includes(domain)) &&
      !isUnavailableState(stateObj.state)
    ) {
      return html`
        <hui-timestamp-display
          .hass=${this.hass}
          .ts=${new Date(stateObj.state)}
          format="relative"
          capitalize
        ></hui-timestamp-display>
      `;
    }

    if (domain === "light" && stateObj.state === ON) {
      const brightness = (stateObj as LightEntity).attributes.brightness;
      if (brightness) {
        return `${Math.round((brightness * 100) / 255)}${blankBeforePercent(
          this.hass!.locale
        )}%`;
      }
    }

    if (domain === "fan" && stateObj.state === ON) {
      const speed = (stateObj as FanEntity).attributes.percentage;
      if (speed) {
        return `${Math.round(speed)}${blankBeforePercent(this.hass!.locale)}%`;
      }
    }

    const stateDisplay = computeStateDisplay(
      this.hass!.localize,
      stateObj,
      this.hass!.locale,
      this.hass!.entities
    );

    if (domain === "cover" && stateObj.state === "open") {
      const position = (stateObj as CoverEntity).attributes.current_position;
      if (position && position !== 100) {
        return `${stateDisplay} - ${Math.round(position)}${blankBeforePercent(
          this.hass!.locale
        )}%`;
      }
    }
    return stateDisplay;
  }

  @queryAsync("mwc-ripple") private _ripple!: Promise<Ripple | null>;

  @state() private _shouldRenderRipple = false;

  private _rippleHandlers: RippleHandlers = new RippleHandlers(() => {
    this._shouldRenderRipple = true;
    return this._ripple;
  });

  @eventOptions({ passive: true })
  private handleRippleActivate(evt?: Event) {
    this._rippleHandlers.startPress(evt);
  }

  private handleRippleDeactivate() {
    this._rippleHandlers.endPress();
  }

  private handleRippleMouseEnter() {
    this._rippleHandlers.startHover();
  }

  private handleRippleMouseLeave() {
    this._rippleHandlers.endHover();
  }

  protected render(): TemplateResult {
    if (!this._config || !this.hass) {
      return html``;
    }
    const entityId = this._config.entity;
    const stateObj = entityId ? this.hass.states[entityId] : undefined;

    if (!stateObj) {
      return html`
        <ha-card class="disabled">
          <div class="tile">
            <div class="icon-container">
              <ha-tile-icon class="icon" .iconPath=${mdiHelp}></ha-tile-icon>
              <ha-tile-badge
                class="badge"
                .iconPath=${mdiExclamationThick}
                style=${styleMap({
                  "--tile-badge-background-color": `rgb(var(--rgb-red-color))`,
                })}
              ></ha-tile-badge>
            </div>
            <ha-tile-info
              class="info"
              .primary=${entityId}
              secondary=${this.hass.localize("ui.card.tile.not_found")}
            ></ha-tile-info>
          </div>
        </ha-card>
      `;
    }

    const icon = this._config.icon || stateObj.attributes.icon;
    const iconPath = stateIconPath(stateObj);

    const name = this._config.name || stateObj.attributes.friendly_name;

    const stateDisplay = this._computeStateDisplay(stateObj);

    const color = this._computeStateColor(stateObj, this._config.color);

    const style = {
      "--tile-color": color,
    };

    const imageUrl = this._config.show_entity_picture
      ? this._getImageUrl(stateObj)
      : undefined;
    const badge = computeTileBadge(stateObj, this.hass);

    const supportedFeatures = this._config.features?.filter((feature) =>
      supportsTileFeature(stateObj, feature.type)
    );

    return html`
      <ha-card style=${styleMap(style)}>
        ${this._shouldRenderRipple ? html`<mwc-ripple></mwc-ripple>` : null}
        <div class="tile">
          <div
            class="icon-container"
            role="button"
            tabindex="0"
            @action=${this._handleIconAction}
            .actionHandler=${actionHandler()}
          >
            ${imageUrl
              ? html`
                  <ha-tile-image
                    class="icon"
                    .imageUrl=${imageUrl}
                  ></ha-tile-image>
                `
              : html`
                  <ha-tile-icon
                    class="icon"
                    .icon=${icon}
                    .iconPath=${iconPath}
                  ></ha-tile-icon>
                `}
            ${badge
              ? html`
                  <ha-tile-badge
                    class="badge"
                    .icon=${badge.icon}
                    .iconPath=${badge.iconPath}
                    style=${styleMap({
                      "--tile-badge-background-color": `rgb(${badge.color})`,
                    })}
                  ></ha-tile-badge>
                `
              : null}
          </div>
          <ha-tile-info
            class="info"
            .primary=${name}
            .secondary=${stateDisplay}
            @action=${this._handleAction}
            .actionHandler=${actionHandler()}
            role="button"
            tabindex="0"
            @mousedown=${this.handleRippleActivate}
            @mouseup=${this.handleRippleDeactivate}
            @mouseenter=${this.handleRippleMouseEnter}
            @mouseleave=${this.handleRippleMouseLeave}
            @touchstart=${this.handleRippleActivate}
            @touchend=${this.handleRippleDeactivate}
            @touchcancel=${this.handleRippleDeactivate}
          ></ha-tile-info>
        </div>
        ${supportedFeatures?.length
          ? html`
              <div class="features">
                ${supportedFeatures.map((featureConf) =>
                  this.renderFeature(featureConf, stateObj)
                )}
              </div>
            `
          : null}
      </ha-card>
    `;
  }

  private _featuresElements = new WeakMap<
    LovelaceTileFeatureConfig,
    LovelaceTileFeature | HuiErrorCard
  >();

  private _getFeatureElement(feature: LovelaceTileFeatureConfig) {
    if (!this._featuresElements.has(feature)) {
      const element = createTileFeatureElement(feature);
      this._featuresElements.set(feature, element);
      return element;
    }

    return this._featuresElements.get(feature)!;
  }

  private renderFeature(
    featureConf: LovelaceTileFeatureConfig,
    stateObj: HassEntity
  ): TemplateResult {
    const element = this._getFeatureElement(featureConf);

    if (this.hass) {
      element.hass = this.hass;
      (element as LovelaceTileFeature).stateObj = stateObj;
    }

    return html`<div class="feature">${element}</div>`;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        --tile-color: rgb(var(--rgb-state-inactive-color));
        -webkit-tap-highlight-color: transparent;
      }
      ha-card:has(ha-tile-info:focus-visible) {
        border-color: var(--tile-color);
        box-shadow: 0 0 0 1px var(--tile-color);
      }
      ha-card {
        --mdc-ripple-color: var(--tile-color);
        height: 100%;
        overflow: hidden;
        // For safari overflow hidden
        z-index: 0;
      }
      ha-card.disabled {
        --tile-color: rgb(var(--rgb-disabled-color));
      }
      [role="button"] {
        cursor: pointer;
      }
      [role="button"]:focus {
        outline: none;
      }
      .tile {
        display: flex;
        flex-direction: row;
        align-items: center;
      }
      .icon-container {
        position: relative;
        flex: none;
        margin-right: 12px;
        margin-inline-start: 12px;
        margin-inline-end: initial;
        direction: var(--direction);
        transition: transform 180ms ease-in-out;
      }
      .icon-container .icon {
        --tile-icon-color: var(--tile-color);
      }
      .icon-container .badge {
        position: absolute;
        top: -3px;
        right: -3px;
      }
      .icon-container[role="button"]:focus-visible,
      .icon-container[role="button"]:active {
        transform: scale(1.2);
      }
      .info {
        position: relative;
        padding: 12px;
        flex: 1;
        min-width: 0;
        min-height: 40px;
        transition: background-color 180ms ease-in-out;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-tile-card": HuiTileCard;
  }
}

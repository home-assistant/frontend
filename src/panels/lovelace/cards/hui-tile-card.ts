import { Ripple } from "@material/mwc-ripple";
import { RippleHandlers } from "@material/mwc-ripple/ripple-handlers";
import { mdiExclamationThick, mdiHelp } from "@mdi/js";
import { HassEntity } from "home-assistant-js-websocket";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  TemplateResult,
  nothing,
} from "lit";
import {
  customElement,
  eventOptions,
  property,
  queryAsync,
  state,
} from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { computeCssColor } from "../../../common/color/compute-color";
import { hsv2rgb, rgb2hex, rgb2hsv } from "../../../common/color/convert-color";
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
import {
  computeCoverPositionStateDisplay,
  CoverEntity,
} from "../../../data/cover";
import { isUnavailableState } from "../../../data/entity";
import { computeFanSpeedStateDisplay, FanEntity } from "../../../data/fan";
import { LightEntity } from "../../../data/light";
import { ActionHandlerEvent } from "../../../data/lovelace";
import { SENSOR_DEVICE_CLASS_TIMESTAMP } from "../../../data/sensor";
import { HomeAssistant } from "../../../types";
import { actionHandler } from "../common/directives/action-handler-directive";
import { findEntities } from "../common/find-entities";
import { handleAction } from "../common/handle-action";
import "../components/hui-timestamp-display";
import { createTileFeatureElement } from "../create-element/create-tile-feature-element";
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

  private _computeStateColor = memoizeOne(
    (entity: HassEntity, color?: string) => {
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
  );

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

    if (domain === "light" && stateActive(stateObj)) {
      const brightness = (stateObj as LightEntity).attributes.brightness;
      if (brightness) {
        return `${Math.round((brightness * 100) / 255)}${blankBeforePercent(
          this.hass!.locale
        )}%`;
      }
    }

    if (domain === "fan" && stateActive(stateObj)) {
      const speedStateDisplay = computeFanSpeedStateDisplay(
        stateObj as FanEntity,
        this.hass!.locale
      );
      if (speedStateDisplay) {
        return speedStateDisplay;
      }
    }

    const stateDisplay = computeStateDisplay(
      this.hass!.localize,
      stateObj,
      this.hass!.locale,
      this.hass!.entities
    );

    if (domain === "cover" && stateActive(stateObj)) {
      const positionStateDisplay = computeCoverPositionStateDisplay(
        stateObj as CoverEntity,
        this.hass!.locale
      );

      if (positionStateDisplay) {
        return `${stateDisplay} ⸱ ${positionStateDisplay}`;
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

  protected render() {
    if (!this._config || !this.hass) {
      return nothing;
    }
    const entityId = this._config.entity;
    const stateObj = entityId ? this.hass.states[entityId] : undefined;

    const contentClasses = { vertical: Boolean(this._config.vertical) };

    if (!stateObj) {
      return html`
        <ha-card>
          <div class="tile">
            <div class="content ${classMap(contentClasses)}">
              <div class="icon-container">
                <ha-tile-icon class="icon" .iconPath=${mdiHelp}></ha-tile-icon>
                <ha-tile-badge
                  class="badge"
                  .iconPath=${mdiExclamationThick}
                  style=${styleMap({
                    "--tile-badge-background-color": `var(--red-color)`,
                  })}
                ></ha-tile-badge>
              </div>
              <ha-tile-info
                class="info"
                .primary=${entityId}
                secondary=${this.hass.localize("ui.card.tile.not_found")}
              ></ha-tile-info>
            </div>
          </div>
        </ha-card>
      `;
    }

    const icon = this._config.icon || stateObj.attributes.icon;
    const iconPath = stateIconPath(stateObj);

    const name = this._config.name || stateObj.attributes.friendly_name;

    const stateDisplay = this._computeStateDisplay(stateObj);

    const active = stateActive(stateObj);
    const color = this._computeStateColor(stateObj, this._config.color);
    const domain = computeDomain(stateObj.entity_id);

    const style = {
      "--tile-color": color,
    };

    const imageUrl = this._config.show_entity_picture
      ? this._getImageUrl(stateObj)
      : undefined;
    const badge = computeTileBadge(stateObj, this.hass);

    return html`
      <ha-card style=${styleMap(style)} class=${classMap({ active })}>
        ${this._shouldRenderRipple ? html`<mwc-ripple></mwc-ripple>` : nothing}
        <div class="tile">
          <div
            class="background"
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
          ></div>
          <div class="content ${classMap(contentClasses)}">
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
                      data-domain=${ifDefined(domain)}
                      data-state=${ifDefined(stateObj?.state)}
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
                        "--tile-badge-background-color": badge.color,
                      })}
                    ></ha-tile-badge>
                  `
                : nothing}
            </div>
            <ha-tile-info
              class="info"
              .primary=${name}
              .secondary=${stateDisplay}
            ></ha-tile-info>
          </div>
        </div>
        <div class="features">
          ${this._config.features?.map((featureConf) =>
            this.renderFeature(featureConf, stateObj)
          )}
        </div>
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

    return html`${element}`;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        --tile-color: var(--state-inactive-color);
        -webkit-tap-highlight-color: transparent;
      }
      ha-card:has(.background:focus-visible) {
        --shadow-default: var(--ha-card-box-shadow, 0 0 0 0 transparent);
        --shadow-focus: 0 0 0 1px var(--tile-color);
        border-color: var(--tile-color);
        box-shadow: var(--shadow-default), var(--shadow-focus);
      }
      ha-card {
        --mdc-ripple-color: var(--tile-color);
        height: 100%;
        z-index: 0;
        overflow: hidden;
        transition: box-shadow 180ms ease-in-out, border-color 180ms ease-in-out;
      }
      ha-card.active {
        --tile-color: var(--state-icon-color);
      }
      [role="button"] {
        cursor: pointer;
      }
      [role="button"]:focus {
        outline: none;
      }
      .background {
        position: absolute;
        top: 0;
        left: 0;
        bottom: 0;
        right: 0;
      }
      .content {
        display: flex;
        flex-direction: row;
        align-items: center;
      }
      .vertical {
        flex-direction: column;
        text-align: center;
      }
      .vertical .icon-container {
        margin-top: 12px;
        margin-right: 0;
        margin-inline-start: initial;
        margin-inline-end: initial;
      }
      .vertical .info {
        width: 100%;
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
        user-select: none;
        -ms-user-select: none;
        -webkit-user-select: none;
        -moz-user-select: none;
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
        transition: background-color 180ms ease-in-out;
        box-sizing: border-box;
        pointer-events: none;
      }
      .features {
        position: relative;
      }

      ha-tile-icon[data-domain="alarm_control_panel"][data-state="pending"],
      ha-tile-icon[data-domain="alarm_control_panel"][data-state="arming"],
      ha-tile-icon[data-domain="alarm_control_panel"][data-state="triggered"],
      ha-tile-icon[data-domain="lock"][data-state="jammed"] {
        animation: pulse 1s infinite;
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
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-tile-card": HuiTileCard;
  }
}

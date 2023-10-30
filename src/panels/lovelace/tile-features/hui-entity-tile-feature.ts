import { HassEntity } from "home-assistant-js-websocket";
import {
  css,
  html,
  LitElement,
  nothing,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import { styleMap } from "lit/directives/style-map";
import { HomeAssistant } from "../../../types";
import { LovelaceTileFeature, LovelaceTileFeatureEditor } from "../types";
import { EntityTileFeatureConfig } from "./types";
import "../../../components/ha-alert";
import "../../../components/ha-icon";
import { handleAction } from "../common/handle-action";
import { computeDomain } from "../../../common/entity/compute_domain";
import { cameraUrlWithWidthHeight } from "../../../data/camera";
import { ActionHandlerEvent } from "../../../data/lovelace";
import { stateActive } from "../../../common/entity/state_active";
import { hsv2rgb, rgb2hex, rgb2hsv } from "../../../common/color/convert-color";
import { stateColorCss } from "../../../common/entity/state_color";
import { SENSOR_DEVICE_CLASS_TIMESTAMP } from "../../../data/sensor";
import { isUnavailableState } from "../../../data/entity";
import { ensureArray } from "../../../common/array/ensure-array";
import { stateIconPath } from "../../../common/entity/state_icon_path";
import { computeTileBadge } from "../cards/tile/badges/tile-badge";
import { actionHandler } from "../common/directives/action-handler-directive";
import { computeCssColor } from "../../../common/color/compute-color";
import { TIMESTAMP_STATE_DOMAINS } from "../cards/hui-tile-card";

export const supportsEntityTileFeature = () => true;

@customElement("hui-entity-tile-feature")
class HuiEntityTileFeature extends LitElement implements LovelaceTileFeature {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?: HassEntity;

  @state() private _config?: EntityTileFeatureConfig;

  static getStubConfig(): EntityTileFeatureConfig {
    return {
      type: "entity",
      entity: "",
    };
  }

  public static async getConfigElement(): Promise<LovelaceTileFeatureEditor> {
    await import("../editor/config-elements/hui-entity-tile-feature-editor");
    return document.createElement("hui-entity-tile-feature-editor");
  }

  public setConfig(config: EntityTileFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  protected willUpdate(changedProp: PropertyValues): void {
    super.willUpdate(changedProp);
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

  private _renderStateContent(
    stateObj: HassEntity,
    stateContent: string | string[]
  ) {
    const contents = ensureArray(stateContent);

    const values = contents
      .map((content) => {
        if (content === "state") {
          const domain = computeDomain(stateObj.entity_id);
          if (
            (stateObj.attributes.device_class ===
              SENSOR_DEVICE_CLASS_TIMESTAMP ||
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

          return this.hass!.formatEntityState(stateObj);
        }
        if (content === "last-changed") {
          return html`
            <ha-relative-time
              .hass=${this.hass}
              .datetime=${stateObj.last_changed}
            ></ha-relative-time>
          `;
        }
        if (stateObj.attributes[content] == null) {
          return undefined;
        }
        return this.hass!.formatEntityAttributeValue(stateObj, content);
      })
      .filter(Boolean);

    if (!values.length) {
      return html`${this.hass!.formatEntityState(stateObj)}`;
    }

    return html`
      ${values.map(
        (value, index, array) =>
          html`${value}${index < array.length - 1 ? " ⸱ " : nothing}`
      )}
    `;
  }

  private _renderState(stateObj: HassEntity): TemplateResult | typeof nothing {
    const domain = computeDomain(stateObj.entity_id);
    const active = stateActive(stateObj);

    if (domain === "light" && active) {
      return this._renderStateContent(stateObj, ["brightness"]);
    }

    if (domain === "fan" && active) {
      return this._renderStateContent(stateObj, ["percentage"]);
    }

    if (domain === "cover" && active) {
      return this._renderStateContent(stateObj, ["state", "current_position"]);
    }

    if (domain === "humidifier") {
      return this._renderStateContent(stateObj, ["state", "current_humidity"]);
    }

    if (domain === "climate") {
      return this._renderStateContent(stateObj, [
        "state",
        "current_temperature",
      ]);
    }

    return this._renderStateContent(stateObj, "state");
  }

  protected render(): TemplateResult | null {
    if (
      !this._config ||
      !this.hass ||
      !this.stateObj ||
      !supportsEntityTileFeature()
    ) {
      return null;
    }

    const entity: HassEntity | undefined =
      this.hass!.states[this._config.entity];

    if (!entity) {
      return html`
        <div class="container">
          <ha-alert alert-type="warning">
            ${this.hass.localize("ui.panel.lovelace.warning.entity_not_found", {
              entity: this._config.entity,
            })}
          </ha-alert>
        </div>
      `;
    }

    const icon = this._config.icon || entity.attributes.icon;
    const iconPath = stateIconPath(entity);

    const name = this._config.name || entity.attributes.friendly_name;

    const localizedState = this._config.hide_state
      ? nothing
      : this._config.state_content
      ? this._renderStateContent(entity, this._config.state_content)
      : this._renderState(entity);

    const active = stateActive(entity);
    const color = this._computeStateColor(entity, this._config.color);
    const domain = computeDomain(entity.entity_id);

    const style = {
      "--tile-color": color,
    };

    const imageUrl = this._config.show_entity_picture
      ? this._getImageUrl(entity)
      : undefined;
    const badge = computeTileBadge(entity, this.hass);

    return html`<div class="container">
      <div
        style=${styleMap(style)}
        class=${classMap({ main: true, active })}
        @action=${this._handleAction}
        .actionHandler=${actionHandler()}
        role="button"
        tabindex="0"
        aria-labelledby="info"
      >
        <div class="content">
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
                    data-state=${ifDefined(entity?.state)}
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
            id="info"
            class="info"
            .primary=${name}
            .secondary=${localizedState}
          ></ha-tile-info>
        </div>
      </div>
    </div>`;
  }

  static get styles() {
    return css`
      .container {
        padding: 0 12px 12px 12px;
        width: auto;
      }
      .main {
        border-radius: var(--ha-card-border-radius, 12px);
      }

      :host {
        --tile-color: var(--state-inactive-color);
        -webkit-tap-highlight-color: transparent;
      }
      .main:focus-visible {
        --shadow-default: var(--ha-card-box-shadow, 0 0 0 0 transparent);
        --shadow-focus: 0 0 0 1px var(--tile-color);
        border-color: var(--tile-color);
        box-shadow: var(--shadow-default), var(--shadow-focus);
      }
      .main {
        --mdc-ripple-color: var(--tile-color);
        height: 100%;
        overflow: hidden;
        transition:
          box-shadow 180ms ease-in-out,
          border-color 180ms ease-in-out;
      }
      .main.active {
        --tile-color: var(--state-icon-color);
      }
      [role="button"] {
        cursor: pointer;
      }
      [role="button"]:focus {
        outline: none;
      }
      .content {
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
    "hui-entity-tile-feature": HuiEntityTileFeature;
  }
}

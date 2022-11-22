import { memoize } from "@fullcalendar/common";
import { mdiHelp } from "@mdi/js";
import { HassEntity } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { computeRgbColor } from "../../../common/color/compute-color";
import { hsv2rgb, rgb2hsv } from "../../../common/color/convert-color";
import { DOMAINS_TOGGLE } from "../../../common/const";
import { computeDomain } from "../../../common/entity/compute_domain";
import { computeStateDisplay } from "../../../common/entity/compute_state_display";
import { stateActive } from "../../../common/entity/state_active";
import { stateColorCss } from "../../../common/entity/state_color";
import { stateIconPath } from "../../../common/entity/state_icon_path";
import "../../../components/ha-card";
import "../../../components/tile/ha-tile-badge";
import "../../../components/tile/ha-tile-icon";
import "../../../components/tile/ha-tile-image";
import "../../../components/tile/ha-tile-info";
import { cameraUrlWithWidthHeight } from "../../../data/camera";
import { UNAVAILABLE_STATES } from "../../../data/entity";
import { ActionHandlerEvent } from "../../../data/lovelace";
import { SENSOR_DEVICE_CLASS_TIMESTAMP } from "../../../data/sensor";
import { HomeAssistant } from "../../../types";
import { actionHandler } from "../common/directives/action-handler-directive";
import { findEntities } from "../common/find-entities";
import { handleAction } from "../common/handle-action";
import "../components/hui-timestamp-display";
import { createTileExtraElement } from "../create-element/create-tile-extra-element";
import { supportsTileExtra } from "../tile-extra/tile-extras";
import { LovelaceTileExtraConfig } from "../tile-extra/types";
import { LovelaceCard, LovelaceCardEditor, LovelaceTileExtra } from "../types";
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

  private _handleIconAction() {
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
    if (!stateActive(entity)) {
      return undefined;
    }

    if (color) {
      return computeRgbColor(color);
    }

    let stateColor = stateColorCss(entity);

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
      stateColor = hsv2rgb(hsvColor).join(",");
    }

    return stateColor;
  });

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
              <ha-tile-icon .iconPath=${mdiHelp}></ha-tile-icon>
            </div>
            <ha-tile-info
              .primary=${entityId}
              secondary=${this.hass.localize("ui.card.tile.not_found")}
            ></ha-tile-info>
          </div>
        </ha-card>
      `;
    }

    const domain = computeDomain(stateObj.entity_id);

    const icon = this._config.icon || stateObj.attributes.icon;
    const iconPath = stateIconPath(stateObj);

    const name = this._config.name || stateObj.attributes.friendly_name;
    const stateDisplay =
      (stateObj.attributes.device_class === SENSOR_DEVICE_CLASS_TIMESTAMP ||
        TIMESTAMP_STATE_DOMAINS.includes(domain)) &&
      !UNAVAILABLE_STATES.includes(stateObj.state)
        ? html`
            <hui-timestamp-display
              .hass=${this.hass}
              .ts=${new Date(stateObj.state)}
              .format=${this._config.format}
              capitalize
            ></hui-timestamp-display>
          `
        : computeStateDisplay(this.hass!.localize, stateObj, this.hass.locale);

    const color = this._computeStateColor(stateObj, this._config.color);

    const style = {
      "--tile-color": color,
    };

    const imageUrl = this._config.show_entity_picture
      ? this._getImageUrl(stateObj)
      : undefined;
    const badge = computeTileBadge(stateObj, this.hass);

    const supportedExtras = this._config.extras?.filter((extra) =>
      supportsTileExtra(stateObj, extra.type)
    );

    return html`
      <ha-card style=${styleMap(style)}>
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
            .primary=${name}
            .secondary=${stateDisplay}
            role="button"
            tabindex="0"
            @action=${this._handleAction}
            .actionHandler=${actionHandler()}
          ></ha-tile-info>
        </div>
        ${supportedExtras?.length
          ? html`
              <div class="extras">
                ${supportedExtras.map((extraConf) =>
                  this.renderExtra(extraConf, stateObj)
                )}
              </div>
            `
          : null}
      </ha-card>
    `;
  }

  private _extrasElements = new WeakMap<
    LovelaceTileExtraConfig,
    LovelaceTileExtra | HuiErrorCard
  >();

  private _getExtraElement(extra: LovelaceTileExtraConfig) {
    if (!this._extrasElements.has(extra)) {
      const element = createTileExtraElement(extra);
      this._extrasElements.set(extra, element);
      return element;
    }

    return this._extrasElements.get(extra)!;
  }

  private renderExtra(
    extraConf: LovelaceTileExtraConfig,
    stateObj: HassEntity
  ): TemplateResult {
    const element = this._getExtraElement(extraConf);

    if (this.hass) {
      element.hass = this.hass;
      (element as LovelaceTileExtra).stateObj = stateObj;
    }

    return html`<div class="extra">${element}</div>`;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        --tile-color: var(--rgb-disabled-color);
        --tile-tap-padding: 6px;
        -webkit-tap-highlight-color: transparent;
      }
      ha-card {
        height: 100%;
      }
      ha-card.disabled {
        background: rgba(var(--rgb-disabled-color), 0.1);
      }
      [role="button"] {
        cursor: pointer;
      }
      [role="button"]:focus {
        outline: none;
      }
      .tile {
        padding: calc(12px - var(--tile-tap-padding));
        display: flex;
        flex-direction: row;
        align-items: center;
      }
      .icon-container {
        position: relative;
        padding: var(--tile-tap-padding);
        flex: none;
        margin-right: calc(12px - 2 * var(--tile-tap-padding));
        margin-inline-end: calc(12px - 2 * var(--tile-tap-padding));
        margin-inline-start: initial;
        direction: var(--direction);
        transition: transform 180ms ease-in-out;
      }
      .icon-container .icon {
        --icon-color: rgb(var(--tile-color));
        --shape-color: rgba(var(--tile-color), 0.2);
      }
      .icon-container .badge {
        position: absolute;
        top: calc(-3px + var(--tile-tap-padding));
        right: calc(-3px + var(--tile-tap-padding));
      }
      .icon-container[role="button"]:focus-visible,
      .icon-container[role="button"]:active {
        transform: scale(1.2);
      }
      ha-tile-info {
        padding: var(--tile-tap-padding);
        flex: 1;
        min-width: 0;
        min-height: 40px;
        border-radius: calc(var(--ha-card-border-radius, 10px) - 2px);
        transition: background-color 180ms ease-in-out;
      }
      ha-tile-info:focus-visible {
        background-color: rgba(var(--tile-color), 0.1);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-tile-card": HuiTileCard;
  }
}

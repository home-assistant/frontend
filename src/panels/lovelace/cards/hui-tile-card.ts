import { mdiHelp } from "@mdi/js";
import { HassEntity } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { computeRgbColor } from "../../../common/color/compute-color";
import { DOMAINS_TOGGLE } from "../../../common/const";
import { computeDomain } from "../../../common/entity/compute_domain";
import { computeStateDisplay } from "../../../common/entity/compute_state_display";
import { stateActive } from "../../../common/entity/state_active";
import { stateColorCss } from "../../../common/entity/state_color";
import { stateIconPath } from "../../../common/entity/state_icon_path";
import "../../../components/ha-card";
import "../../../components/tile/ha-tile-icon";
import "../../../components/tile/ha-tile-image";
import "../../../components/tile/ha-tile-info";
import { cameraUrlWithWidthHeight } from "../../../data/camera";
import { ActionHandlerEvent } from "../../../data/lovelace";
import { HomeAssistant } from "../../../types";
import { actionHandler } from "../common/directives/action-handler-directive";
import { findEntities } from "../common/find-entities";
import { handleAction } from "../common/handle-action";
import { LovelaceCard, LovelaceCardEditor } from "../types";
import { ThermostatCardConfig, TileCardConfig } from "./types";

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

    const supportToggle =
      config.entity && DOMAINS_TOGGLE.has(computeDomain(config.entity));

    this._config = {
      tap_action: {
        action: "more-info",
      },
      icon_tap_action: {
        action: supportToggle ? "toggle" : "more-info",
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

  render() {
    if (!this._config || !this.hass) {
      return html``;
    }
    const entityId = this._config.entity;
    const entity = entityId ? this.hass.states[entityId] : undefined;

    if (!entity) {
      return html`
        <ha-card class="disabled">
          <div class="tile">
            <ha-tile-icon .iconPath=${mdiHelp}></ha-tile-icon>
            <ha-tile-info
              .primary=${entityId}
              secondary=${this.hass.localize("ui.card.tile.not_found")}
            ></ha-tile-info>
          </div>
        </ha-card>
      `;
    }

    const icon = this._config.icon || entity.attributes.icon;
    const iconPath = stateIconPath(entity);

    const name = this._config.name || entity.attributes.friendly_name;
    const stateDisplay = computeStateDisplay(
      this.hass.localize,
      entity,
      this.hass.locale
    );

    const style = {
      "--tile-color": this._config.color
        ? stateActive(entity)
          ? computeRgbColor(this._config.color)
          : undefined
        : stateColorCss(entity),
    };

    const imageUrl = this._config.show_entity_picture
      ? this._getImageUrl(entity)
      : undefined;

    return html`
      <ha-card style=${styleMap(style)}>
        <div class="tile">
          ${imageUrl
            ? html`
                <ha-tile-image
                  class="icon"
                  .imageUrl=${imageUrl}
                  role="button"
                  tabindex="0"
                  @action=${this._handleIconAction}
                  .actionHandler=${actionHandler()}
                ></ha-tile-image>
              `
            : html`
                <ha-tile-icon
                  class="icon"
                  .icon=${icon}
                  .iconPath=${iconPath}
                  role="button"
                  tabindex="0"
                  @action=${this._handleIconAction}
                  .actionHandler=${actionHandler()}
                ></ha-tile-icon>
              `}
          <ha-tile-info
            .primary=${name}
            .secondary=${stateDisplay}
            role="button"
            tabindex="0"
            @action=${this._handleAction}
            .actionHandler=${actionHandler()}
          ></ha-tile-info>
        </div>
      </ha-card>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        --tile-color: var(--rgb-disabled-color);
        --tile-tap-padding: 6px;
      }
      ha-card {
        height: 100%;
      }
      ha-card.disabled {
        background: rgba(var(--rgb-disabled-color), 0.1);
      }
      .tile {
        padding: calc(12px - var(--tile-tap-padding));
        display: flex;
        flex-direction: row;
        align-items: center;
      }
      .icon {
        padding: var(--tile-tap-padding);
        flex: none;
        margin-right: calc(12px - 2 * var(--tile-tap-padding));
        margin-inline-end: calc(12px - 2 * var(--tile-tap-padding));
        margin-inline-start: initial;
        direction: var(--direction);
        --color: var(--tile-color);
        transition: transform 180ms ease-in-out;
      }
      [role="button"] {
        cursor: pointer;
      }
      .icon[role="button"]:focus {
        outline: none;
      }
      .icon[role="button"]:focus-visible {
        transform: scale(1.2);
      }
      .icon[role="button"]:active {
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
      ha-tile-info:focus {
        outline: none;
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

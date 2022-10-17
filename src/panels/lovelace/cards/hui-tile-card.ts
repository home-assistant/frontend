import { mdiHelp } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { computeRgbColor } from "../../../common/color/compute-color";
import { DOMAINS_TOGGLE, STATES_OFF } from "../../../common/const";
import { computeDomain } from "../../../common/entity/compute_domain";
import { computeStateDisplay } from "../../../common/entity/compute_state_display";
import { stateIconPath } from "../../../common/entity/state_icon_path";
import "../../../components/ha-card";
import "../../../components/tile/ha-tile-icon";
import "../../../components/tile/ha-tile-info";
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

    const iconStyle = {};
    if (this._config.color && !STATES_OFF.includes(entity.state)) {
      iconStyle["--main-color"] = computeRgbColor(this._config.color);
    }

    return html`
      <ha-card style=${styleMap(iconStyle)}>
        <div class="tile">
          <ha-tile-icon
            .icon=${icon}
            .iconPath=${iconPath}
            role="button"
            tabindex="0"
            @action=${this._handleIconAction}
            .actionHandler=${actionHandler()}
          ></ha-tile-icon>
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
        --main-color: var(--rgb-disabled-color);
        --tap-padding: 6px;
      }
      ha-card {
        height: 100%;
      }
      ha-card.disabled {
        background: rgba(var(--rgb-disabled-color), 0.1);
      }
      .tile {
        padding: calc(12px - var(--tap-padding));
        display: flex;
        flex-direction: row;
        align-items: center;
      }
      ha-tile-icon {
        padding: var(--tap-padding);
        flex: none;
        margin-right: calc(12px - 2 * var(--tap-padding));
        margin-inline-end: calc(12px - 2 * var(--tap-padding));
        margin-inline-start: initial;
        direction: var(--direction);
        --color: var(--main-color);
        transition: transform 180ms ease-in-out;
      }
      [role="button"] {
        cursor: pointer;
      }
      ha-tile-icon[role="button"]:focus {
        outline: none;
      }
      ha-tile-icon[role="button"]:focus-visible {
        transform: scale(1.2);
      }
      ha-tile-icon[role="button"]:active {
        transform: scale(1.2);
      }
      ha-tile-info {
        padding: var(--tap-padding);
        flex: 1;
        min-width: 0;
        min-height: 40px;
        border-radius: calc(var(--ha-card-border-radius, 12px) - 2px);
        transition: background-color 180ms ease-in-out;
      }
      ha-tile-info:focus {
        outline: none;
      }
      ha-tile-info:focus-visible {
        background-color: rgba(var(--main-color), 0.1);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-tile-card": HuiTileCard;
  }
}

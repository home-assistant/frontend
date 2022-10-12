import { css, CSSResultGroup, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { computeRgbColor } from "../../../common/color/compute-color";
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
import { createEntityNotFoundWarning } from "../components/hui-warning";
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

    this._config = {
      tap_action: {
        action: "more-info",
      },
      ...config,
    };
  }

  public getCardSize(): number {
    return 2;
  }

  private _handleAction(ev: ActionHandlerEvent) {
    handleAction(this, this.hass!, this._config!, ev.detail.action!);
  }

  render() {
    if (!this._config || !this.hass) {
      return html``;
    }
    const entityId = this._config.entity;
    const entity = entityId ? this.hass.states[entityId] : undefined;

    if (!entity) {
      return html`
        <hui-warning>
          ${createEntityNotFoundWarning(this.hass, this._config.entity)}
        </hui-warning>
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
    if (this._config.color) {
      iconStyle["--main-color"] = computeRgbColor(this._config.color);
    }

    return html`
      <ha-card style=${styleMap(iconStyle)}>
        <div
          class="tile"
          role="button"
          tabindex="0"
          @action=${this._handleAction}
          .actionHandler=${actionHandler()}
        >
          <ha-tile-icon .icon=${icon} .iconPath=${iconPath}></ha-tile-icon>
          <ha-tile-info
            .primary=${name}
            .secondary=${stateDisplay}
          ></ha-tile-info>
        </div>
      </ha-card>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        --main-color: var(--rgb-disabled-color);
      }
      ha-card {
        height: 100%;
      }
      .tile {
        cursor: pointer;
        padding: 12px;
        display: flex;
        flex-direction: row;
        align-items: center;
      }
      .tile ha-tile-icon {
        flex: none;
        padding: 8px;
        margin: -8px;
        margin-inline-end: 4px;
        --color: var(--main-color);
        border-radius: 50%;
      }
      ha-tile-info {
        flex: 1;
        min-width: 0;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-tile-card": HuiTileCard;
  }
}

import { mdiDotsVertical } from "@mdi/js";
import {
  CSSResultGroup,
  LitElement,
  PropertyValues,
  css,
  html,
  nothing,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { stateColorCss } from "../../../common/entity/state_color";
import "../../../components/ha-card";
import "../../../components/ha-icon-button";
import { HumidifierEntity } from "../../../data/humidifier";
import "../../../state-control/humidifier/ha-state-control-humidifier-humidity";
import { HomeAssistant } from "../../../types";
import "../card-features/hui-card-features";
import { findEntities } from "../common/find-entities";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import { LovelaceCard, LovelaceCardEditor } from "../types";
import { HumidifierCardConfig } from "./types";

@customElement("hui-humidifier-card")
export class HuiHumidifierCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("../editor/config-elements/hui-humidifier-card-editor");
    return document.createElement("hui-humidifier-card-editor");
  }

  public static getStubConfig(
    hass: HomeAssistant,
    entities: string[],
    entitiesFallback: string[]
  ): HumidifierCardConfig {
    const includeDomains = ["humidifier"];
    const maxEntities = 1;
    const foundEntities = findEntities(
      hass,
      maxEntities,
      entities,
      entitiesFallback,
      includeDomains
    );

    return {
      type: "humidifier",
      entity: foundEntities[0] || "",
      features: [
        {
          type: "humidifier-modes",
        },
      ],
    };
  }

  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: HumidifierCardConfig;

  public getCardSize(): number {
    return 7;
  }

  public setConfig(config: HumidifierCardConfig): void {
    if (!config.entity || config.entity.split(".")[0] !== "humidifier") {
      throw new Error("Specify an entity from within the humidifier domain");
    }

    this._config = config;
  }

  private _handleMoreInfo() {
    fireEvent(this, "hass-more-info", {
      entityId: this._config!.entity,
    });
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);

    if (
      !this._config ||
      !this.hass ||
      (!changedProps.has("hass") && !changedProps.has("_config"))
    ) {
      return;
    }

    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    const oldConfig = changedProps.get("_config") as
      | HumidifierCardConfig
      | undefined;

    if (
      !oldHass ||
      !oldConfig ||
      oldHass.themes !== this.hass.themes ||
      oldConfig.theme !== this._config.theme
    ) {
      applyThemesOnElement(this, this.hass.themes, this._config.theme);
    }
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }
    const stateObj = this.hass.states[this._config.entity] as HumidifierEntity;

    if (!stateObj) {
      return html`
        <hui-warning>
          ${createEntityNotFoundWarning(this.hass, this._config.entity)}
        </hui-warning>
      `;
    }

    const name = this._config!.name || computeStateName(stateObj);

    const color = stateColorCss(stateObj);

    return html`
      <ha-card>
        <p class="title">${name}</p>
        <ha-state-control-humidifier-humidity
          show-current
          .hass=${this.hass}
          .stateObj=${stateObj}
        ></ha-state-control-humidifier-humidity>
        <ha-icon-button
          class="more-info"
          .label=${this.hass!.localize(
            "ui.panel.lovelace.cards.show_more_info"
          )}
          .path=${mdiDotsVertical}
          @click=${this._handleMoreInfo}
          tabindex="0"
        ></ha-icon-button>
        <hui-card-features
          style=${styleMap({
            "--feature-color": color,
          })}
          .hass=${this.hass}
          .stateObj=${stateObj}
          .features=${this._config.features}
        ></hui-card-features>
      </ha-card>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-card {
        height: 100%;
        position: relative;
        overflow: hidden;
        padding: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-between;
      }

      .title {
        width: 100%;
        font-size: 18px;
        line-height: 24px;
        padding: 12px 36px 16px 36px;
        margin: 0;
        text-align: center;
        box-sizing: border-box;
      }

      ha-state-control-humidifier-humidity {
        width: 100%;
        max-width: 344px; /* 12px + 12px + 320px */
        padding: 0 12px 12px 12px;
        box-sizing: border-box;
      }

      .more-info {
        position: absolute;
        cursor: pointer;
        top: 0;
        right: 0;
        inset-inline-end: 0px;
        inset-inline-start: initial;
        border-radius: 100%;
        color: var(--secondary-text-color);
        direction: var(--direction);
      }

      hui-card-features {
        width: 100%;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-humidifier-card": HuiHumidifierCard;
  }
}

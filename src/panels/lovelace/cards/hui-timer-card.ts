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
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeStateName } from "../../../common/entity/compute_state_name";
import "../../../components/ha-card";
import "../../../components/ha-icon-button";
import { TimerEntity } from "../../../data/timer";
import "../../../state-control/timer/ha-state-control-timer";
import { HomeAssistant } from "../../../types";
import { findEntities } from "../common/find-entities";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import { LovelaceCard, LovelaceCardEditor } from "../types";
import { TimerCardConfig } from "./types";

@customElement("hui-timer-card")
export class HuiTimerCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("../editor/config-elements/hui-timer-card-editor");
    return document.createElement("hui-timer-card-editor");
  }

  public static getStubConfig(
    hass: HomeAssistant,
    entities: string[],
    entitiesFallback: string[]
  ): TimerCardConfig {
    const includeDomains = ["timer"];
    const maxEntities = 1;
    const foundEntities = findEntities(
      hass,
      maxEntities,
      entities,
      entitiesFallback,
      includeDomains
    );

    return { type: "timer", entity: foundEntities[0] || "" };
  }

  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: TimerCardConfig;

  public getCardSize(): number {
    return 7;
  }

  public setConfig(config: TimerCardConfig): void {
    if (!config.entity || config.entity.split(".")[0] !== "timer") {
      throw new Error("Specify an entity from within the timer domain");
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
      | TimerCardConfig
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
    const stateObj = this.hass.states[this._config.entity] as TimerEntity;

    if (!stateObj) {
      return html`
        <hui-warning>
          ${createEntityNotFoundWarning(this.hass, this._config.entity)}
        </hui-warning>
      `;
    }

    const name = this._config!.name || computeStateName(stateObj);

    return html`
      <ha-card>
        <p class="title">${name}</p>
        <ha-state-control-timer
          prevent-interaction-on-scroll
          .hass=${this.hass}
          .stateObj=${stateObj}
        ></ha-state-control-timer>
        <ha-icon-button
          class="more-info"
          .label=${this.hass!.localize(
            "ui.panel.lovelace.cards.show_more_info"
          )}
          .path=${mdiDotsVertical}
          @click=${this._handleMoreInfo}
          tabindex="0"
        ></ha-icon-button>
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
        line-height: 36px;
        padding: 8px 30px 8px 30px;
        margin: 0;
        text-align: center;
        box-sizing: border-box;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      ha-state-control-timer {
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
    "hui-timer-card": HuiTimerCard;
  }
}

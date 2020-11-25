import { mdiDotsVertical } from "@mdi/js";
import "@thomasloven/round-slider";
import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  PropertyValues,
  query,
  TemplateResult,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";
import { styleMap } from "lit-html/directives/style-map";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeStateDisplay } from "../../../common/entity/compute_state_display";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { stateIcon } from "../../../common/entity/state_icon";
import "../../../components/ha-card";
import "../../../components/ha-icon-button";
import { UNAVAILABLE, UNAVAILABLE_STATES } from "../../../data/entity";
import { ActionHandlerEvent } from "../../../data/lovelace";
import { HomeAssistant, FanEntity } from "../../../types";
import { actionHandler } from "../common/directives/action-handler-directive";
import { findEntities } from "../common/find-entites";
import { handleAction } from "../common/handle-action";
import { hasAction } from "../common/has-action";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import { LovelaceCard, LovelaceCardEditor } from "../types";
import { FanCardConfig } from "./types";

@customElement("hui-fan-card")
export class HuiFanCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import(
      /* webpackChunkName: "hui-fan-card-editor" */ "../editor/config-elements/hui-fan-card-editor"
    );
    return document.createElement("hui-fan-card-editor");
  }

  public static getStubConfig(
    hass: HomeAssistant,
    entities: string[],
    entitiesFallback: string[]
  ): FanCardConfig {
    const includeDomains = ["fan"];
    const maxEntities = 1;
    const foundEntities = findEntities(
      hass,
      maxEntities,
      entities,
      entitiesFallback,
      includeDomains
    );

    return { type: "fan", entity: foundEntities[0] || "" };
  }

  @property({ attribute: false }) public hass?: HomeAssistant;

  @internalProperty() private _config?: FanCardConfig;

  @query(".speed", true) private _speedElement?: HTMLElement;

  private _speedTimeout?: number;

  public getCardSize(): number {
    return 5;
  }

  public setConfig(config: FanCardConfig): void {
    if (!config.entity || config.entity.split(".")[0] !== "fan") {
      throw new Error("Specify an entity from within the fan domain.");
    }

    this._config = {
      tap_action: { action: "toggle" },
      hold_action: { action: "more-info" },
      ...config,
    };
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    const stateObj = this.hass.states[this._config!.entity] as FanEntity;

    if (!stateObj) {
      return html`
        <hui-warning>
          ${createEntityNotFoundWarning(this.hass, this._config.entity)}
        </hui-warning>
      `;
    }

    const max_speed = stateObj.attributes.speed_list.length;

    const speed = stateObj.attributes.speed_list.indexOf(
      stateObj.attributes.speed
    );

    return html`
      <ha-card
        .header=${this._config!.title}
        class=${classMap({ "no-header": !this._config!.title })}
      >
        <mwc-icon-button
          class="more-info"
          label="Open more info"
          @click=${this._handleMoreInfo}
          tabindex="0"
        >
          <ha-svg-icon .path=${mdiDotsVertical}></ha-svg-icon>
        </mwc-icon-button>

        <div class="content">
          <div id="controls">
            <div id="slider">
              <round-slider
                min="0"
                .max=${max_speed}
                .value=${speed}
                .disabled=${UNAVAILABLE_STATES.includes(stateObj.state)}
                @value-changing=${this._dragEvent}
                @value-changed=${this._setSpeed}
              ></round-slider>
              <ha-icon-button
                class="fan-button slider-center
                ${classMap({
                  "state-on": stateObj.state === "on",
                  "state-unavailable": stateObj.state === UNAVAILABLE,
                })}"
                .icon=${this._config.icon || stateIcon(stateObj)}
                .disabled=${UNAVAILABLE_STATES.includes(stateObj.state)}
                style=${styleMap({
                  filter: this._computeSpeed(stateObj),
                })}
                @action=${this._handleAction}
                .actionHandler=${actionHandler({
                  hasHold: hasAction(this._config!.hold_action),
                  hasDoubleClick: hasAction(this._config!.double_tap_action),
                })}
                tabindex="0"
              ></ha-icon-button>
            </div>
          </div>

          <div id="info">
            ${UNAVAILABLE_STATES.includes(stateObj.state)
              ? html`
                  <div>
                    ${computeStateDisplay(
                      this.hass.localize,
                      stateObj,
                      this.hass.language
                    )}
                  </div>
                `
              : html`<div class="speed"></div>`}
            ${this._config.name || computeStateName(stateObj)}
          </div>
        </div>
      </ha-card>
    `;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return hasConfigOrEntityChanged(this, changedProps);
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (!this._config || !this.hass) {
      return;
    }

    const stateObj = this.hass!.states[this._config!.entity];

    if (!stateObj) {
      return;
    }

    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    const oldConfig = changedProps.get("_config") as FanCardConfig | undefined;

    if (
      !oldHass ||
      !oldConfig ||
      oldHass.themes !== this.hass.themes ||
      oldConfig.theme !== this._config.theme
    ) {
      applyThemesOnElement(this, this.hass.themes, this._config.theme);
    }
  }

  private _dragEvent(e: any): void {
    const stateObj = this.hass!.states[this._config!.entity] as FanEntity;
    if (e.detail.value < 1) {
      this._speedElement.innerHTML = `Off`;
    } else {
      this._speedElement.innerHTML = `${
        stateObj.attributes.speed_list[e.detail.value - 1]
      }`;
    }
    this._showspeed();
    this._hidespeed();
  }

  private _showspeed(): void {
    clearTimeout(this._speedTimeout);
    this._speedElement.classList.add("show_speed");
  }

  private _hidespeed(): void {
    this._speedTimeout = window.setTimeout(() => {
      this._speedElement.classList.remove("show_speed");
    }, 500);
  }

  private _setSpeed(e: any): void {
    const stateObj = this.hass!.states[this._config!.entity] as FanEntity;
    if (e.detail.value < 1) {
      this.hass!.callService("fan", "turn_off", {
        entity_id: this._config!.entity,
      });
    } else {
      this.hass!.callService("fan", "turn_on", {
        entity_id: this._config!.entity,
        speed: stateObj.attributes.speed_list[e.detail.value - 1],
      });
    }
  }

  private _computeSpeed(stateObj: FanEntity): string {
    return stateObj.state === "off" || !stateObj.attributes.speed_list
      ? "off"
      : `${stateObj.attributes.speed}`;
  }

  private _handleAction(ev: ActionHandlerEvent) {
    handleAction(this, this.hass!, this._config!, ev.detail.action!);
  }

  private _handleMoreInfo() {
    fireEvent(this, "hass-more-info", {
      entityId: this._config!.entity,
    });
  }

  static get styles(): CSSResult {
    return css`
      ha-card {
        height: 100%;
        box-sizing: border-box;
        position: relative;
        overflow: hidden;
        text-align: center;
        --name-font-size: 1.2rem;
        --speed-font-size: 1.2rem;
      }

      .more-info {
        position: absolute;
        cursor: pointer;
        top: 0;
        right: 0;
        border-radius: 100%;
        color: var(--secondary-text-color);
        z-index: 1;
      }

      .content {
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }

      #controls {
        display: flex;
        justify-content: center;
        padding: 16px;
        position: relative;
      }

      #slider {
        height: 100%;
        width: 100%;
        position: relative;
        max-width: 200px;
        min-width: 100px;
      }

      round-slider {
        --round-slider-path-color: var(--disabled-text-color);
        --round-slider-bar-color: var(--primary-color);
        padding-bottom: 10%;
      }

      .fan-button {
        color: var(--paper-item-icon-color, #44739e);
        width: 60%;
        height: auto;
        position: absolute;
        max-width: calc(100% - 40px);
        box-sizing: border-box;
        border-radius: 100%;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        --mdc-icon-button-size: 100%;
        --mdc-icon-size: 100%;
      }

      .fan-button.state-on {
        color: var(--paper-item-icon-active-color, #fdd835);
      }

      .fan-button.state-unavailable {
        color: var(--state-icon-unavailable-color);
      }

      #info {
        text-align: center;
        margin-top: -56px;
        padding: 16px;
        font-size: var(--name-font-size);
      }

      .speed {
        font-size: var(--speed-font-size);
        opacity: 0;
        transition: opacity 0.5s ease-in-out;
        -moz-transition: opacity 0.5s ease-in-out;
        -webkit-transition: opacity 0.5s ease-in-out;
      }

      .show_speed {
        opacity: 1;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-fan-card": HuiFanCard;
  }
}

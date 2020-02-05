import {
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
  customElement,
  property,
  css,
  CSSResult,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";
import { HassEntity } from "home-assistant-js-websocket";
import "@polymer/paper-icon-button/paper-icon-button";

import "../../../components/ha-card";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { supportsFeature } from "../../../common/entity/supports-feature";
import { OFF_STATES, SUPPORT_PAUSE } from "../../../data/media-player";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import { HomeAssistant, MediaEntity } from "../../../types";
import { LovelaceCard, LovelaceCardEditor } from "../types";
import { fireEvent } from "../../../common/dom/fire_event";
import { MediaControlCardConfig } from "./types";

@customElement("hui-media-control-card")
export class HuiMediaControlCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import(
      /* webpackChunkName: "hui-media-control-card-editor" */ "../editor/config-elements/hui-media-control-card-editor"
    );
    return document.createElement("hui-media-control-card-editor");
  }

  public static getStubConfig(): object {
    return { entity: "" };
  }

  @property() public hass?: HomeAssistant;
  @property() private _config?: MediaControlCardConfig;

  public getCardSize(): number {
    return 3;
  }

  public setConfig(config: MediaControlCardConfig): void {
    if (!config.entity || config.entity.split(".")[0] !== "media_player") {
      throw new Error("Specify an entity from within the media_player domain.");
    }

    this._config = { theme: "default", ...config };
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }
    const stateObj = this.hass.states[this._config.entity] as MediaEntity;

    if (!stateObj) {
      return html`
        <hui-warning
          >${this.hass.localize(
            "ui.panel.lovelace.warning.entity_not_found",
            "entity",
            this._config.entity
          )}</hui-warning
        >
      `;
    }
    const image =
      stateObj.attributes.entity_picture ||
      "../static/images/card_media_player_bg.png";

    return html`
      <ha-card>
        <div
          class="${classMap({
            "no-image": !stateObj.attributes.entity_picture,
            ratio: true,
          })}"
        >
          <div class="image" style="background-image: url(${image})"></div>
          <div class="caption">
            ${this._config!.name ||
              computeStateName(this.hass!.states[this._config!.entity])}
            <div class="title">
              ${this._computeMediaTitle(stateObj)}
            </div>
          </div>
        </div>
        ${OFF_STATES.includes(stateObj.state)
          ? ""
          : html`
              <paper-progress
                .max="${stateObj.attributes.media_duration}"
                .value="${stateObj.attributes.media_position}"
                class="progress"
              ></paper-progress>
            `}
        <div class="controls flex">
          <div class="left flex">
            <paper-icon-button
              icon="hass:power"
              .action=${stateObj.state === "off" ? "turn_on" : "turn_off"}
              @click=${this._handleClick}
            ></paper-icon-button>
          </div>
          <div class="center flex">
            <paper-icon-button
              icon="hass:skip-previous"
              .action=${"media_previous_track"}
              @click=${this._handleClick}
            ></paper-icon-button>
            <paper-icon-button
              class="playPauseButton"
              icon=${stateObj.state !== "playing"
                ? "hass:play"
                : supportsFeature(stateObj, SUPPORT_PAUSE)
                ? "hass:pause"
                : "hass:stop"}
              .action=${"media_play_pause"}
              @click=${this._handleClick}
            ></paper-icon-button>
            <paper-icon-button
              icon="hass:skip-next"
              .action=${"media_next_track"}
              @click=${this._handleClick}
            ></paper-icon-button>
          </div>
          <div class="right flex">
            <paper-icon-button
              icon="hass:dots-vertical"
              @click="${this._handleMoreInfo}"
            ></paper-icon-button>
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
    if (!this._config || !this.hass || !changedProps.has("hass")) {
      return;
    }

    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    const oldConfig = changedProps.get("_config") as
      | MediaControlCardConfig
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

  private _computeControlIcon(stateObj: HassEntity): string {
    if (stateObj.state !== "playing") {
      return "hass:play";
    }

    // tslint:disable-next-line:no-bitwise
    return supportsFeature(stateObj, SUPPORT_PAUSE)
      ? "hass:pause"
      : "hass:stop";
  }

  private _computeMediaTitle(stateObj: HassEntity): string {
    let prefix;
    let suffix;

    switch (stateObj.attributes.media_content_type) {
      case "music":
        prefix = stateObj.attributes.media_artist;
        suffix = stateObj.attributes.media_title;
        break;
      case "tvshow":
        prefix = stateObj.attributes.media_series_title;
        suffix = stateObj.attributes.media_title;
        break;
      default:
        prefix =
          stateObj.attributes.media_title ||
          stateObj.attributes.app_name ||
          this.hass!.localize(`state.media_player.${stateObj.state}`) ||
          this.hass!.localize(`state.default.${stateObj.state}`) ||
          stateObj.state;
        suffix = "";
    }

    return prefix && suffix ? `${prefix}: ${suffix}` : prefix || suffix || "";
  }

  private _handleMoreInfo() {
    fireEvent(this, "hass-more-info", {
      entityId: this._config!.entity,
    });
  }

  private _handleClick(e: MouseEvent) {
    this.hass!.callService("media_player", (e.currentTarget! as any).action, {
      entity_id: this._config!.entity,
    });
  }

  static get styles(): CSSResult {
    return css`
      .ratio {
        position: relative;
        width: 100%;
        height: 0;
        padding-bottom: 56.25%;
      }

      .image {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: block;
        transition: filter 0.2s linear;
        background-position: center center;
        background-size: cover;
      }

      .no-image {
        padding-bottom: 20%;
      }

      .no-image > .image {
        background-position: center center;
        background-repeat: no-repeat;
        background-color: var(--primary-color);
        background-size: initial;
      }

      .no-image > .caption {
        background-color: initial;
      }

      .controls {
        align-content: space-evenly;
        padding: 8px;
      }

      .controls > div {
        width: 33%;
        align-items: center;
      }

      .flex {
        display: flex;
      }

      .left {
        justify-content: flex-start;
      }

      .center {
        justify-content: center;
      }

      .right {
        justify-content: flex-end;
      }

      paper-icon-button {
        width: 44px;
        height: 44px;
        opacity: var(--dark-primary-opacity);
      }

      paper-icon-button[disabled] {
        opacity: var(--dark-disabled-opacity);
      }

      .playPauseButton {
        width: 56px !important;
        height: 56px !important;
        background-color: var(--primary-color);
        color: white;
        border-radius: 50%;
        padding: 8px;
        transition: background-color 0.5s;
      }

      .caption {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, var(--dark-secondary-opacity));
        padding: 8px 16px;
        font-size: 14px;
        font-weight: 500;
        color: white;
        transition: background-color 0.5s;
      }

      .title {
        font-size: 1.2em;
        margin: 8px 0 4px;
      }

      .progress {
        width: 100%;
        height: var(--paper-progress-height, 4px);
        margin-top: calc(-1 * var(--paper-progress-height, 4px));
        --paper-progress-active-color: var(--accent-color);
        --paper-progress-container-color: rgba(200, 200, 200, 0.5);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-media-control-card": HuiMediaControlCard;
  }
}

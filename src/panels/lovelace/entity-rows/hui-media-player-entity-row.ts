import { html, LitElement, TemplateResult } from "lit-element";
import "@polymer/paper-icon-button/paper-icon-button";

import "../components/hui-generic-entity-row";

import { EntityRow, EntityConfig } from "./types";
import { HomeAssistant } from "../../../types";
import { HassEntity } from "home-assistant-js-websocket";
import { supportsFeature } from "../../../common/entity/supports-feature";
import {
  SUPPORTS_PLAY,
  SUPPORT_NEXT_TRACK,
  OFF_STATES,
  SUPPORT_PAUSE,
} from "../../../data/media-player";

class HuiMediaPlayerEntityRow extends LitElement implements EntityRow {
  public hass?: HomeAssistant;
  private _config?: EntityConfig;

  static get properties() {
    return {
      hass: {},
      _config: {},
    };
  }

  public setConfig(config: EntityConfig): void {
    if (!config || !config.entity) {
      throw new Error("Invalid Configuration: 'entity' required");
    }

    this._config = config;
  }

  protected render(): TemplateResult | void {
    if (!this.hass || !this._config) {
      return html``;
    }

    const stateObj = this.hass.states[this._config.entity];

    if (!stateObj) {
      return html`
        <hui-error-entity-row
          .entity="${this._config.entity}"
        ></hui-error-entity-row>
      `;
    }

    return html`
      ${this.renderStyle()}
      <hui-generic-entity-row
        .hass="${this.hass}"
        .config="${this._config}"
        .showSecondary="false"
      >
        ${OFF_STATES.includes(stateObj.state)
          ? html`
              <div>
                ${this.hass!.localize(`state.media_player.${stateObj.state}`) ||
                  this.hass!.localize(`state.default.${stateObj.state}`) ||
                  stateObj.state}
              </div>
            `
          : html`
              <div class="controls">
                ${stateObj.state !== "playing" &&
                !supportsFeature(stateObj, SUPPORTS_PLAY)
                  ? ""
                  : html`
                      <paper-icon-button
                        icon="${this._computeControlIcon(stateObj)}"
                        @click="${this._playPause}"
                      ></paper-icon-button>
                    `}
                ${supportsFeature(stateObj, SUPPORT_NEXT_TRACK)
                  ? html`
                      <paper-icon-button
                        icon="hass:skip-next"
                        @click="${this._nextTrack}"
                      ></paper-icon-button>
                    `
                  : ""}
              </div>
              <div slot="secondary">${this._computeMediaTitle(stateObj)}</div>
            `}
      </hui-generic-entity-row>
    `;
  }

  private renderStyle(): TemplateResult {
    return html`
      <style>
        .controls {
          white-space: nowrap;
        }
      </style>
    `;
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
          stateObj.state;
        suffix = "";
    }

    return prefix && suffix ? `${prefix}: ${suffix}` : prefix || suffix || "";
  }

  private _playPause(ev: MouseEvent): void {
    ev.stopPropagation();
    this.hass!.callService("media_player", "media_play_pause", {
      entity_id: this._config!.entity,
    });
  }

  private _nextTrack(ev: MouseEvent): void {
    ev.stopPropagation();
    this.hass!.callService("media_player", "media_next_track", {
      entity_id: this._config!.entity,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-media-player-entity-row": HuiMediaPlayerEntityRow;
  }
}

customElements.define("hui-media-player-entity-row", HuiMediaPlayerEntityRow);

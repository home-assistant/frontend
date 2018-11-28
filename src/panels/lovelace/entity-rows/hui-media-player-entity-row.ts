import { html, LitElement } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";
import "@polymer/paper-icon-button/paper-icon-button";

import "../components/hui-generic-entity-row";

import { hassLocalizeLitMixin } from "../../../mixins/lit-localize-mixin";
import { EntityRow, EntityConfig } from "./types";
import { HomeAssistant } from "../../../types";

const SUPPORT_PAUSE = 1;
const SUPPORT_NEXT_TRACK = 32;
const SUPPORTS_PLAY = 16384;
const OFF_STATES = ["off", "idle"];

class HuiMediaPlayerEntityRow extends hassLocalizeLitMixin(LitElement)
  implements EntityRow {
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

  protected render(): TemplateResult {
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
        ${
          !this._isOff(stateObj.state)
            ? html`
                <div class="controls">
                  ${
                    this._computeControlIcon(stateObj)
                      ? html`
                          <paper-icon-button
                            icon="${this._computeControlIcon(stateObj)}"
                            @click="${this._playPause}"
                          ></paper-icon-button>
                        `
                      : ""
                  }
                  ${
                    this._supportsNext(stateObj)
                      ? html`
                          <paper-icon-button
                            icon="hass:skip-next"
                            @click="${this._nextTrack}"
                          ></paper-icon-button>
                        `
                      : ""
                  }
                </div>
              `
            : ""
        }
        ${
          this._isOff(stateObj.state)
            ? html`
                <div>${this._computeState(stateObj.state)}</div>
              `
            : ""
        }
        <div slot="secondary">${this._computeMediaTitle(stateObj)}</div>
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

  private _computeControlIcon(stateObj) {
    if (stateObj.state !== "playing") {
      // tslint:disable-next-line:no-bitwise
      return stateObj.attributes.supported_features & SUPPORTS_PLAY
        ? "hass:play"
        : "";
    }

    // tslint:disable-next-line:no-bitwise
    return stateObj.attributes.supported_features & SUPPORT_PAUSE
      ? "hass:pause"
      : "hass:stop";
  }

  private _computeMediaTitle(stateObj) {
    if (this._isOff(stateObj.state)) {
      return null;
    }

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

  private _computeState(state) {
    return (
      this.localize(`state.media_player.${state}`) ||
      this.localize(`state.default.${state}`) ||
      state
    );
  }

  private _callService(service) {
    this.hass!.callService("media_player", service, {
      entity_id: this._config!.entity,
    });
  }

  private _playPause(event) {
    event.stopPropagation();
    this._callService("media_play_pause");
  }

  private _nextTrack(event) {
    event.stopPropagation();
    const stateObj = this.hass!.states[this._config!.entity];
    // tslint:disable-next-line:no-bitwise
    if (stateObj.attributes.supported_features! & SUPPORT_NEXT_TRACK) {
      this._callService("media_next_track");
    }
  }

  private _isOff(state) {
    return OFF_STATES.includes(state);
  }

  private _supportsNext(stateObj) {
    return (
      // tslint:disable-next-line:no-bitwise
      stateObj.attributes.supported_features & SUPPORT_NEXT_TRACK
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-media-player-entity-row": HuiMediaPlayerEntityRow;
  }
}

customElements.define("hui-media-player-entity-row", HuiMediaPlayerEntityRow);

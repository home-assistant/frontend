import "@polymer/paper-icon-button/paper-icon-button";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../components/hui-generic-entity-row";

import LocalizeMixin from "../../../mixins/localize-mixin";

const SUPPORT_PAUSE = 1;
const SUPPORT_NEXT_TRACK = 32;
const SUPPORTS_PLAY = 16384;
const OFF_STATES = ["off", "idle"];

/*
 * @appliesMixin LocalizeMixin
 */
class HuiMediaPlayerEntityRow extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
      ${this.styleTemplate}
      <hui-generic-entity-row
        hass="[[hass]]"
        config="[[_config]]"
        show-secondary="false"
      >
        ${this.mediaPlayerControlTemplate}
      </hui-generic-entity-row>
    `;
  }

  static get styleTemplate() {
    return html`
      <style>
        .controls {
          white-space: nowrap;
        }
      </style>
    `;
  }

  static get mediaPlayerControlTemplate() {
    return html`
      <template is="dom-if" if="[[!_isOff(_stateObj.state)]]">
        <div class="controls">
          <template is="dom-if" if="[[_computeControlIcon(_stateObj)]]">
            <paper-icon-button
              icon="[[_computeControlIcon(_stateObj)]]"
              on-click="_playPause"
            ></paper-icon-button>
          </template>
          <template is="dom-if" if="[[_supportsNext(_stateObj)]]">
            <paper-icon-button
              icon="hass:skip-next"
              on-click="_nextTrack"
            ></paper-icon-button>
          </template>
        </div>
      </template>
      <template is="dom-if" if="[[_isOff(_stateObj.state)]]">
        <div>[[_computeState(_stateObj.state)]]</div>
      </template>

      <div slot="secondary">
        [[_computeMediaTitle(_stateObj)]]
      </div>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      _config: Object,
      _stateObj: {
        type: Object,
        computed: "_computeStateObj(hass.states, _config.entity)",
      },
    };
  }

  _computeStateObj(states, entityId) {
    return states && entityId in states ? states[entityId] : null;
  }

  setConfig(config) {
    if (!config || !config.entity) {
      throw new Error("Entity not configured.");
    }
    this._config = config;
  }

  _computeControlIcon(stateObj) {
    if (!stateObj) return null;

    if (stateObj.state !== "playing") {
      return stateObj.attributes.supported_features & SUPPORTS_PLAY
        ? "hass:play"
        : "";
    }

    return stateObj.attributes.supported_features & SUPPORT_PAUSE
      ? "hass:pause"
      : "hass:stop";
  }

  _computeMediaTitle(stateObj) {
    if (!stateObj || this._isOff(stateObj.state)) return null;

    switch (stateObj.attributes.media_content_type) {
      case "music":
        return `${stateObj.attributes.media_artist}: ${
          stateObj.attributes.media_title
        }`;
      case "tvshow":
        return `${stateObj.attributes.media_series_title}: ${
          stateObj.attributes.media_title
        }`;
      default:
        return (
          stateObj.attributes.media_title ||
          stateObj.attributes.app_name ||
          stateObj.state
        );
    }
  }

  _computeState(state) {
    return (
      this.localize(`state.media_player.${state}`) ||
      this.localize(`state.default.${state}`) ||
      state
    );
  }

  _callService(service) {
    this.hass.callService("media_player", service, {
      entity_id: this._config.entity,
    });
  }

  _playPause(event) {
    event.stopPropagation();
    this._callService("media_play_pause");
  }

  _nextTrack(event) {
    event.stopPropagation();
    if (this._stateObj.attributes.supported_features & SUPPORT_NEXT_TRACK) {
      this._callService("media_next_track");
    }
  }

  _isOff(state) {
    return OFF_STATES.includes(state);
  }

  _supportsNext(stateObj) {
    return (
      stateObj && stateObj.attributes.supported_features & SUPPORT_NEXT_TRACK
    );
  }
}
customElements.define("hui-media-player-entity-row", HuiMediaPlayerEntityRow);

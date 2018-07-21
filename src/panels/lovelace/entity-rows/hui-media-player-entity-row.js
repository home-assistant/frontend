import '@polymer/paper-icon-button/paper-icon-button.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';


import '../components/hui-generic-entity-row.js';

import computeStateDisplay from '../../../common/entity/compute_state_display.js';

import LocalizeMixin from '../../../mixins/localize-mixin.js';

const SUPPORT_PAUSE = 1;
const SUPPORT_NEXT_TRACK = 32;

/*
 * @appliesMixin LocalizeMixin
 */
class HuiMediaPlayerEntityRow extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
      <style>
        .controls {
          white-space: nowrap;
        } 
        
        #playbackControl {
          color: var(--accent-color);
        }
      </style>
      <hui-generic-entity-row
        hass="[[hass]]"
        config="[[_config]]"
      >
        <div class="controls">
          <paper-icon-button 
            id="playbackControl"
            icon="[[_computeControlIcon(_stateObj)]]" 
            on-click="_playPause" 
          ></paper-icon-button>
          <paper-icon-button 
            icon="hass:skip-next" 
            on-click="_nextTrack" 
          ></paper-icon-button>
        </div>
        
        <div slot="secondary">
          [[_computeMediaTitle(_stateObj)]] 
        </div>
      </hui-generic-entity-row>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      _config: Object,
      _stateObj: {
        type: Object,
        computed: '_computeStateObj(hass.states, _config.entity)'
      }
    };
  }

  _computeStateObj(states, entityId) {
    return states && entityId in states ? states[entityId] : null;
  }

  setConfig(config) {
    if (!config || !config.entity) {
      throw new Error('Entity not configured.');
    }
    this._config = config;
  }

  _computeControlIcon(stateObj) {
    if (stateObj.state !== 'playing') {
      return 'hass:play';
    }

    return stateObj.attributes.supported_features & SUPPORT_PAUSE ? 'hass:pause' : 'hass:stop';
  }

  _computeMediaTitle(stateObj) {
    if (!stateObj) return null;

    let title;
    switch (stateObj.attributes.media_content_type) {
      case 'music':
        title = `${stateObj.attributes.media_artist}: ${stateObj.attributes.media_title}`;
        break;
      case 'tvshow':
        title = `${stateObj.attributes.media_series_title}: ${stateObj.attributes.media_title}`;
        break;
      default:
        title = `${stateObj.attributes.media_title}`;
    }

    return title;
  }

  _computeState(stateObj) {
    if (!stateObj) return this.localize('state.default.unavailable');
    return computeStateDisplay(this.localize, stateObj);
  }

  _callService(service) {
    this.hass.callService('media_player', service, { entity_id: this._config.entity });
  }

  _playPause(event) {
    event.stopPropagation();
    this._callService('media_play_pause');
  }

  _nextTrack(event) {
    event.stopPropagation();
    if (this._stateObj.attributes.supported_features & SUPPORT_NEXT_TRACK) {
      this._callService('media_next_track');
    }
  }
}
customElements.define('hui-media-player-entity-row', HuiMediaPlayerEntityRow);

import { html } from "@polymer/polymer/lib/utils/html-tag.js";
import { PolymerElement } from "@polymer/polymer/polymer-element.js";

import "../../../components/ha-card.js";
import "../components/hui-image.js";

import computeDomain from "../../../common/entity/compute_domain.js";
import computeStateDisplay from "../../../common/entity/compute_state_display.js";
import computeStateName from "../../../common/entity/compute_state_name.js";
import toggleEntity from "../common/entity/toggle-entity.js";

import EventsMixin from "../../../mixins/events-mixin.js";
import LocalizeMixin from "../../../mixins/localize-mixin.js";

const UNAVAILABLE = "Unavailable";

/*
 * @appliesMixin LocalizeMixin
 * @appliesMixin EventsMixin
 */
class HuiPictureEntityCard extends EventsMixin(LocalizeMixin(PolymerElement)) {
  static get template() {
    return html`
      <style>
        ha-card {
          min-height: 75px;
          overflow: hidden;
          position: relative;
        }
        ha-card.canInteract {
          cursor: pointer;
        }
        .footer {
          @apply --paper-font-common-nowrap;
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.3);
          padding: 16px;
          font-size: 16px;
          line-height: 16px;
          color: white;
        }
        .both {
          display: flex;
          justify-content: space-between;
        }
        .state {
          text-align: right;
        }
      </style>

      <ha-card id='card' on-click="_cardClicked">
        <hui-image
          hass="[[hass]]"
          image="[[_config.image]]"
          state-image="[[_config.state_image]]"
          camera-image="[[_getCameraImage(_config)]]"
          entity="[[_config.entity]]"
          aspect-ratio="[[_config.aspect_ratio]]"
        ></hui-image>
        <template is="dom-if" if="[[_showNameAndState(_config)]]">
          <div class="footer both">
            <div>[[_name]]</div>
            <div>[[_state]]</div>
        </div>
        </template>
        <template is="dom-if" if="[[_showName(_config)]]">
          <div class="footer">
            [[_name]]
          </div>
        </template>
        <template is="dom-if" if="[[_showState(_config)]]">
          <div class="footer state">
            [[_state]]
          </div>
        </template>
      </ha-card>
    `;
  }

  static get properties() {
    return {
      hass: {
        type: Object,
        observer: "_hassChanged",
      },
      _config: Object,
      _name: String,
      _state: String,
    };
  }

  getCardSize() {
    return 3;
  }

  setConfig(config) {
    if (!config || !config.entity) {
      throw new Error("Error in card configuration.");
    }

    this._entityDomain = computeDomain(config.entity);
    if (
      this._entityDomain !== "camera" &&
      (!config.image && !config.state_image && !config.camera_image)
    ) {
      throw new Error("No image source configured.");
    }

    this._config = config;
  }

  _hassChanged(hass) {
    const config = this._config;
    const entityId = config.entity;
    const stateObj = hass.states[entityId];

    // Nothing changed
    if (
      (!stateObj && this._oldState === UNAVAILABLE) ||
      (stateObj && stateObj.state === this._oldState)
    ) {
      return;
    }

    let name;
    let state;
    let stateLabel;
    let available;

    if (stateObj) {
      name = config.name || computeStateName(stateObj);
      state = stateObj.state;
      stateLabel = computeStateDisplay(this.localize, stateObj);
      available = true;
    } else {
      name = config.name || entityId;
      state = UNAVAILABLE;
      stateLabel = this.localize("state.default.unavailable");
      available = false;
    }

    this.setProperties({
      _name: name,
      _state: stateLabel,
      _oldState: state,
    });

    this.$.card.classList.toggle("canInteract", available);
  }

  _showNameAndState(config) {
    return config.show_name !== false && config.show_state !== false;
  }

  _showName(config) {
    return config.show_name !== false && config.show_state === false;
  }

  _showState(config) {
    return config.show_name === false && config.show_state !== false;
  }

  _cardClicked() {
    const config = this._config;
    const entityId = config.entity;

    if (!(entityId in this.hass.states)) return;

    if (config.tap_action === "toggle") {
      toggleEntity(this.hass, entityId);
    } else {
      this.fire("hass-more-info", { entityId });
    }
  }

  _getCameraImage(config) {
    return this._entityDomain === "camera"
      ? config.entity
      : config.camera_image;
  }
}

customElements.define("hui-picture-entity-card", HuiPictureEntityCard);

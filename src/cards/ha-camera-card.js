import "@polymer/paper-styles/element-styles/paper-material-styles";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import computeStateName from "../common/entity/compute_state_name";
import { EventsMixin } from "../mixins/events-mixin";
import LocalizeMixin from "../mixins/localize-mixin";
import { fetchThumbnailUrlWithCache } from "../data/camera";

const UPDATE_INTERVAL = 10000; // ms
/*
 * @appliesMixin LocalizeMixin
 * @appliesMixin EventsMixin
 */
class HaCameraCard extends LocalizeMixin(EventsMixin(PolymerElement)) {
  static get template() {
    return html`
      <style include="paper-material-styles">
        :host {
          @apply --paper-material-elevation-1;
          display: block;
          position: relative;
          font-size: 0px;
          border-radius: 2px;
          cursor: pointer;
          min-height: 48px;
          line-height: 0;
        }
        .camera-feed {
          width: 100%;
          height: auto;
          border-radius: 2px;
        }
        .caption {
          @apply --paper-font-common-nowrap;
          position: absolute;
          left: 0px;
          right: 0px;
          bottom: 0px;
          border-bottom-left-radius: 2px;
          border-bottom-right-radius: 2px;

          background-color: rgba(0, 0, 0, 0.3);
          padding: 16px;

          font-size: 16px;
          font-weight: 500;
          line-height: 16px;
          color: white;
        }
      </style>

      <template is="dom-if" if="[[cameraFeedSrc]]">
        <img
          src="[[cameraFeedSrc]]"
          class="camera-feed"
          alt="[[_computeStateName(stateObj)]]"
          on-load="_imageLoaded"
          on-error="_imageError"
        />
      </template>
      <div class="caption">
        [[_computeStateName(stateObj)]]
        <template is="dom-if" if="[[!imageLoaded]]">
          ([[localize('ui.card.camera.not_available')]])
        </template>
      </div>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      stateObj: {
        type: Object,
        observer: "updateCameraFeedSrc",
      },
      cameraFeedSrc: {
        type: String,
        value: "",
      },
      imageLoaded: {
        type: Boolean,
        value: true,
      },
    };
  }

  ready() {
    super.ready();
    this.addEventListener("click", () => this.cardTapped());
  }

  connectedCallback() {
    super.connectedCallback();
    this.timer = setInterval(() => this.updateCameraFeedSrc(), UPDATE_INTERVAL);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearInterval(this.timer);
  }

  _imageLoaded() {
    this.imageLoaded = true;
  }

  _imageError() {
    this.imageLoaded = false;
  }

  cardTapped() {
    this.fire("hass-more-info", { entityId: this.stateObj.entity_id });
  }

  async updateCameraFeedSrc() {
    this.cameraFeedSrc = await fetchThumbnailUrlWithCache(
      this.hass,
      this.stateObj.entity_id
    );
  }

  _computeStateName(stateObj) {
    return computeStateName(stateObj);
  }
}
customElements.define("ha-camera-card", HaCameraCard);

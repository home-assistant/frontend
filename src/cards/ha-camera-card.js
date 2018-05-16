import '@polymer/paper-styles/element-styles/paper-material-styles.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';


import computeStateName from '../common/entity/compute_state_name.js';
import EventsMixin from '../mixins/events-mixin.js';
import LocalizeMixin from '../mixins/localize-mixin.js';

{
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

    <img src="[[cameraFeedSrc]]" class="camera-feed" hidden\$="[[!imageLoaded]]" alt="[[_computeStateName(stateObj)]]">
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
          observer: 'updateCameraFeedSrc',
        },
        cameraFeedSrc: String,
        imageLoaded: {
          type: Boolean,
          value: true,
        },
      };
    }

    ready() {
      super.ready();
      this.addEventListener('click', () => this.cardTapped());
    }

    connectedCallback() {
      super.connectedCallback();
      this.timer = setInterval(() => this.updateCameraFeedSrc(), UPDATE_INTERVAL);
    }

    disconnectedCallback() {
      super.disconnectedCallback();
      clearInterval(this.timer);
    }

    cardTapped() {
      this.fire('hass-more-info', { entityId: this.stateObj.entity_id });
    }

    updateCameraFeedSrc() {
      this.hass.connection.sendMessagePromise({
        type: 'camera_thumbnail',
        entity_id: this.stateObj.entity_id,
      }).then((resp) => {
        if (resp.success) {
          this.setProperties({
            imageLoaded: true,
            cameraFeedSrc: `data:${resp.result.content_type};base64, ${resp.result.content}`,
          });
        } else {
          this.imageLoaded = false;
        }
      });
    }

    _computeStateName(stateObj) {
      return computeStateName(stateObj);
    }
  }
  customElements.define('ha-camera-card', HaCameraCard);
}

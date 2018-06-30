import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import '@polymer/paper-toggle-button/paper-toggle-button.js';

import { STATES_OFF } from '../../../common/const.js';
import LocalizeMixin from '../../../mixins/localize-mixin.js';

const UPDATE_INTERVAL = 10000;

/*
 * @appliesMixin LocalizeMixin
 */
class HuiImage extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
      <style>
        .state-off {
          filter: grayscale(100%);
        } 
        
        img {
          display: block;
          height: auto;
          transition: filter .2s linear;
          width: 100%;
        }
        
        .error {
          width: 100%;
          height: auto;
          text-align: center;
        }
        
      </style>
      
      <template is="dom-if" if="[[imageSrc]]">
        <img src="[[imageSrc]]" on-error="_onImageError" on-load="_onImageLoad" id="image" class$="[[_getStateClass(state)]]"/>
      </template>
      <template is="dom-if" if="[[_error]]">
        <div class="error">[[localize('ui.card.camera.not_available')]]</div>
      </template>
`;
  }

  static get properties() {
    return {
      hass: Object,
      state: {
        type: String,
        observer: '_stateChanged'
      },
      image: String,
      stateImage: Object,
      cameraImage: String,
      imageSrc: String,
      _error: {
        type: Boolean,
        value: false
      }
    };
  }

  static get observers() {
    return ['_configChanged(image, state_image, camera_image)'];
  }

  connectedCallback() {
    super.connectedCallback();
    if (this.cameraImage) {
      this.timer = setInterval(this._updateCameraImageSrc(), UPDATE_INTERVAL);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearInterval(this.timer);
  }

  _configChanged(image, stateImage, cameraImage) {
    if (image && !stateImage && !cameraImage) {
      this.imageSrc = image;
    }
  }

  _getStateClass(state) {
    return !this.stateImage && !this.cameraImage && STATES_OFF.includes(state) ? 'state-off' : '';
  }

  _onImageError() {
    this.setProperties({
      imageSrc: null,
      _error: true
    });
  }

  _onImageLoad() {
    this._error = false;
  }

  _stateChanged(state) {
    if (this.cameraImage || !this.stateImage) {
      return;
    }

    const stateImg = this.stateImage &&
      (this.stateImage[state] || this.stateImage.default);

    this.imageSrc = stateImg || this.image;
  }

  _updateCameraImageSrc() {
    this.hass.connection.sendMessagePromise({
      type: 'camera_thumbnail',
      entity_id: this.cameraImage,
    }).then((resp) => {
      if (resp.success) {
        this.setProperties({
          imageSrc: `data:${resp.result.content_type};base64, ${resp.result.content}`,
          _error: false
        });
      } else {
        this.setProperties({
          imageSrc: null,
          _error: true
        });
      }
    });
  }
}

customElements.define('hui-image', HuiImage);

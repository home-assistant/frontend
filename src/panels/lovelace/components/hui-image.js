import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import '@polymer/paper-toggle-button/paper-toggle-button.js';

import { STATES_OFF } from '../../../common/const.js';
import LocalizeMixin from '../../../mixins/localize-mixin.js';
import isValidObject from '../common/is-valid-object';

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
      
      <template is="dom-if" if="[[_imageSrc]]">
        <img 
          src="[[_imageSrc]]" 
          on-error="_onImageError" 
          on-load="_onImageLoad" 
          class$="[[_imageClass]]" />
      </template>
      <template is="dom-if" if="[[_error]]">
        <div class="error">[[localize('ui.card.camera.not_available')]]</div>
      </template>
`;
  }

  static get properties() {
    return {
      hass: {
        type: Object,
        observer: '_hassChanged'
      },
      entity: String,
      image: String,
      stateImage: Object,
      cameraImage: String,
      _error: {
        type: Boolean,
        value: false
      },
      _imageClass: String,
      _imageSrc: String
    };
  }

  static get observers() {
    return ['_configChanged(image, stateImage, cameraImage)'];
  }

  connectedCallback() {
    super.connectedCallback();
    if (this.cameraImage) {
      this.timer = setInterval(() => this._updateCameraImageSrc(), UPDATE_INTERVAL);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearInterval(this.timer);
  }

  _configChanged(image, stateImage, cameraImage) {
    if (cameraImage) {
      this._updateCameraImageSrc();
    } else if (image && !stateImage) {
      this._imageSrc = image;
    }
  }

  _onImageError() {
    this.setProperties({
      _imageSrc: null,
      _error: true
    });
  }

  _onImageLoad() {
    this._error = false;
  }

  _hassChanged(hass) {
    if (this.cameraImage || !this.entity) {
      return;
    }

    const state = hass.states[this.entity];
    const unavailable = !isValidObject(state, ['state']);

    if (!this.stateImage) {
      this._imageClass = unavailable || STATES_OFF.includes(state.state) ? 'state-off' : '';
      return;
    }

    const stateImg = !unavailable ? this.stateImage[state.state] : this.stateImage.unavailable;

    this.setProperties({
      _imageClass: !stateImg && (unavailable || STATES_OFF.includes(state.state)) ? 'state-off' : '',
      _imageSrc: stateImg || this.image
    });
  }

  _updateCameraImageSrc() {
    this.hass.connection.sendMessagePromise({
      type: 'camera_thumbnail',
      entity_id: this.cameraImage,
    }).then((resp) => {
      if (resp.success) {
        this.setProperties({
          _imageSrc: `data:${resp.result.content_type};base64, ${resp.result.content}`,
          _error: false
        });
      } else {
        this.setProperties({
          _imageSrc: null,
          _error: true
        });
      }
    });
  }
}

customElements.define('hui-image', HuiImage);

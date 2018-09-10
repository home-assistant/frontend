import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import '@polymer/paper-toggle-button/paper-toggle-button.js';

import { STATES_OFF } from '../../../common/const.js';
import LocalizeMixin from '../../../mixins/localize-mixin.js';

const UPDATE_INTERVAL = 10000;
const DEFAULT_FILTER = 'grayscale(100%)';

/*
 * @appliesMixin LocalizeMixin
 */
class HuiImage extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
      <style>
        img {
          display: block;
          height: auto;
          transition: filter .2s linear;
          width: 100%;
        }

        .error {
          text-align: center;
        }

        .hidden {
          display: none;
        }

        #brokenImage {
          background: grey url('/static/images/image-broken.svg') center/36px no-repeat;
        }

      </style>

      <img
        id="image"
        src="[[_imageSrc]]"
        on-error="_onImageError"
        on-load="_onImageLoad" />
      <div id="brokenImage"></div>
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
      filter: String,
      stateFilter: Object,
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
    this._imageSrc = null;
    this.$.image.classList.add('hidden');
    this.$.brokenImage.style.setProperty('height', `${this._lastImageHeight || '100'}px`);
    this.$.brokenImage.classList.remove('hidden');
  }

  _onImageLoad() {
    this.$.image.classList.remove('hidden');
    this.$.brokenImage.classList.add('hidden');
    this._lastImageHeight = this.$.image.offsetHeight;
  }

  _hassChanged(hass) {
    if (this.cameraImage || !this.entity) {
      return;
    }

    const stateObj = hass.states[this.entity];
    const newState = !stateObj ? 'unavailable' : stateObj.state;

    if (newState === this._currentState) return;
    this._currentState = newState;

    this._updateStateImage();
    this._updateStateFilter(stateObj);
  }

  _updateStateImage() {
    if (!this.stateImage) {
      this._imageFallback = true;
      return;
    }
    const stateImg = this.stateImage[this._currentState];
    this._imageSrc = stateImg || this.image;
    this._imageFallback = !stateImg;
  }

  _updateStateFilter(stateObj) {
    let filter;
    if (!this.stateFilter) {
      filter = this.filter;
    } else {
      filter = this.stateFilter[this._currentState] || this.filter;
    }

    const isOff = !stateObj || STATES_OFF.includes(stateObj.state);
    this.$.image.style.filter = filter || (isOff && this._imageFallback && DEFAULT_FILTER) || '';
  }

  async _updateCameraImageSrc() {
    try {
      const { content_type: contentType, content } = await this.hass.callWS({
        type: 'camera_thumbnail',
        entity_id: this.cameraImage,
      });
      this._imageSrc = `data:${contentType};base64, ${content}`;
      this._onImageLoad();
    } catch (err) {
      this._onImageError();
    }
  }
}

customElements.define('hui-image', HuiImage);

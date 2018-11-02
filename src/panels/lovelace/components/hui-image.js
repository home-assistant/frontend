import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";
import "@polymer/paper-toggle-button/paper-toggle-button";

import { STATES_OFF } from "../../../common/const";
import LocalizeMixin from "../../../mixins/localize-mixin";

import parseAspectRatio from "../../../common/util/parse-aspect-ratio";

const UPDATE_INTERVAL = 10000;
const DEFAULT_FILTER = "grayscale(100%)";

/*
 * @appliesMixin LocalizeMixin
 */
class HuiImage extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
      ${this.styleTemplate}
      <div id="wrapper">
        <img
          id="image"
          src="[[_imageSrc]]"
          on-error="_onImageError"
          on-load="_onImageLoad" />
        <div id="brokenImage"></div>
      </div>
    `;
  }

  static get styleTemplate() {
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

        .ratio {
          position: relative;
          width: 100%;
          height: 0
        }

        .ratio img, .ratio div {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }

        #brokenImage {
          background: grey url('/static/images/image-broken.svg') center/36px no-repeat;
        }

      </style>
    `;
  }

  static get properties() {
    return {
      hass: {
        type: Object,
        observer: "_hassChanged",
      },
      entity: String,
      image: String,
      stateImage: Object,
      cameraImage: String,
      aspectRatio: String,
      filter: String,
      stateFilter: Object,
      _imageSrc: String,
    };
  }

  static get observers() {
    return ["_configChanged(image, stateImage, cameraImage, aspectRatio)"];
  }

  connectedCallback() {
    super.connectedCallback();
    if (this.cameraImage) {
      this.timer = setInterval(
        () => this._updateCameraImageSrc(),
        UPDATE_INTERVAL
      );
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearInterval(this.timer);
  }

  _configChanged(image, stateImage, cameraImage, aspectRatio) {
    const ratio = parseAspectRatio(aspectRatio);

    if (ratio && ratio.w > 0 && ratio.h > 0) {
      this.$.wrapper.style.paddingBottom = `${(
        (100 * ratio.h) /
        ratio.w
      ).toFixed(2)}%`;
      this.$.wrapper.classList.add("ratio");
    }

    if (cameraImage) {
      this._updateCameraImageSrc();
    } else if (image && !stateImage) {
      this._imageSrc = image;
    }
  }

  _onImageError() {
    this._imageSrc = null;
    this.$.image.classList.add("hidden");
    if (!this.$.wrapper.classList.contains("ratio")) {
      this.$.brokenImage.style.setProperty(
        "height",
        `${this._lastImageHeight || "100"}px`
      );
    }
    this.$.brokenImage.classList.remove("hidden");
  }

  _onImageLoad() {
    this.$.image.classList.remove("hidden");
    this.$.brokenImage.classList.add("hidden");
    if (!this.$.wrapper.classList.contains("ratio")) {
      this._lastImageHeight = this.$.image.offsetHeight;
    }
  }

  _hassChanged(hass) {
    if (this.cameraImage || !this.entity) {
      return;
    }

    const stateObj = hass.states[this.entity];
    const newState = !stateObj ? "unavailable" : stateObj.state;

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
    this.$.image.style.filter =
      filter || (isOff && this._imageFallback && DEFAULT_FILTER) || "";
  }

  async _updateCameraImageSrc() {
    try {
      const { content_type: contentType, content } = await this.hass.callWS({
        type: "camera_thumbnail",
        entity_id: this.cameraImage,
      });
      this._imageSrc = `data:${contentType};base64, ${content}`;
      this._onImageLoad();
    } catch (err) {
      this._onImageError();
    }
  }
}

customElements.define("hui-image", HuiImage);

import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import '../../../util/hass-mixins.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
class MoreInfoCamera extends window.hassMixins.EventsMixin(PolymerElement) {
  static get template() {
    return html`
    <style>
      :host {
        max-width:640px;
      }

      .camera-image {
        width: 100%;
      }
    </style>

    <img class="camera-image" src="[[computeCameraImageUrl(hass, stateObj, isVisible)]]" on-load="imageLoaded" alt="[[computeStateName(stateObj)]]">
`;
  }

  static get is() { return 'more-info-camera'; }

  static get properties() {
    return {
      hass: {
        type: Object,
      },

      stateObj: {
        type: Object,
      },

      isVisible: {
        type: Boolean,
        value: true,
      },
    };
  }

  connectedCallback() {
    super.connectedCallback();
    this.isVisible = true;
  }

  disconnectedCallback() {
    this.isVisible = false;
    super.disconnectedCallback();
  }

  imageLoaded() {
    this.fire('iron-resize');
  }

  computeStateName(stateObj) {
    return window.hassUtil.computeStateName(stateObj);
  }

  computeCameraImageUrl(hass, stateObj, isVisible) {
    if (hass.demo) {
      return '/demo/webcam.jpg';
    } else if (stateObj && isVisible) {
      return '/api/camera_proxy_stream/' + stateObj.entity_id +
             '?token=' + stateObj.attributes.access_token;
    }
    // Return an empty image if no stateObj (= dialog not open) or in cleanup mode.
    return 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
  }
}

customElements.define(MoreInfoCamera.is, MoreInfoCamera);

import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import computeStateName from '../../../common/entity/compute_state_name.js';
import emptyImageBase64 from '../../../common/empty_image_base64.js';
import EventsMixin from '../../../mixins/events-mixin.js';

/*
 * @appliesMixin EventsMixin
 */
class MoreInfoCamera extends EventsMixin(PolymerElement) {
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

    <img class="camera-image" src="[[computeCameraImageUrl(hass, stateObj, isVisible)]]" on-load="imageLoaded" alt="[[_computeStateName(stateObj)]]">
`;
  }

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

  _computeStateName(stateObj) {
    return computeStateName(stateObj);
  }

  computeCameraImageUrl(hass, stateObj, isVisible) {
    if (hass.demo) {
      return '/demo/webcam.jpg';
    } else if (stateObj && isVisible) {
      return '/api/camera_proxy_stream/' + stateObj.entity_id +
             '?token=' + stateObj.attributes.access_token;
    }
    // Return an empty image if no stateObj (= dialog not open) or in cleanup mode.
    return emptyImageBase64;
  }
}

customElements.define('more-info-camera', MoreInfoCamera);

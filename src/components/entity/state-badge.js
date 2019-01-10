import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../ha-icon";
import computeStateDomain from "../../common/entity/compute_state_domain";
import stateIcon from "../../common/entity/state_icon";

class StateBadge extends PolymerElement {
  static get template() {
    return html`
      <style>
        :host {
          position: relative;
          display: inline-block;
          width: 40px;
          color: var(--paper-item-icon-color, #44739e);
          border-radius: 50%;
          height: 40px;
          text-align: center;
          background-size: cover;
          line-height: 40px;
        }

        ha-icon {
          transition: color 0.3s ease-in-out, filter 0.3s ease-in-out;
        }

        /* Color the icon if light or sun is on */
        ha-icon[data-domain="light"][data-state="on"],
        ha-icon[data-domain="switch"][data-state="on"],
        ha-icon[data-domain="binary_sensor"][data-state="on"],
        ha-icon[data-domain="input_boolean"][data-state="on"],
        ha-icon[data-domain="fan"][data-state="on"],
        ha-icon[data-domain="cover"][data-state="open"],
        ha-icon[data-domain="device_tracker"][data-state="home"],
        ha-icon[data-domain="group"][data-state="on"],
        ha-icon[data-domain="sun"][data-state="above_horizon"] {
          color: var(--paper-item-icon-active-color, #fdd835);
        }

        /* Color the icon if unavailable */
        ha-icon[data-state="unavailable"] {
          color: var(--state-icon-unavailable-color);
        }
      </style>

      <ha-icon
        id="icon"
        data-domain$="[[_computeDomain(stateObj)]]"
        data-state$="[[stateObj.state]]"
        icon="[[_computeIcon(stateObj, overrideIcon)]]"
      ></ha-icon>
    `;
  }

  static get properties() {
    return {
      stateObj: {
        type: Object,
        observer: "_updateIconAppearance",
      },
      overrideIcon: String,
    };
  }

  _computeDomain(stateObj) {
    return computeStateDomain(stateObj);
  }

  _computeIcon(stateObj, overrideIcon) {
    return overrideIcon || stateIcon(stateObj);
  }

  _updateIconAppearance(newVal) {
    var errorMessage = null;
    const iconStyle = {
      color: "",
      filter: "",
    };
    const hostStyle = {
      backgroundImage: "",
    };
    // hide icon if we have entity picture
    if (newVal.attributes.entity_picture) {
      hostStyle.backgroundImage =
        "url(" + newVal.attributes.entity_picture + ")";
      iconStyle.display = "none";
    } else {
      if (newVal.attributes.hs_color) {
        const hue = newVal.attributes.hs_color[0];
        const sat = newVal.attributes.hs_color[1];
        if (sat > 10) iconStyle.color = `hsl(${hue}, 100%, ${100 - sat / 2}%)`;
      }
      if (newVal.attributes.brightness) {
        const brightness = newVal.attributes.brightness;
        if (typeof brightness !== "number") {
          errorMessage = `Type error: state-badge expected number, but type of ${
            newVal.entity_id
            }.attributes.brightness is ${typeof brightness} (${brightness})`;
          // eslint-disable-next-line
          console.warn(errorMessage);
        }
        // lowest brighntess will be around 50% (that's pretty dark)
        iconStyle.filter = `brightness(${(brightness + 245) / 5}%)`;
      }
    }
    Object.assign(this.$.icon.style, iconStyle);
    Object.assign(this.style, hostStyle);
    if (errorMessage) {
      throw new Error(`Frontend error: ${errorMessage}`);
    }
  }
}
customElements.define("state-badge", StateBadge);

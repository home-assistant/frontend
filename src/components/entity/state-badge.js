import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import './ha-state-icon.js';
import computeStateDomain from '../../common/entity/compute_state_domain.js';

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

    ha-state-icon {
      transition: color .3s ease-in-out, filter .3s ease-in-out;
    }

    /* Color the icon if light or sun is on */
    ha-state-icon[data-domain=light][data-state=on],
    ha-state-icon[data-domain=switch][data-state=on],
    ha-state-icon[data-domain=binary_sensor][data-state=on],
    ha-state-icon[data-domain=fan][data-state=on],
    ha-state-icon[data-domain=sun][data-state=above_horizon] {
      color: var(--paper-item-icon-active-color, #FDD835);
    }

    /* Color the icon if unavailable */
    ha-state-icon[data-state=unavailable] {
      color: var(--state-icon-unavailable-color);
    }
    </style>

    <ha-state-icon id="icon" state-obj="[[stateObj]]" data-domain$="[[computeDomain(stateObj)]]" data-state$="[[stateObj.state]]"></ha-state-icon>
`;
  }

  static get properties() {
    return {
      stateObj: {
        type: Object,
        observer: 'updateIconAppearance',
      },
    };
  }

  computeDomain(stateObj) {
    return computeStateDomain(stateObj);
  }


  updateIconAppearance(newVal) {
    const iconStyle = {
      display: 'inline',
      color: '',
      filter: '',
    };
    const hostStyle = {
      backgroundImage: '',
    };
    // hide icon if we have entity picture
    if (newVal.attributes.entity_picture) {
      hostStyle.backgroundImage = 'url(' + newVal.attributes.entity_picture + ')';
      iconStyle.display = 'none';
    } else {
      if (newVal.attributes.hs_color) {
        const hue = newVal.attributes.hs_color[0];
        const sat = newVal.attributes.hs_color[1];
        if (sat > 10) iconStyle.color = `hsl(${hue}, 100%, ${100 - (sat / 2)}%)`;
      }
      if (newVal.attributes.brightness) {
        const brightness = newVal.attributes.brightness;
        // lowest brighntess will be around 50% (that's pretty dark)
        iconStyle.filter = `brightness(${(brightness + 245) / 5}%)`;
      }
    }
    Object.assign(this.$.icon.style, iconStyle);
    Object.assign(this.style, hostStyle);
  }
}
customElements.define('state-badge', StateBadge);

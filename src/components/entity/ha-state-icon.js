import '@polymer/iron-icon/iron-icon.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import stateIcon from '../../../js/common/entity/state_icon.js';

class HaStateIcon extends PolymerElement {
  static get template() {
    return html`
    <iron-icon icon="[[computeIcon(stateObj)]]"></iron-icon>
`;
  }

  static get properties() {
    return {
      stateObj: {
        type: Object,
      },
    };
  }

  computeIcon(stateObj) {
    return stateIcon(stateObj);
  }
}

customElements.define('ha-state-icon', HaStateIcon);

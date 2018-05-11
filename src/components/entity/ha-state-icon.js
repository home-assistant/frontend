import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import '@polymer/iron-icon/iron-icon.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';

class HaStateIcon extends PolymerElement {
  static get template() {
    return html`
    <iron-icon icon="[[computeIcon(stateObj)]]"></iron-icon>
`;
  }

  static get is() { return 'ha-state-icon'; }

  static get properties() {
    return {
      stateObj: {
        type: Object,
      },
    };
  }

  computeIcon(stateObj) {
    return window.hassUtil.stateIcon(stateObj);
  }
}

customElements.define(HaStateIcon.is, HaStateIcon);

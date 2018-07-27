import '@polymer/paper-icon-button/paper-icon-button.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import EventsMixin from '../mixins/events-mixin.js';

/*
 * @appliesMixin EventsMixin
 */
class HaMenuButton extends EventsMixin(PolymerElement) {
  static get template() {
    return html`
    <paper-icon-button
      icon="[[_getIcon(hassio)]]"
      on-click="toggleMenu"
    ></paper-icon-button>
`;
  }

  static get properties() {
    return {
      narrow: {
        type: Boolean,
        value: false,
      },

      showMenu: {
        type: Boolean,
        value: false,
      },

      hassio: {
        type: Boolean,
        value: false,
      }
    };
  }

  toggleMenu(ev) {
    ev.stopPropagation();
    this.fire(this.showMenu ? 'hass-close-menu' : 'hass-open-menu');
  }

  _getIcon(hassio) {
    // hass:menu
    return `${hassio ? 'hassio' : 'hass'}:menu`;
  }
}

customElements.define('ha-menu-button', HaMenuButton);

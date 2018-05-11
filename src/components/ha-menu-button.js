import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '../util/hass-mixins.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';

class HaMenuButton extends window.hassMixins.EventsMixin(PolymerElement) {
  static get template() {
    return html`
    <style>
      .invisible {
        visibility: hidden;
      }
    </style>
    <paper-icon-button icon="mdi:menu" class\$="[[computeMenuButtonClass(narrow, showMenu)]]" on-click="toggleMenu"></paper-icon-button>
`;
  }

  static get is() { return 'ha-menu-button'; }

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
    };
  }

  computeMenuButtonClass(narrow, showMenu) {
    return !narrow && showMenu ? 'invisible' : '';
  }

  toggleMenu(ev) {
    ev.stopPropagation();
    this.fire('hass-open-menu');
  }
}

customElements.define(HaMenuButton.is, HaMenuButton);

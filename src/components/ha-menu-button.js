import "@polymer/paper-icon-button/paper-icon-button";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import EventsMixin from "../mixins/events-mixin";

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
      },
    };
  }

  toggleMenu(ev) {
    ev.stopPropagation();
    this.fire(this.showMenu ? "hass-close-menu" : "hass-open-menu");
  }

  _getIcon(hassio) {
    // hass:menu
    return `${hassio ? "hassio" : "hass"}:menu`;
  }
}

customElements.define("ha-menu-button", HaMenuButton);

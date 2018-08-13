import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import LocalizeMixin from '../mixins/localize-mixin.js';

class NotificationManager extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
    <style>
      paper-toast {
        z-index: 1;
      }
    </style>

    <ha-toast
      id="toast"
      no-cancel-on-outside-click="[[_cancelOnOutsideClick]]"
    ></ha-toast>
`;
  }

  static get properties() {
    return {
      hass: Object,

      _cancelOnOutsideClick: {
        type: Boolean,
        value: false,
      },
    };
  }

  ready() {
    super.ready();
    import(/* webpackChunkName: "ha-toast" */ '../components/ha-toast.js');
  }

  showDialog({ message }) {
    this.$.toast.show(message);
  }
}

customElements.define('notification-manager', NotificationManager);

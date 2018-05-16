import '@polymer/paper-toast/paper-toast.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

class NotificationManager extends PolymerElement {
  static get template() {
    return html`
    <style>
      paper-toast {
        z-index: 1;
      }
    </style>

    <paper-toast id="toast" text="[[_text]]" no-cancel-on-outside-click="[[_cancelOnOutsideClick]]"></paper-toast>
    <paper-toast id="connToast" duration="0" text="Connection lost. Reconnecting…" opened="[[connectionLost]]"></paper-toast>
`;
  }

  static get properties() {
    return {
      hass: {
        type: Object,
        observer: 'hassChanged',
      },

      wasConnected: {
        type: Boolean,
        value: false,
      },

      connectionLost: {
        type: Boolean,
        computed: 'computeConnectionLost(wasConnected, hass)',
      },

      _cancelOnOutsideClick: {
        type: Boolean,
        value: false,
      },

      _text: {
        type: String,
        readOnly: true,
      },

      toastClass: {
        type: String,
        value: '',
      },
    };
  }

  hassChanged(hass) {
    if (hass && hass.connected) {
      // Once the connetion is established, set wasConnected to true
      this.wasConnected = true;
    }
    if (!hass || !hass.connection) {
      // If the users logs out, reset wasConnected
      this.wasConnected = false;
    }
  }

  computeConnectionLost(wasConnected, hass) {
    return wasConnected && hass && !hass.connected;
  }

  constructor() {
    super();
    this.handleWindowChange = this.handleWindowChange.bind(this);
    this._mediaq = window.matchMedia('(max-width: 599px)');
    this._mediaq.addListener(this.handleWindowChange);
  }

  connectedCallback() {
    super.connectedCallback();
    this.handleWindowChange(this._mediaq);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._mediaq.removeListener(this.handleWindowChange);
  }

  handleWindowChange(ev) {
    this.$.toast.classList.toggle('fit-bottom', ev.matches);
    this.$.connToast.classList.toggle('fit-bottom', ev.matches);
  }

  showNotification(message) {
    this._set_text(message);
    this.$.toast.show();
  }
}

customElements.define('notification-manager', NotificationManager);

import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import LocalizeMixin from "../mixins/localize-mixin";
import { computeRTL } from "../common/util/compute_rtl";

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
        dir="[[_rtl]]"
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

      _rtl: {
        type: String,
        computed: "_computeRTLDirection(hass)",
      },
    };
  }

  ready() {
    super.ready();
    import(/* webpackChunkName: "ha-toast" */ "../components/ha-toast");
  }

  showDialog({ message }) {
    this.$.toast.show(message);
  }

  _computeRTLDirection(hass) {
    return computeRTL(hass) ? "rtl" : "ltr";
  }
}

customElements.define("notification-manager", NotificationManager);

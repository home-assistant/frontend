import "@polymer/paper-card/paper-card.js";
import { html } from "@polymer/polymer/lib/utils/html-tag.js";
import { PolymerElement } from "@polymer/polymer/polymer-element.js";

import { enableWrite } from "../common/auth/token_storage.js";
import LocalizeMixin from "../mixins/localize-mixin.js";

import "../resources/ha-style.js";

class HaStoreAuth extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
      <style include='ha-style'>
        paper-card {
          position: fixed;
          padding: 8px 0;
          bottom: 16px;
          right: 16px;
        }

        .card-actions {
          text-align: right;
          border-top: 0;
          margin-right: -4px;
        }

        :host(.small) paper-card {
          bottom: 0;
          left: 0;
          right: 0;
        }
      </style>
      <paper-card elevation="4">
        <div class='card-content'>
          [[localize('ui.auth_store.ask')]]
        </div>
        <div class='card-actions'>
          <paper-button on-click='_done'>[[localize('ui.auth_store.decline')]]</paper-button>
          <paper-button primary on-click='_save'>[[localize('ui.auth_store.confirm')]]</paper-button>
        </div>
      </paper-card>
    `;
  }

  static get properties() {
    return {
      hass: Object,
    };
  }

  ready() {
    super.ready();
    this.classList.toggle("small", window.innerWidth < 600);
  }

  _save() {
    enableWrite();
    this._done();
  }

  _done() {
    const card = this.shadowRoot.querySelector("paper-card");
    card.style.transition = "bottom .25s";
    card.style.bottom = `-${card.offsetHeight + 8}px`;
    setTimeout(() => this.parentNode.removeChild(this), 300);
  }
}

customElements.define("ha-store-auth-card", HaStoreAuth);

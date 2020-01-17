import "@polymer/paper-card/paper-card";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import { enableWrite } from "../common/auth/token_storage";
import LocalizeMixin from "../mixins/localize-mixin";

import "../resources/ha-style";

class HaStoreAuth extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
      <style include="ha-style">
        paper-card {
          position: absolute;
          padding: 8px 0;
          top: 50%;
          left: 50%;
        }

        .card-content {
          color: var(--primary-text-color);
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
        <div class="card-content">[[localize('ui.auth_store.ask')]]</div>
        <div class="card-actions">
          <mwc-button on-click="_done"
            >[[localize('ui.auth_store.decline')]]</mwc-button
          >
          <mwc-button raised on-click="_save"
            >[[localize('ui.auth_store.confirm')]]</mwc-button
          >
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

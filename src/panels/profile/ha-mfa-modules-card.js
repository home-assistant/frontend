import "@polymer/paper-button/paper-button.js";
import "@polymer/paper-card/paper-card.js";
import "@polymer/paper-item/paper-item-body.js";
import "@polymer/paper-item/paper-item.js";
import { html } from "@polymer/polymer/lib/utils/html-tag.js";
import { PolymerElement } from "@polymer/polymer/polymer-element.js";

import "../../resources/ha-style.js";

import EventsMixin from "../../mixins/events-mixin.js";
import LocalizeMixin from "../../mixins/localize-mixin.js";

let registeredDialog = false;

/*
 * @appliesMixin EventsMixin
 * @appliesMixin LocalizeMixin
 */
class HaMfaModulesCard extends EventsMixin(LocalizeMixin(PolymerElement)) {
  static get template() {
    return html`
    <style include="iron-flex ha-style">
      .error {
        color: red;
      }
      .status {
        color: var(--primary-color);
      }
      .error, .status {
        position: absolute;
        top: -4px;
      }
      paper-card {
        display: block;
        max-width: 600px;
        margin: 16px auto;
      }
      paper-button {
        color: var(--primary-color);
        font-weight: 500;
        margin-right: -.57em;
      }
    </style>
    <paper-card heading="[[localize('ui.panel.profile.mfa.header')]]">
      <template is="dom-repeat" items="[[mfaModules]]" as="module">
        <paper-item>
          <paper-item-body two-line="">
            <div>[[module.name]]</div>
            <div secondary="">[[module.id]]</div>
          </paper-item-body>
          <template is="dom-if" if="[[module.enabled]]">
            <paper-button
              on-click="_disable"
            >[[localize('ui.panel.profile.mfa.disable')]]</paper-button>
          </template>
          <template is="dom-if" if="[[!module.enabled]]">
            <paper-button
              on-click="_enable"
            >[[localize('ui.panel.profile.mfa.enable')]]</paper-button>
          </template>
        </paper-item>
      </template>
    </paper-card>
`;
  }

  static get properties() {
    return {
      hass: Object,

      _loading: {
        type: Boolean,
        value: false,
      },

      // Error message when can't talk to server etc
      _statusMsg: String,
      _errorMsg: String,

      mfaModules: Array,
    };
  }

  connectedCallback() {
    super.connectedCallback();

    if (!registeredDialog) {
      registeredDialog = true;
      this.fire("register-dialog", {
        dialogShowEvent: "show-mfa-module-setup-flow",
        dialogTag: "ha-mfa-module-setup-flow",
        dialogImport: () => import("./ha-mfa-module-setup-flow.js"),
      });
    }
  }

  _enable(ev) {
    this.fire("show-mfa-module-setup-flow", {
      hass: this.hass,
      mfaModuleId: ev.model.module.id,
      dialogClosedCallback: () => this._refreshCurrentUser(),
    });
  }

  _disable(ev) {
    if (
      !confirm(
        this.localize(
          "ui.panel.profile.mfa.confirm_disable",
          "name",
          ev.model.module.name
        )
      )
    ) {
      return;
    }

    const mfaModuleId = ev.model.module.id;

    this.hass
      .callWS({
        type: "auth/depose_mfa",
        mfa_module_id: mfaModuleId,
      })
      .then(() => {
        this._refreshCurrentUser();
      });
  }

  _refreshCurrentUser() {
    this.fire("hass-refresh-current-user");
  }
}

customElements.define("ha-mfa-modules-card", HaMfaModulesCard);

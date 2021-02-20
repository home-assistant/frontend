import "@material/mwc-button";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-item/paper-item-body";
import { html } from "@polymer/polymer/lib/utils/html-tag";
/* eslint-plugin-disable lit */
import { PolymerElement } from "@polymer/polymer/polymer-element";
import "../../components/ha-card";
import { showConfirmationDialog } from "../../dialogs/generic/show-dialog-box";
import { EventsMixin } from "../../mixins/events-mixin";
import LocalizeMixin from "../../mixins/localize-mixin";
import "../../styles/polymer-ha-style";

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
        .error,
        .status {
          position: absolute;
          top: -4px;
        }
        mwc-button {
          margin-right: -0.57em;
        }
      </style>
      <ha-card header="[[localize('ui.panel.profile.mfa.header')]]">
        <template is="dom-repeat" items="[[mfaModules]]" as="module">
          <paper-item>
            <paper-item-body two-line="">
              <div>[[module.name]]</div>
              <div secondary="">[[module.id]]</div>
            </paper-item-body>
            <template is="dom-if" if="[[module.enabled]]">
              <mwc-button on-click="_disable"
                >[[localize('ui.panel.profile.mfa.disable')]]</mwc-button
              >
            </template>
            <template is="dom-if" if="[[!module.enabled]]">
              <mwc-button on-click="_enable"
                >[[localize('ui.panel.profile.mfa.enable')]]</mwc-button
              >
            </template>
          </paper-item>
        </template>
      </ha-card>
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
        dialogImport: () => import("./ha-mfa-module-setup-flow"),
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

  async _disable(ev) {
    const mfamodule = ev.model.module;
    if (
      !(await showConfirmationDialog(this, {
        text: this.localize(
          "ui.panel.profile.mfa.confirm_disable",
          "name",
          mfamodule.name
        ),
      }))
    ) {
      return;
    }

    const mfaModuleId = mfamodule.id;

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

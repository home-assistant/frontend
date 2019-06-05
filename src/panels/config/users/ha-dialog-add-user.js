import "@material/mwc-button";
import "@polymer/paper-spinner/paper-spinner";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../../components/dialog/ha-paper-dialog";
import "../../../resources/ha-style";

import LocalizeMixin from "../../../mixins/localize-mixin";

/*
 * @appliesMixin LocalizeMixin
 */
class HaDialogAddUser extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
      <style include="ha-style-dialog">
        .error {
          color: red;
        }
        ha-paper-dialog {
          max-width: 500px;
        }
        .username {
          margin-top: -8px;
        }
      </style>
      <ha-paper-dialog
        id="dialog"
        with-backdrop
        opened="{{_opened}}"
        on-opened-changed="_openedChanged"
      >
        <h2>[[localize('ui.panel.config.users.add_user.caption')]]</h2>
        <div>
          <template is="dom-if" if="[[_errorMsg]]">
            <div class="error">[[_errorMsg]]</div>
          </template>
          <paper-input
            class="name"
            label="[[localize('ui.panel.config.users.add_user.name')]]"
            value="{{_name}}"
            required
            auto-validate
            autocapitalize="on"
            error-message="Required"
            on-blur="_maybePopulateUsername"
          ></paper-input>
          <paper-input
            class="username"
            label="[[localize('ui.panel.config.users.add_user.username')]]"
            value="{{_username}}"
            required
            auto-validate
            autocapitalize="none"
            error-message="Required"
          ></paper-input>
          <paper-input
            label="[[localize('ui.panel.config.users.add_user.password')]]"
            type="password"
            value="{{_password}}"
            required
            auto-validate
            error-message="Required"
          ></paper-input>
        </div>
        <div class="buttons">
          <template is="dom-if" if="[[_loading]]">
            <div class="submit-spinner">
              <paper-spinner active></paper-spinner>
            </div>
          </template>
          <template is="dom-if" if="[[!_loading]]">
            <mwc-button on-click="_createUser"
              >[[localize('ui.panel.config.users.add_user.create')]]</mwc-button
            >
          </template>
        </div>
      </ha-paper-dialog>
    `;
  }

  static get properties() {
    return {
      _hass: Object,
      _dialogClosedCallback: Function,

      _loading: {
        type: Boolean,
        value: false,
      },

      // Error message when can't talk to server etc
      _errorMsg: String,

      _opened: {
        type: Boolean,
        value: false,
      },

      _name: String,
      _username: String,
      _password: String,
    };
  }

  ready() {
    super.ready();
    this.addEventListener("keypress", (ev) => {
      if (ev.keyCode === 13) {
        this._createUser(ev);
      }
    });
  }

  showDialog({ hass, dialogClosedCallback }) {
    this.hass = hass;
    this._dialogClosedCallback = dialogClosedCallback;
    this._loading = false;
    this._opened = true;
    setTimeout(() => this.shadowRoot.querySelector("paper-input").focus(), 0);
  }

  _maybePopulateUsername() {
    if (this._username) return;

    const parts = this._name.split(" ");

    if (parts.length) {
      this._username = parts[0].toLowerCase();
    }
  }

  async _createUser(ev) {
    ev.preventDefault();
    if (!this._name || !this._username || !this._password) return;

    this._loading = true;
    this._errorMsg = null;

    let userId;

    try {
      const userResponse = await this.hass.callWS({
        type: "config/auth/create",
        name: this._name,
      });
      userId = userResponse.user.id;
    } catch (err) {
      this._loading = false;
      this._errorMsg = err.code;
      return;
    }

    try {
      await this.hass.callWS({
        type: "config/auth_provider/homeassistant/create",
        user_id: userId,
        username: this._username,
        password: this._password,
      });
    } catch (err) {
      this._loading = false;
      this._errorMsg = err.code;
      await this.hass.callWS({
        type: "config/auth/delete",
        user_id: userId,
      });
      return;
    }

    this._dialogDone(userId);
  }

  _dialogDone(userId) {
    this._dialogClosedCallback({ userId });

    this.setProperties({
      _errorMsg: null,
      _username: "",
      _password: "",
      _dialogClosedCallback: null,
      _opened: false,
    });
  }

  _equals(a, b) {
    return a === b;
  }

  _openedChanged(ev) {
    // Closed dialog by clicking on the overlay
    // Check against dialogClosedCallback to make sure we didn't change
    // programmatically
    if (this._dialogClosedCallback && !ev.detail.value) {
      this._dialogDone();
    }
  }
}

customElements.define("ha-dialog-add-user", HaDialogAddUser);

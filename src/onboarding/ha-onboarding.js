import "@polymer/polymer/lib/elements/dom-if";
import "@polymer/polymer/lib/elements/dom-repeat";
import "@polymer/paper-input/paper-input";
import "@polymer/paper-button/paper-button";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";
import { localizeLiteMixin } from "../mixins/localize-lite-mixin";

class HaOnboarding extends localizeLiteMixin(PolymerElement) {
  static get template() {
    return html`
    <style>
      .error {
        color: red;
      }

      .action {
        margin: 32px 0;
        text-align: center;
      }
    </style>

    <p>
      [[localize('ui.panel.page-onboarding.intro')]]
    </p>

    <p>
      [[localize('ui.panel.page-onboarding.user.intro')]]
    </p>

    <template is='dom-if' if='[[_errorMsg]]'>
      <p class='error'>[[_computeErrorMsg(localize, _errorMsg)]]</p>
    </template>

    <form>
      <paper-input
        autofocus
        label="[[localize('ui.panel.page-onboarding.user.data.name')]]"
        value='{{_name}}'
        required
        auto-validate
        autocapitalize='on'
        error-message="[[localize('ui.panel.page-onboarding.user.required_field')]]"
        on-blur='_maybePopulateUsername'
      ></paper-input>

      <paper-input
        label="[[localize('ui.panel.page-onboarding.user.data.username')]]"
        value='{{_username}}'
        required
        auto-validate
        autocapitalize='none'
        error-message="[[localize('ui.panel.page-onboarding.user.required_field')]]"
      ></paper-input>

      <paper-input
        label="[[localize('ui.panel.page-onboarding.user.data.password')]]"
        value='{{_password}}'
        required
        type='password'
        auto-validate
        error-message="[[localize('ui.panel.page-onboarding.user.required_field')]]"
      ></paper-input>

      <template is='dom-if' if='[[!_loading]]'>
        <p class='action'>
          <paper-button raised on-click='_submitForm'>
            [[localize('ui.panel.page-onboarding.user.create_account')]]
          </paper-button>
        </p>
      </template>
    </div>
  </form>
`;
  }

  static get properties() {
    return {
      _name: String,
      _username: String,
      _password: String,
      _loading: {
        type: Boolean,
        value: false,
      },
      translationFragment: {
        type: String,
        value: "page-onboarding",
      },
      _errorMsg: String,
    };
  }

  async ready() {
    super.ready();
    this.addEventListener("keypress", (ev) => {
      if (ev.keyCode === 13) {
        this._submitForm();
      }
    });

    try {
      const response = await window.stepsPromise;

      if (response.status === 404) {
        // We don't load the component when onboarding is done
        document.location = "/";
        return;
      }

      const steps = await response.json();

      if (steps.every((step) => step.done)) {
        // Onboarding is done!
        document.location = "/";
      }
    } catch (err) {
      alert("Something went wrong loading loading onboarding, try refreshing");
    }
  }

  _maybePopulateUsername() {
    if (this._username) return;

    const parts = this._name.split(" ");

    if (parts.length) {
      this._username = parts[0].toLowerCase();
    }
  }

  async _submitForm() {
    if (!this._name || !this._username || !this._password) {
      this._errorMsg = "required_fields";
      return;
    }

    this._errorMsg = "";

    try {
      const response = await fetch("/api/onboarding/users", {
        method: "POST",
        credentials: "same-origin",
        body: JSON.stringify({
          name: this._name,
          username: this._username,
          password: this._password,
        }),
      });

      if (!response.ok) {
        // eslint-disable-next-line
        throw {
          message: `Bad response from server: ${response.status}`,
        };
      }

      document.location = "/";
    } catch (err) {
      // eslint-disable-next-line
      console.error(err);
      this.setProperties({
        _loading: false,
        _errorMsg: err.message,
      });
    }
  }

  _computeErrorMsg(localize, errorMsg) {
    return (
      localize(`ui.panel.page-onboarding.user.error.${errorMsg}`) || errorMsg
    );
  }
}
customElements.define("ha-onboarding", HaOnboarding);

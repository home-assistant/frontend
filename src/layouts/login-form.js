import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-checkbox/paper-checkbox.js';
import '@polymer/paper-input/paper-input.js';
import '@polymer/paper-spinner/paper-spinner.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import { ERR_CANNOT_CONNECT, ERR_INVALID_AUTH } from 'home-assistant-js-websocket';


import LocalizeMixin from '../mixins/localize-mixin.js';

/*
 * @appliesMixin LocalizeMixin
 */
class LoginForm extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
    <style include="iron-flex iron-positioning"></style>
    <style>
      :host {
        white-space: nowrap;
      }

      paper-input {
        display: block;
        margin-bottom: 16px;
      }

      paper-checkbox {
        margin-right: 8px;
      }

      paper-button {
        margin-left: 72px;
      }

      .interact {
        height: 125px;
      }

      #validatebox {
        margin-top: 16px;
        text-align: center;
      }

      .validatemessage {
        margin-top: 10px;
      }
    </style>

    <div class="layout vertical center center-center fit">
      <img src="/static/icons/favicon-192x192.png" height="192">
      <a href="#" id="hideKeyboardOnFocus"></a>
      <div class="interact">
        <div id="loginform" hidden\$="[[showSpinner]]">
          <paper-input id="passwordInput" label="[[localize('ui.login-form.password')]]" type="password" autofocus="" invalid="[[errorMessage]]" error-message="[[errorMessage]]" value="{{password}}"></paper-input>
          <div class="layout horizontal center">
            <paper-checkbox for="" id="rememberLogin">[[localize('ui.login-form.remember')]]</paper-checkbox>
            <paper-button on-click="validatePassword">[[localize('ui.login-form.log_in')]]</paper-button>
          </div>
        </div>
        <div id="validatebox" hidden\$="[[!showSpinner]]">
          <paper-spinner active="true"></paper-spinner><br>
          <div class="validatemessage">[[computeLoadingMsg(isValidating)]]</div>
        </div>
      </div>
    </div>
`;
  }

  static get properties() {
    return {
      hass: {
        type: Object,
      },

      connectionPromise: {
        type: Object,
        notify: true,
        observer: 'handleConnectionPromiseChanged',
      },

      errorMessage: {
        type: String,
        value: '',
      },

      isValidating: {
        type: Boolean,
        observer: 'isValidatingChanged',
        value: false,
      },

      showLoading: {
        type: Boolean,
        value: false,
      },

      showSpinner: {
        type: Boolean,
        computed: 'computeShowSpinner(showLoading, isValidating)',
      },

      password: {
        type: String,
        value: '',
      },
    };
  }

  ready() {
    super.ready();
    this.addEventListener('keydown', ev => this.passwordKeyDown(ev));
  }

  connectedCallback() {
    super.connectedCallback();
    window.removeInitMsg();
  }

  computeLoadingMsg(isValidating) {
    return isValidating ? 'Connecting' : 'Loading data';
  }

  computeShowSpinner(forceShowLoading, isValidating) {
    return forceShowLoading || isValidating;
  }

  isValidatingChanged(newVal) {
    if (!newVal) {
      setTimeout(() => {
        if (this.$.passwordInput.inputElement.inputElement) {
          this.$.passwordInput.inputElement.inputElement.focus();
        }
      }, 10);
    }
  }

  passwordKeyDown(ev) {
    // validate on enter
    if (ev.keyCode === 13) {
      this.validatePassword();
      ev.preventDefault();
    // clear error after we start typing again
    } else if (this.errorMessage) {
      this.errorMessage = '';
    }
  }

  validatePassword() {
    var auth = this.password;
    this.$.hideKeyboardOnFocus.focus();
    this.connectionPromise = window.createHassConnection(auth);

    if (this.$.rememberLogin.checked) {
      this.connectionPromise.then(function () {
        localStorage.authToken = auth;
      });
    }
  }

  handleConnectionPromiseChanged(newVal) {
    if (!newVal) return;

    var el = this;
    this.isValidating = true;

    this.connectionPromise.then(
      function () {
        el.isValidating = false;
        el.password = '';
      },
      function (errCode) {
        el.isValidating = false;

        if (errCode === ERR_CANNOT_CONNECT) {
          el.errorMessage = 'Unable to connect';
        } else if (errCode === ERR_INVALID_AUTH) {
          el.errorMessage = 'Invalid password';
        } else {
          el.errorMessage = 'Unknown error: ' + errCode;
        }
      }
    );
  }
}

customElements.define('login-form', LoginForm);

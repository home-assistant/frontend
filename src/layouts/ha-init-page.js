import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-checkbox/paper-checkbox.js';
import '@polymer/paper-input/paper-input.js';
import '@polymer/paper-spinner/paper-spinner.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import { ERR_CANNOT_CONNECT, ERR_INVALID_AUTH } from 'home-assistant-js-websocket';


import LocalizeMixin from '../mixins/localize-mixin.js';
import EventsMixin from '../mixins/events-mixin.js';

/*
 * @appliesMixin LocalizeMixin
 */
class LoginForm extends EventsMixin(LocalizeMixin(PolymerElement)) {
  static get template() {
    return html`
    <style include="iron-flex iron-positioning"></style>
    <style>
      paper-spinner {
        margin-bottom: 10px;
      }
    </style>

    <div class="layout vertical center center-center fit">
      <img src="/static/icons/favicon-192x192.png" height="192">
      <paper-spinner active="true"></paper-spinner><br>
      Loading data
    </div>
`;
  }

  ready() {
    super.ready();
    this.addEventListener('keydown', ev => this.passwordKeyDown(ev));
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
    const connProm = window.createHassConnection(auth);
    this.fire('try-connection', { connProm });

    if (this.$.rememberLogin.checked) {
      connProm.then(function () {
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

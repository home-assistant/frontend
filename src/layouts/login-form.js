import Polymer from '../polymer';

import { authGetters } from '../util/home-assistant-js-instance';

import nuclearObserver from '../util/bound-nuclear-behavior';
import validateAuth from '../util/validate-auth';

export default new Polymer({
  is: 'login-form',

  behaviors: [nuclearObserver],

  properties: {
    isValidating: {
      type: Boolean,
      observer: 'isValidatingChanged',
      bindNuclear: authGetters.isValidating,
    },

    isInvalid: {
      type: Boolean,
      bindNuclear: authGetters.isInvalidAttempt,
    },

    errorMessage: {
      type: String,
      bindNuclear: authGetters.attemptErrorMessage,
    },
  },

  listeners: {
    'keydown': 'passwordKeyDown',
    'loginButton.click': 'validatePassword',
  },

  observers: [
    'validatingChanged(isValidating, isInvalid)',
  ],

  validatingChanged(isValidating, isInvalid) {
    if (!isValidating && !isInvalid) {
      this.$.passwordInput.value = '';
    }
  },

  isValidatingChanged(newVal) {
    if (!newVal) {
      this.async(() => this.$.passwordInput.focus(), 10);
    }
  },

  passwordKeyDown(ev) {
    // validate on enter
    if (ev.keyCode === 13) {
      this.validatePassword();
      ev.preventDefault();

    // clear error after we start typing again
    } else if (this.isInvalid) {
      this.isInvalid = false;
    }
  },

  validatePassword() {
    this.$.hideKeyboardOnFocus.focus();

    validateAuth(this.$.passwordInput.value, this.$.rememberLogin.checked);
  },
});

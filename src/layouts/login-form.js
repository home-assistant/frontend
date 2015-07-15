import Polymer from '../polymer';

import { authGetters } from 'home-assistant-js';

import nuclearObserver from '../util/bound-nuclear-behavior';
import validateAuth from '../util/validate-auth';

export default Polymer({
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

  validatingChanged: function(isValidating, isInvalid) {
    if (!isValidating && !isInvalid) {
      this.$.passwordInput.value = '';
    }
  },

  isValidatingChanged: function(newVal) {
    if (!newVal) {
      this.async(() => this.$.passwordInput.focus(), 10);
    }
  },

  passwordKeyDown: function(ev) {
    // validate on enter
    if(ev.keyCode === 13) {
      this.validatePassword();
      ev.preventDefault();

    // clear error after we start typing again
    } else if(this.isInvalid) {
      this.isInvalid = false;
    }
  },

  validatePassword: function() {
    this.$.hideKeyboardOnFocus.focus();

    validateAuth(this.$.passwordInput.value, this.$.rememberLogin.checked);
  },
});

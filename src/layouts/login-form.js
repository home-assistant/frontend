import Polymer from '../polymer';

import { authGetters } from '../util/home-assistant-js-instance';

import nuclearObserver from '../util/bound-nuclear-behavior';
import validateAuth from '../util/validate-auth';

export default new Polymer({
  is: 'login-form',

  behaviors: [nuclearObserver],

  properties: {
    errorMessage: {
      type: String,
      bindNuclear: authGetters.attemptErrorMessage,
    },

    isInvalid: {
      type: Boolean,
      bindNuclear: authGetters.isInvalidAttempt,
    },

    isValidating: {
      type: Boolean,
      observer: 'isValidatingChanged',
      bindNuclear: authGetters.isValidating,
    },

    loadingResources: {
      type: Boolean,
      value: false,
    },

    forceShowLoading: {
      type: Boolean,
      value: false,
    },

    showLoading: {
      type: Boolean,
      computed: 'computeShowSpinner(forceShowLoading, isValidating)',
    },
  },

  listeners: {
    'keydown': 'passwordKeyDown',
    'loginButton.click': 'validatePassword',
  },

  observers: [
    'validatingChanged(isValidating, isInvalid)',
  ],

  computeShowSpinner(forceShowLoading, isValidating) {
    return forceShowLoading || isValidating;
  },

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

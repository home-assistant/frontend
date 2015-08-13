import Polymer from './polymer';

import {
  syncGetters,
  localStoragePreferences,
  startLocalStoragePreferencesSync
} from './util/home-assistant-js-instance';

import nuclearObserver from './util/bound-nuclear-behavior';
import validateAuth from './util/validate-auth';

require('./layouts/login-form');
require('./layouts/home-assistant-main');

export default new Polymer({
  is: 'home-assistant',

  hostAttributes: {
    auth: null,
  },

  behaviors: [nuclearObserver],

  properties: {
    auth: {
      type: String,
    },
    loaded: {
      type: Boolean,
      bindNuclear: syncGetters.isDataLoaded,
    },
  },

  ready() {
    // remove the HTML init message
    const initMsg = document.getElementById('init');
    initMsg.parentElement.removeChild(initMsg);

    // if auth was given, tell the backend
    if (this.auth) {
      validateAuth(this.auth, false);
    } else if (localStoragePreferences.authToken) {
      validateAuth(localStoragePreferences.authToken, true);
    }

    startLocalStoragePreferencesSync();
  },
});

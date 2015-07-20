import Polymer from './polymer';

import {
  syncGetters,
  localStoragePreferences
} from 'home-assistant-js';

import nuclearObserver from './util/bound-nuclear-behavior';
import validateAuth from './util/validate-auth';

require('./layouts/login-form');
require('./layouts/home-assistant-main');

export default Polymer({
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
    var initMsg = document.getElementById('init');
    initMsg.parentElement.removeChild(initMsg);

    // if auth was given, tell the backend
    if(this.auth) {
      validateAuth(this.auth, false);
    } else if (localStoragePreferences.authToken) {
      validateAuth(localStoragePreferences.authToken, true);
    }

    localStoragePreferences.startSync();
  },
});

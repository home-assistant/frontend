import Polymer from './polymer';

import {
  localStoragePreferences,
  navigationActions,
  reactor,
  startLocalStoragePreferencesSync,
  syncGetters,
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
    reactor.batch(() => {
      // if auth was given, tell the backend
      if (this.auth) {
        validateAuth(this.auth, false);
      } else if (localStoragePreferences.authToken) {
        validateAuth(localStoragePreferences.authToken, true);
      }
      navigationActions.showSidebar(localStoragePreferences.showSidebar);
    });

    startLocalStoragePreferencesSync();

    // remove the HTML init message
    const initMsg = document.getElementById('init');
    initMsg.parentElement.removeChild(initMsg);
  },
});

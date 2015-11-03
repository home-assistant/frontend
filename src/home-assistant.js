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
    icons: null,
  },

  behaviors: [nuclearObserver],

  properties: {
    auth: {
      type: String,
    },
    icons: {
      type: String,
    },
    dataLoaded: {
      type: Boolean,
      bindNuclear: syncGetters.isDataLoaded,
    },
    iconsLoaded: {
      type: Boolean,
      value: false,
    },
    loaded: {
      type: Boolean,
      computed: 'computeLoaded(dataLoaded, iconsLoaded)',
    },
  },

  computeLoaded(dataLoaded, iconsLoaded) {
    return dataLoaded && iconsLoaded;
  },

  computeForceShowLoading(dataLoaded, iconsLoaded) {
    return dataLoaded && !iconsLoaded;
  },

  loadIcons() {
    this.importHref(`/static/mdi-${this.icons}.html`,
                    () => this.iconsLoaded = true,
                    () => this.loadIcons());
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

    this.loadIcons();
  },
});

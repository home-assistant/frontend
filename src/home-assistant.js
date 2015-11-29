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
    // If the import fails, we'll try to import again, must be a server glitch
    // Since HTML imports only resolve once, we import another url.
    const success = () => this.iconsLoaded = true;
    this.importHref(`/static/mdi-${this.icons}.html`,
                    success,
                    this.importHref(`/static/mdi.html`, success, success));
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

    this.loadIcons();
  },
});

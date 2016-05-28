import moment from 'moment';
import Polymer from './polymer';

import HomeAssistant from 'home-assistant-js';
import validateAuth from './util/validate-auth';
import hassBehavior from './util/hass-behavior';

window.hassBehavior = hassBehavior;
window.moment = moment;

require('./layouts/login-form');
require('./layouts/home-assistant-main');

// While we figure out how ha-entity-marker can keep it's references
window.hass = new HomeAssistant();

export default new Polymer({
  is: 'home-assistant',

  hostAttributes: {
    auth: null,
    icons: null,
  },

  behaviors: [window.hassBehavior],

  properties: {
    hass: {
      type: Object,
      value: window.hass,
    },
    auth: {
      type: String,
    },
    icons: {
      type: String,
    },
    dataLoaded: {
      type: Boolean,
      bindNuclear: hass => hass.syncGetters.isDataLoaded,
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
    const success = () => { this.iconsLoaded = true; };
    this.importHref(`/static/mdi-${this.icons}.html`,
                    success,
                    () => this.importHref('/static/mdi.html', success, success));
  },

  created() {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    navigator.serviceWorker.register('/service_worker.js').catch(err => {
      if (__DEV__) {
        /* eslint-disable no-console */
        console.warn('Unable to register service worker', err);
        /* eslint-enable no-console */
      }
    });
  },

  ready() {
    const hass = this.hass;
    hass.reactor.batch(() => {
      // if auth was given, tell the backend
      if (this.auth) {
        validateAuth(this.hass, this.auth, false);
      } else if (hass.localStoragePreferences.authToken) {
        validateAuth(this.hass, hass.localStoragePreferences.authToken, true);
      }
      hass.navigationActions.showSidebar(hass.localStoragePreferences.showSidebar);
    });

    hass.startLocalStoragePreferencesSync();

    this.loadIcons();
  },
});

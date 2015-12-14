import hass from '../util/home-assistant-js-instance';

import Polymer from '../polymer';
import nuclearObserver from '../util/bound-nuclear-behavior';

require('./partial-base');

const {
  configGetters,
  errorLogActions,
} = hass;

export default new Polymer({
  is: 'partial-dev-info',

  behaviors: [nuclearObserver],

  properties: {
    narrow: {
      type: Boolean,
      value: false,
    },

    showMenu: {
      type: Boolean,
      value: false,
    },

    hassVersion: {
      type: String,
      bindNuclear: configGetters.serverVersion,
    },

    polymerVersion: {
      type: String,
      value: Polymer.version,
    },

    nuclearVersion: {
      type: String,
      value: '1.2.1',
    },

    errorLog: {
      type: String,
      value: '',
    },
  },

  attached() {
    this.refreshErrorLog();
  },

  refreshErrorLog(ev) {
    if (ev) ev.preventDefault();

    this.errorLog = 'Loading error log…';

    errorLogActions.fetchErrorLog().then(
      log => this.errorLog = log || 'No errors have been reported.');
  },
});

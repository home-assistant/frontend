import Polymer from '../polymer';

require('./partial-base');

export default new Polymer({
  is: 'partial-dev-info',

  behaviors: [window.hassBehavior],

  properties: {
    hass: {
      type: Object,
    },

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
      bindNuclear: hass => hass.configGetters.serverVersion,
    },

    polymerVersion: {
      type: String,
      value: Polymer.version,
    },

    nuclearVersion: {
      type: String,
      value: '1.3.0',
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

    this.hass.errorLogActions.fetchErrorLog().then(
      log => { this.errorLog = log || 'No errors have been reported.'; });
  },
});

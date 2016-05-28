import Polymer from '../polymer';

require('./stream-status');

export default new Polymer({
  is: 'ha-sidebar',

  behaviors: [window.hassBehavior],

  properties: {
    hass: {
      type: Object,
    },

    menuShown: {
      type: Boolean,
    },

    menuSelected: {
      type: String,
    },

    narrow: {
      type: Boolean,
    },

    selected: {
      type: String,
      bindNuclear: hass => hass.navigationGetters.activePane,
    },

    hasHistoryComponent: {
      type: Boolean,
      bindNuclear: hass => hass.configGetters.isComponentLoaded('history'),
    },

    hasLogbookComponent: {
      type: Boolean,
      bindNuclear: hass => hass.configGetters.isComponentLoaded('logbook'),
    },
  },

  menuSelect() {
    this.debounce('updateStyles', () => this.updateStyles(), 1);
  },

  menuClicked(ev) {
    let target = ev.target;
    let checks = 5;

    // find panel to select
    while (checks && !target.getAttribute('data-panel')) {
      target = target.parentElement;
      checks--;
    }

    if (checks) {
      this.selectPanel(target.getAttribute('data-panel'));
    }
  },

  toggleMenu() {
    this.fire('close-menu');
  },

  selectPanel(newChoice) {
    if (newChoice === this.selected) {
      return;
    } else if (newChoice === 'logout') {
      this.handleLogOut();
      return;
    }
    this.hass.navigationActions.navigate.apply(null, newChoice.split('/'));
    this.debounce('updateStyles', () => this.updateStyles(), 1);
  },

  handleLogOut() {
    this.hass.authActions.logOut();
  },
});

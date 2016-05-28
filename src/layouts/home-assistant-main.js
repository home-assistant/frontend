import Polymer from '../polymer';

import removeInitMsg from '../util/remove-init-message';

require('../components/ha-sidebar');
require('../layouts/partial-cards');
require('../layouts/partial-logbook');
require('../layouts/partial-history');
require('../layouts/partial-map');
require('../layouts/partial-dev-call-service');
require('../layouts/partial-dev-fire-event');
require('../layouts/partial-dev-set-state');
require('../layouts/partial-dev-template');
require('../layouts/partial-dev-info');
require('../managers/notification-manager');
require('../dialogs/more-info-dialog');
require('../dialogs/ha-voice-command-dialog');

// const {
//   navigationActions,
//   navigationGetters,
//   startUrlSync,
//   stopUrlSync,
// } = hass;

export default new Polymer({
  is: 'home-assistant-main',

  behaviors: [window.hassBehavior],

  properties: {
    hass: {
      type: Object,
    },

    narrow: {
      type: Boolean,
      value: false,
    },

    activePane: {
      type: String,
      bindNuclear: hass => hass.navigationGetters.activePane,
      observer: 'activePaneChanged',
    },

    isSelectedStates: {
      type: Boolean,
      bindNuclear: hass => hass.navigationGetters.isActivePane('states'),
    },

    isSelectedHistory: {
      type: Boolean,
      bindNuclear: hass => hass.navigationGetters.isActivePane('history'),
    },

    isSelectedMap: {
      type: Boolean,
      bindNuclear: hass => hass.navigationGetters.isActivePane('map'),
    },

    isSelectedLogbook: {
      type: Boolean,
      bindNuclear: hass => hass.navigationGetters.isActivePane('logbook'),
    },

    isSelectedDevEvent: {
      type: Boolean,
      bindNuclear: hass => hass.navigationGetters.isActivePane('devEvent'),
    },

    isSelectedDevState: {
      type: Boolean,
      bindNuclear: hass => hass.navigationGetters.isActivePane('devState'),
    },

    isSelectedDevTemplate: {
      type: Boolean,
      bindNuclear: hass => hass.navigationGetters.isActivePane('devTemplate'),
    },

    isSelectedDevService: {
      type: Boolean,
      bindNuclear: hass => hass.navigationGetters.isActivePane('devService'),
    },

    isSelectedDevInfo: {
      type: Boolean,
      bindNuclear: hass => hass.navigationGetters.isActivePane('devInfo'),
    },

    showSidebar: {
      type: Boolean,
      bindNuclear: hass => hass.navigationGetters.showSidebar,
    },
  },

  listeners: {
    'open-menu': 'openMenu',
    'close-menu': 'closeMenu',
  },

  openMenu() {
    if (this.narrow) {
      this.$.drawer.openDrawer();
    } else {
      this.hass.navigationActions.showSidebar(true);
    }
  },

  closeMenu() {
    this.$.drawer.closeDrawer();
    if (this.showSidebar) {
      this.hass.navigationActions.showSidebar(false);
    }
  },

  activePaneChanged() {
    if (this.narrow) {
      this.$.drawer.closeDrawer();
    }
  },

  attached() {
    removeInitMsg();
    this.hass.startUrlSync();
  },

  computeForceNarrow(narrow, showSidebar) {
    return narrow || !showSidebar;
  },

  detached() {
    this.hass.stopUrlSync();
  },
});

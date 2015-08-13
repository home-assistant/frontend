import {
  navigationGetters,
  startUrlSync,
  stopUrlSync,
} from 'home-assistant-js';

import nuclearObserver from '../util/bound-nuclear-behavior';

require('../components/ha-sidebar');
require('../layouts/partial-states');
require('../layouts/partial-logbook');
require('../layouts/partial-history');
require('../layouts/partial-dev-call-service');
require('../layouts/partial-dev-fire-event');
require('../layouts/partial-dev-set-state');
require('../managers/notification-manager');
require('../dialogs/more-info-dialog');

export default new Polymer({
  is: 'home-assistant-main',

  behaviors: [nuclearObserver],

  properties: {
    narrow: {
      type: Boolean,
    },

    activePage: {
      type: String,
      bindNuclear: navigationGetters.activePage,
      observer: 'activePageChanged',
    },

    isSelectedStates: {
      type: Boolean,
      bindNuclear: navigationGetters.isActivePane('states'),
    },

    isSelectedHistory: {
      type: Boolean,
      bindNuclear: navigationGetters.isActivePane('history'),
    },

    isSelectedLogbook: {
      type: Boolean,
      bindNuclear: navigationGetters.isActivePane('logbook'),
    },

    isSelectedDevEvent: {
      type: Boolean,
      bindNuclear: navigationGetters.isActivePane('devEvent'),
    },

    isSelectedDevState: {
      type: Boolean,
      bindNuclear: navigationGetters.isActivePane('devState'),
    },

    isSelectedDevService: {
      type: Boolean,
      bindNuclear: navigationGetters.isActivePane('devService'),
    },
  },

  listeners: {
    'open-menu': 'openDrawer',
  },

  openDrawer() {
    this.$.drawer.openDrawer();
  },

  activePageChanged() {
    this.$.drawer.closeDrawer();
  },

  attached() {
    startUrlSync();
  },

  detached() {
    stopUrlSync();
  },
});

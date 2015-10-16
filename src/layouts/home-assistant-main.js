import Polymer from '../polymer';
import {
  navigationActions,
  navigationGetters,
  startUrlSync,
  stopUrlSync,
} from '../util/home-assistant-js-instance';

import nuclearObserver from '../util/bound-nuclear-behavior';

require('../components/ha-sidebar');
require('../layouts/partial-zone');
require('../layouts/partial-logbook');
require('../layouts/partial-history');
require('../layouts/partial-map');
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
      value: false,
    },

    activePane: {
      type: String,
      bindNuclear: navigationGetters.activePane,
      observer: 'activePaneChanged',
    },

    isSelectedStates: {
      type: Boolean,
      bindNuclear: navigationGetters.isActivePane('states'),
    },

    isSelectedHistory: {
      type: Boolean,
      bindNuclear: navigationGetters.isActivePane('history'),
    },

    isSelectedMap: {
      type: Boolean,
      bindNuclear: navigationGetters.isActivePane('map'),
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

    showSidebar: {
      type: Boolean,
      bindNuclear: navigationGetters.showSidebar,
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
      navigationActions.showSidebar(true);
    }
  },

  closeMenu() {
    this.$.drawer.closeDrawer();
    if (this.showSidebar) {
      navigationActions.showSidebar(false);
    }
  },

  activePaneChanged() {
    if (this.narrow) {
      this.$.drawer.closeDrawer();
    }
  },

  attached() {
    startUrlSync();
  },

  computeForceNarrow(narrow, showSidebar) {
    return narrow || !showSidebar;
  },

  detached() {
    stopUrlSync();
  },
});

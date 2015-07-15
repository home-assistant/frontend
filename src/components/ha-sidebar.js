import {
  configGetters,
  navigationGetters,
  authActions,
  navigationActions,
  util
} from 'home-assistant-js';

import Polymer from '../polymer';
import nuclearObserver from '../util/bound-nuclear-behavior';
import domainIcon from '../util/domain-icon';

require('./stream-status');

const { entityDomainFilters } = util;

Polymer({
  is: 'ha-sidebar',

  behaviors: [nuclearObserver],

  properties: {
    menuSelected: {
      type: String,
      // observer: 'menuSelectedChanged',
    },

    selected: {
      type: String,
      bindNuclear: navigationGetters.activePage,
      observer: 'selectedChanged',
    },

    possibleFilters: {
      type: Array,
      value: [],
      bindNuclear: [
        navigationGetters.possibleEntityDomainFilters,
        (domains) => domains.toArray()
      ],
    },

    hasHistoryComponent: {
      type: Boolean,
      bindNuclear: configGetters.isComponentLoaded('history'),
    },

    hasLogbookComponent: {
      type: Boolean,
      bindNuclear: configGetters.isComponentLoaded('logbook'),
    },
  },

  // menuSelectedChanged: function(newVal) {
  //   if (this.selected !== newVal) {
  //     this.selectPanel(newVal);
  //   }
  // },

  selectedChanged(newVal) {
    // if (this.menuSelected !== newVal) {
    //   this.menuSelected = newVal;
    // }
    var menuItems = this.querySelectorAll('.menu [data-panel]');

    for (var i = 0; i < menuItems.length; i++) {
      if(menuItems[i].dataset.panel === newVal) {
        menuItems[i].classList.add('selected');
      } else {
        menuItems[i].classList.remove('selected');
      }
    }
  },

  menuClicked(ev) {
    var target = ev.target;
    var checks = 5;

    // find panel to select
    while(checks && !target.dataset.panel) {
      target = target.parentElement;
      checks--;
    }

    if (checks) {
      this.selectPanel(target.dataset.panel);
    }
  },

  handleDevClick(ev) {
    // prevent it from highlighting first menu item
    document.activeElement.blur();
    this.menuClicked(ev);
  },

  selectPanel(newChoice) {
    if(newChoice === this.selected) {
      return;
    } else if (newChoice == 'logout') {
      this.handleLogOut();
      return;
    }
    navigationActions.navigate.apply(null, newChoice.split('/'));
  },

  handleLogOut() {
    authActions.logOut();
  },

  filterIcon(filter) {
    return domainIcon(filter);
  },

  filterName(filter) {
    return entityDomainFilters[filter];
  },

  filterType(filter) {
    return 'states/' + filter;
  },
});

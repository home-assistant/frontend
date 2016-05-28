import hass from '../util/home-assistant-js-instance';

import Polymer from '../polymer';
import nuclearObserver from '../util/bound-nuclear-behavior';

require('./partial-base');
require('../components/ha-cards');
require('../components/ha-view-tabs');

const {
  configGetters,
  viewGetters,
  voiceGetters,
  streamGetters,
  syncGetters,
  syncActions,
  voiceActions,
} = hass;

export default new Polymer({
  is: 'partial-cards',

  behaviors: [nuclearObserver],

  properties: {
    narrow: {
      type: Boolean,
      value: false,
    },

    isFetching: {
      type: Boolean,
      bindNuclear: syncGetters.isFetching,
    },

    isStreaming: {
      type: Boolean,
      bindNuclear: streamGetters.isStreamingEvents,
    },

    canListen: {
      type: Boolean,
      bindNuclear: [
        voiceGetters.isVoiceSupported,
        configGetters.isComponentLoaded('conversation'),
        (isVoiceSupported, componentLoaded) => isVoiceSupported && componentLoaded,
      ],
    },

    introductionLoaded: {
      type: Boolean,
      bindNuclear: configGetters.isComponentLoaded('introduction'),
    },

    locationName: {
      type: String,
      bindNuclear: configGetters.locationName,
    },

    showMenu: {
      type: Boolean,
      value: false,
      observer: 'windowChange',
    },

    currentView: {
      type: String,
      bindNuclear: [
        viewGetters.currentView,
        view => view || '',
      ],
    },

    hasViews: {
      type: Boolean,
      bindNuclear: [
        viewGetters.views,
        views => views.size > 0,
      ],
    },

    states: {
      type: Object,
      bindNuclear: viewGetters.currentViewEntities,
    },

    columns: {
      type: Number,
      value: 1,
    },
  },

  created() {
    this.windowChange = this.windowChange.bind(this);
    const sizes = [];
    for (let col = 0; col < 5; col++) {
      sizes.push(300 + col * 300);
    }
    this.mqls = sizes.map(width => {
      const mql = window.matchMedia(`(min-width: ${width}px)`);
      mql.addListener(this.windowChange);
      return mql;
    });
  },

  detached() {
    this.mqls.forEach(mql => mql.removeListener(this.windowChange));
  },

  windowChange() {
    const matchColumns = this.mqls.reduce((cols, mql) => cols + mql.matches, 0);
    // Do -1 column if the menu is docked and open
    this.columns = Math.max(1, matchColumns - (!this.narrow && this.showMenu));
  },

  scrollToTop() {
    const scrollEl = this.$.panel.scroller;
    const begin = scrollEl.scrollTop;

    if (!begin) return;

    const duration = Math.round(begin / 5);
    let start = null;

    function scroll(timestamp) {
      if (!start) start = timestamp;
      const progress = timestamp - start;

      scrollEl.scrollTop = begin - (progress / duration * begin);

      if (progress < duration) {
        requestAnimationFrame(scroll);
      }
    }
    requestAnimationFrame(scroll);
  },

  handleRefresh() {
    syncActions.fetchAll();
  },

  handleListenClick() {
    voiceActions.listen();
  },

  headerScrollAdjust(ev) {
    if (!this.hasViews) return;
    Polymer.Base.transform(`translateY(-${ev.detail.y}px)`, this.$.menu);
  },

  computeHeaderHeight(hasViews) {
    return hasViews ? 128 : 64;
  },

  computeCondensedHeaderHeight(hasViews) {
    return hasViews ? 48 : 64;
  },

  computeMenuButtonClass(narrow, showMenu) {
    return !narrow && showMenu ? 'menu-icon invisible' : 'menu-icon';
  },

  computeRefreshButtonClass(isFetching) {
    return isFetching ? 'ha-spin' : '';
  },

  computeTitle(hasViews, locationName) {
    return hasViews ? 'Home Assistant' : locationName;
  },

  computeShowIntroduction(currentView, introductionLoaded, states) {
    return currentView === '' && (introductionLoaded || states.size === 0);
  },

  computeHasViews(views) {
    return views.length > 0;
  },

  toggleMenu() {
    this.fire('open-menu');
  },
});

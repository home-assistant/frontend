import Polymer from '../polymer';

import './partial-base';
import '../components/ha-cards';

export default new Polymer({
  is: 'partial-cards',

  behaviors: [window.hassBehavior],

  properties: {
    hass: {
      type: Object,
    },

    narrow: {
      type: Boolean,
      value: false,
    },

    isFetching: {
      type: Boolean,
      bindNuclear: hass => hass.syncGetters.isFetching,
    },

    isStreaming: {
      type: Boolean,
      bindNuclear: hass => hass.streamGetters.isStreamingEvents,
    },

    canListen: {
      type: Boolean,
      bindNuclear: hass => [
        hass.voiceGetters.isVoiceSupported,
        hass.configGetters.isComponentLoaded('conversation'),
        (isVoiceSupported, componentLoaded) => isVoiceSupported && componentLoaded,
      ],
    },

    introductionLoaded: {
      type: Boolean,
      bindNuclear: hass => hass.configGetters.isComponentLoaded('introduction'),
    },

    locationName: {
      type: String,
      bindNuclear: hass => hass.configGetters.locationName,
    },

    showMenu: {
      type: Boolean,
      value: false,
      observer: 'windowChange',
    },

    currentView: {
      type: String,
      bindNuclear: hass => [
        hass.viewGetters.currentView,
        view => view || '',
      ],
    },

    hasViews: {
      type: Boolean,
      bindNuclear: hass => [
        hass.viewGetters.views,
        views => views.size > 0,
      ],
    },

    states: {
      type: Object,
      bindNuclear: hass => hass.viewGetters.currentViewEntities,
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
    this.$.panel.scrollToTop(true);
  },

  handleRefresh() {
    this.hass.syncActions.fetchAll();
  },

  handleListenClick() {
    this.hass.voiceActions.listen();
  },

  contentScroll() {
    if (this.debouncedContentScroll) return;

    this.debouncedContentScroll = this.async(() => {
      this.checkRaised();
      this.debouncedContentScroll = false;
    }, 100);
  },

  checkRaised() {
    this.toggleClass(
      'raised',
      this.$.panel.scroller.scrollTop > (this.hasViews ? 56 : 0),
      this.$.panel);
  },

  headerScrollAdjust(ev) {
    if (!this.hasViews) return;
    this.translate3d('0', `-${ev.detail.y}px`, '0', this.$.menu);
    // this.toggleClass('condensed', ev.detail.y === 56, this.$.panel);
  },

  computeHeaderHeight(hasViews, narrow) {
    if (hasViews) {
      return 104;
    } else if (narrow) {
      return 56;
    }
    return 64;
  },

  computeCondensedHeaderHeight(hasViews, narrow) {
    if (hasViews) {
      return 48;
    } else if (narrow) {
      return 56;
    }
    return 64;
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

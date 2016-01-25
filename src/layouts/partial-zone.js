import hass from '../util/home-assistant-js-instance';

import Polymer from '../polymer';
import nuclearObserver from '../util/bound-nuclear-behavior';

require('./partial-base');
require('../components/ha-zone-cards');

const {
  configGetters,
  viewActions,
  viewGetters,
  voiceGetters,
  streamGetters,
  syncGetters,
  syncActions,
  voiceActions,
} = hass;

export default new Polymer({
  is: 'partial-zone',

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

    views: {
      type: Array,
      bindNuclear: [
        viewGetters.views,
        views => views.valueSeq()
                    .sortBy(view => view.attributes.order)
                    .toArray(),
      ],
    },

    hasViews: {
      type: Boolean,
      computed: 'computeHasViews(views)',
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
    this.columns = Math.max(1, matchColumns - this.showMenu);
  },

  handleRefresh() {
    syncActions.fetchAll();
  },

  handleListenClick() {
    voiceActions.listen();
  },

  computeMenuButtonClass(narrow, showMenu) {
    return !narrow && showMenu ? 'invisible' : '';
  },

  computeRefreshButtonClass(isFetching) {
    if (isFetching) {
      return 'ha-spin';
    }
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

  viewSelected(ev) {
    const section = ev.detail.item.getAttribute('data-entity') || null;
    this.async(() => viewActions.selectView(section), 0);
  },
});

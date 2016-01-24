import hass from '../util/home-assistant-js-instance';

import Polymer from '../polymer';
import nuclearObserver from '../util/bound-nuclear-behavior';

require('./partial-base');
require('../components/ha-zone-cards');

const {
  configGetters,
  sectionActions,
  sectionGetters,
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

    currentSection: {
      type: String,
      bindNuclear: [
        sectionGetters.currentSection,
        section => section || '',
      ],
    },

    sections: {
      type: Array,
      bindNuclear: [
        sectionGetters.sections,
        sections => sections.valueSeq()
                    .sortBy(section => section.attributes.order)
                    .toArray(),
      ],
    },

    hasSections: {
      type: Boolean,
      computed: 'computeHasSections(sections)',
    },

    states: {
      type: Object,
      bindNuclear: sectionGetters.currentSectionEntities,
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

  computeShowIntroduction(currentSection, introductionLoaded, states) {
    return currentSection === '' && (introductionLoaded || states.size === 0);
  },

  computeHasSections(sections) {
    return sections.length > 0;
  },

  toggleMenu() {
    this.fire('open-menu');
  },

  sectionSelected(ev) {
    const section = ev.detail.item.getAttribute('data-entity') || null;
    this.async(() => sectionActions.selectSection(section), 0);
  },
});

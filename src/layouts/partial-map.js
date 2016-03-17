import hass from '../util/home-assistant-js-instance';

import Polymer from '../polymer';
import nuclearObserver from '../util/bound-nuclear-behavior';

require('../components/entity/ha-entity-marker');

const {
  configGetters,
  entityGetters,
} = hass;

window.L.Icon.Default.imagePath = '/static/images/leaflet';

export default new Polymer({
  is: 'partial-map',

  behaviors: [nuclearObserver],

  properties: {
    locationGPS: {
      type: Number,
      bindNuclear: configGetters.locationGPS,
    },

    locationName: {
      type: String,
      bindNuclear: configGetters.locationName,
    },

    locationEntities: {
      type: Array,
      bindNuclear: [
        entityGetters.visibleEntityMap,
        entities => entities.valueSeq().filter(
          entity => entity.attributes.latitude && entity.state !== 'home'
        ).toArray(),
      ],
    },

    zoneEntities: {
      type: Array,
      bindNuclear: [
        entityGetters.entityMap,
        entities => entities.valueSeq()
          .filter(entity => entity.domain === 'zone' &&
                            !entity.attributes.passive)
          .toArray(),
      ],
    },

    narrow: {
      type: Boolean,
    },

    showMenu: {
      type: Boolean,
      value: false,
    },
  },

  attached() {
    // On Safari, iPhone 5, 5s and some 6 I have observed that the user would be
    // unable to pan on initial load. This fixes it.
    if (window.L.Browser.mobileWebkit || window.L.Browser.webkit) {
      this.async(() => {
        const map = this.$.map;
        const prev = map.style.display;
        map.style.display = 'none';
        this.async(() => { map.style.display = prev; }, 1);
      }, 1);
    }
  },

  computeMenuButtonClass(narrow, showMenu) {
    return !narrow && showMenu ? 'invisible' : '';
  },

  toggleMenu() {
    this.fire('open-menu');
  },
});

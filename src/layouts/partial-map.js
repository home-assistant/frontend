import {
  configGetters,
  entityGetters,
} from '../util/home-assistant-js-instance';

import Polymer from '../polymer';
import nuclearObserver from '../util/bound-nuclear-behavior';

require('../components/entity/ha-entity-marker');

L.Icon.Default.imagePath = '/static/images/leaflet';

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

    narrow: {
      type: Boolean,
    },

    showMenu: {
      type: Boolean,
      value: false,
    },

  },

  attached() {
    window.el = this;
  },

  computeMenuButtonClass(narrow, showMenu) {
    return !narrow && showMenu ? 'invisible' : '';
  },

  toggleMenu() {
    this.fire('open-menu');
  },
});

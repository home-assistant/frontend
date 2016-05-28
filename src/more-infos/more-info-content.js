import Polymer from '../polymer';

import dynamicContentUpdater from '../util/dynamic-content-updater';
import stateMoreInfoType from '../util/state-more-info-type';

require('./more-info-default');
require('./more-info-group');
require('./more-info-sun');
require('./more-info-configurator');
require('./more-info-thermostat');
require('./more-info-script');
require('./more-info-light');
require('./more-info-media_player');
require('./more-info-camera');
require('./more-info-updater');
require('./more-info-alarm_control_panel');
require('./more-info-lock');
require('./more-info-hvac');

export default new Polymer({
  is: 'more-info-content',

  properties: {
    hass: {
      type: Object,
    },

    stateObj: {
      type: Object,
      observer: 'stateObjChanged',
    },
  },

  stateObjChanged(stateObj) {
    if (!stateObj) return;

    dynamicContentUpdater(
      this, `MORE-INFO-${stateMoreInfoType(stateObj).toUpperCase()}`,
      { hass: this.hass, stateObj });
  },
});

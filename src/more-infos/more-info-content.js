import Polymer from '../polymer';

import dynamicContentUpdater from '../util/dynamic-content-updater';
import stateMoreInfoType from '../util/state-more-info-type';

import './more-info-default';
import './more-info-group';
import './more-info-sun';
import './more-info-configurator';
import './more-info-thermostat';
import './more-info-script';
import './more-info-light';
import './more-info-media_player';
import './more-info-updater';
import './more-info-alarm_control_panel';
import './more-info-lock';
import './more-info-hvac';

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

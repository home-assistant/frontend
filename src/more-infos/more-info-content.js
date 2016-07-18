import Polymer from '../polymer';

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

    window.hassUtil.dynamicContentUpdater(
      this, `MORE-INFO-${window.hassUtil.stateMoreInfoType(stateObj).toUpperCase()}`,
      { hass: this.hass, stateObj });
  },
});

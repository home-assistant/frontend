import Polymer from '../polymer';
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

export default new Polymer({
  is: 'more-info-content',

  properties: {
    stateObj: {
      type: Object,
      observer: 'stateObjChanged',
    },

    dialogOpen: {
      type: Boolean,
      value: false,
      observer: 'dialogOpenChanged',
    },
  },

  dialogOpenChanged(newVal) {
    const root = Polymer.dom(this);

    if (root.lastChild) {
      root.lastChild.dialogOpen = newVal;
    }
  },

  stateObjChanged(newVal, oldVal) {
    const root = Polymer.dom(this);

    if (!newVal) {
      if (root.lastChild) {
        root.removeChild(root.lastChild);
      }
      return;
    }

    const newMoreInfoType = stateMoreInfoType(newVal);

    if (!oldVal || stateMoreInfoType(oldVal) !== newMoreInfoType) {
      if (root.lastChild) {
        root.removeChild(root.lastChild);
      }

      const moreInfo = document.createElement(`more-info-${newMoreInfoType}`);
      moreInfo.stateObj = newVal;
      moreInfo.dialogOpen = this.dialogOpen;
      root.appendChild(moreInfo);
    } else {
      root.lastChild.dialogOpen = this.dialogOpen;
      root.lastChild.stateObj = newVal;
    }
  },
});

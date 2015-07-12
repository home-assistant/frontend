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

export default Polymer({
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

  dialogOpenChanged(newVal, oldVal) {
    var root = Polymer.dom(this);

    if (root.lastChild) {
      root.lastChild.dialogOpen = newVal;
    }
  },

  stateObjChanged(newVal, oldVal) {
    var root = Polymer.dom(this);

    if (!newVal) {
      if (root.lastChild) {
        root.removeChild(root.lastChild);
      }
      return;
    }

    var newMoreInfoType = stateMoreInfoType(newVal);

    if (!oldVal || stateMoreInfoType(oldVal) != newMoreInfoType) {

      if (root.lastChild) {
        root.removeChild(root.lastChild);
      }

      var moreInfo = document.createElement('more-info-' + newMoreInfoType);
      moreInfo.stateObj = newVal;
      moreInfo.dialogOpen = this.dialogOpen;
      root.appendChild(moreInfo);

    } else {

      root.lastChild.dialogOpen = this.dialogOpen;
      root.lastChild.stateObj = newVal;

    }
  },
});

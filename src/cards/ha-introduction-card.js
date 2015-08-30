import Polymer from '../polymer';

require('../components/ha-card');

export default new Polymer({
  is: 'ha-introduction-card',

  properties: {
    showInstallInstruction: {
      type: Boolean,
      value: __DEMO__,
    },
    showHideInstruction: {
      type: Boolean,
      value: true,
    },
  },
});

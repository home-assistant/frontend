import Polymer from '../polymer';

require('../components/ha-card');

export default new Polymer({
  is: 'ha-introduction-card',

  properties: {
    showHideInstruction: {
      type: Boolean,
      value: true,
    },
  },
});

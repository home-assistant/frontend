import Polymer from '../polymer';

require('./entity/state-badge');
require('./relative-ha-datetime');

export default new Polymer({
  is: 'state-info',

  properties: {
    stateObj: {
      type: Object,
    },
  },
});

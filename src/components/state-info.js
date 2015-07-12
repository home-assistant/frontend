import Polymer from '../polymer';

require('./state-badge');
require('./relative-ha-datetime');

export default Polymer({
  is: 'state-info',

  properties: {
    stateObj: {
      type: Object,
    },
  },
});

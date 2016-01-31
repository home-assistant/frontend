import Polymer from '../polymer';

require('../components/state-info');

export default new Polymer({
  is: 'state-card-weblink',

  properties: {
    stateObj: {
      type: Object,
    },
  },

  listeners: {
    tap: 'onTap',
  },

  onTap(ev) {
    ev.stopPropagation();
    window.open(this.stateObj.state, '_blank');
  },
});

import Polymer from '../polymer';

import '../components/state-info';

export default new Polymer({
  is: 'state-card-weblink',

  properties: {
    inDialog: {
      type: Boolean,
      value: false,
    },

    stateObj: {
      type: Object,
    },
  },

  listeners: {
    tap: 'onTap',
  },

  onTap(ev) {
    ev.stopPropagation();
    if (ev.target === this.$.link) {
      // Only open window if we clicked on card but not the link
      return;
    }
    window.open(this.stateObj.state, '_blank');
  },
});

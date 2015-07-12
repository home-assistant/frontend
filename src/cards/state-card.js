import { moreInfoActions } from 'home-assistant-js';

import Polymer from '../polymer';

require('./state-card-content');

export default Polymer({
  is: 'state-card',

  properties: {
    stateObj: {
      type: Object,
    },
  },

  listeners: {
    'tap': 'cardTapped',
  },

  cardTapped(ev) {
    ev.stopPropagation();
    this.async(moreInfoActions.selectEntity.bind(
      this, this.stateObj.entityId), 100);
  },
});

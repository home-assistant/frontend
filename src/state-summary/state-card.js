import hass from '../util/home-assistant-js-instance';

import Polymer from '../polymer';

require('./state-card-content');

const { moreInfoActions } = hass;

export default new Polymer({
  is: 'state-card',

  properties: {
    stateObj: {
      type: Object,
    },
  },

  listeners: {
    tap: 'cardTapped',
  },

  cardTapped(ev) {
    ev.stopPropagation();
    this.async(() => moreInfoActions.selectEntity(this.stateObj.entityId), 1);
  },
});

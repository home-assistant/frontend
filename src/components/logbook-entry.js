import Polymer from '../polymer';

import './domain-icon';
import './display-time';

export default new Polymer({
  is: 'logbook-entry',

  properties: {
    hass: {
      type: Object,
    },
  },

  entityClicked(ev) {
    ev.preventDefault();
    this.hass.moreInfoActions.selectEntity(this.entryObj.entityId);
  },
});

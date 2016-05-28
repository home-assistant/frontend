import Polymer from '../polymer';

require('./domain-icon');
require('./display-time');

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

import Polymer from '../polymer';
import { moreInfoActions } from '../util/home-assistant-js-instance';

require('../components/ha-card');
require('../state-summary/state-card-content');

export default new Polymer({
  is: 'ha-domain-card',

  properties: {
    domain: {
      type: String,
    },
    states: {
      type: Array,
    },
  },

  computeDomainTitle(domain) {
    return domain.replace(/_/g, ' ');
  },

  entityTapped(ev) {
    ev.stopPropagation();
    const entityId = ev.currentTarget.stateObj.entityId;
    this.async(() => moreInfoActions.selectEntity(entityId), 1);
  },
});

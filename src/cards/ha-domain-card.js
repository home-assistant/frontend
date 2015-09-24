import Polymer from '../polymer';
import { moreInfoActions } from '../util/home-assistant-js-instance';

require('../components/ha-card');
require('../components/entity/ha-entity-toggle');
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
    groupEntity: {
      type: Object,
    },
  },

  computeDomainTitle(domain) {
    return domain.replace(/_/g, ' ');
  },

  entityTapped(ev) {
    if (ev.target.classList.contains('paper-toggle-button')) {
      return;
    }
    ev.stopPropagation();
    const entityId = ev.model.item.entityId;
    this.async(() => moreInfoActions.selectEntity(entityId), 1);
  },
});

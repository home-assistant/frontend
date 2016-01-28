import Polymer from '../polymer';
import hass from '../util/home-assistant-js-instance';
import canToggle from '../util/can-toggle';

require('../components/ha-card');
require('../components/entity/ha-entity-toggle');
require('../state-summary/state-card-content');

const { moreInfoActions } = hass;

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
    if (ev.target.classList.contains('paper-toggle-button') ||
        ev.target.classList.contains('paper-icon-button') ||

        // state-card-select
        ev.target.classList.contains('paper-dropdown-menu') ||
        ev.target.classList.contains('paper-input') ||
        ev.target.classList.contains('iron-selected')) {
      return;
    }
    ev.stopPropagation();
    const entityId = ev.model.item.entityId;
    this.async(() => moreInfoActions.selectEntity(entityId), 1);
  },

  showGroupToggle(groupEntity, states) {
    if (!groupEntity || !states || groupEntity.state !== 'on' && groupEntity.state !== 'off') {
      return false;
    }

    // only show if we can toggle 2+ entities in group
    return states.reduce((sum, state) => sum + canToggle(state.entityId), 0) > 1;
  },
});

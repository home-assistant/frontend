import Polymer from '../polymer';
import canToggle from '../util/can-toggle';

import '../components/entity/ha-entity-toggle';
import '../state-summary/state-card-content';

export default new Polymer({
  is: 'ha-entities-card',

  properties: {
    hass: {
      type: Object,
    },

    states: {
      type: Array,
    },
    groupEntity: {
      type: Object,
    },
  },

  computeTitle(states, groupEntity) {
    return groupEntity ? groupEntity.entityDisplay :
                         states[0].domain.replace(/_/g, ' ');
  },
  computeTitleClass(groupEntity) {
    let classes = 'header horizontal layout center ';
    if (groupEntity) {
      classes += 'header-more-info';
    }
    return classes;
  },
  entityTapped(ev) {
    if (ev.target.classList.contains('paper-toggle-button') ||
        ev.target.classList.contains('paper-icon-button') ||
        (!ev.model && !this.groupEntity)) {
      return;
    }
    ev.stopPropagation();

    let entityId;
    if (ev.model) {
      entityId = ev.model.item.entityId;
    } else {
      entityId = this.groupEntity.entityId;
    }
    this.async(() => this.hass.moreInfoActions.selectEntity(entityId), 1);
  },

  showGroupToggle(groupEntity, states) {
    if (!groupEntity || !states || groupEntity.state !== 'on' && groupEntity.state !== 'off') {
      return false;
    }

    // only show if we can toggle 2+ entities in group
    return states.reduce((sum, state) => sum + canToggle(this.hass, state.entityId), 0) > 1;
  },
});

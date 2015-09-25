import Polymer from '../../polymer';
import {
  reactor,
  entityGetters,
  moreInfoActions,
} from '../../util/home-assistant-js-instance';
import domainIcon from '../../util/domain-icon';

require('../../components/ha-label-badge');

export default new Polymer({
  is: 'ha-entity-marker',

  properties: {
    entityId: {
      type: String,
      value: '',
    },

    state: {
      type: Object,
      computed: 'computeState(entityId)',
    },

    icon: {
      type: Object,
      computed: 'computeIcon(state)',
    },

    image: {
      type: Object,
      computed: 'computeImage(state)',
    },

    value: {
      type: String,
      computed: 'computeValue(state)',
    },
  },

  listeners: {
    'click': 'badgeTap',
  },

  badgeTap(ev) {
    ev.stopPropagation();
    if (this.entityId) {
      this.async(() => moreInfoActions.selectEntity(this.entityId), 1);
    }
  },

  computeState(entityId) {
    return entityId && reactor.evaluate(entityGetters.byId(entityId));
  },

  computeIcon(state) {
    return !state && 'home';
  },

  computeImage(state) {
    return state && state.attributes.entity_picture;
  },

  computeValue(state) {
    return state &&
      state.entityDisplay.split(' ').map(part => part.substr(0, 1)).join('');
  },
});

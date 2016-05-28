import Polymer from '../../polymer';

require('../../components/ha-label-badge');

export default new Polymer({
  is: 'ha-entity-marker',

  properties: {
    hass: {
      type: Object,
    },

    entityId: {
      type: String,
      value: '',
      reflectToAttribute: true,
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
    tap: 'badgeTap',
  },

  badgeTap(ev) {
    ev.stopPropagation();
    if (this.entityId) {
      this.async(() => window.hass.moreInfoActions.selectEntity(this.entityId), 1);
    }
  },

  computeState(entityId) {
    return entityId && window.hass.reactor.evaluate(window.hass.entityGetters.byId(entityId));
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

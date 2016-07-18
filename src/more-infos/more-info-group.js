import Polymer from '../polymer';

export default new Polymer({
  is: 'more-info-group',

  behaviors: [window.hassBehavior],

  properties: {
    hass: {
      type: Object,
    },

    stateObj: {
      type: Object,
    },

    states: {
      type: Array,
      bindNuclear: hass => [
        hass.moreInfoGetters.currentEntity,
        hass.entityGetters.entityMap,
        (currentEntity, entities) => {
          // weird bug??
          if (!currentEntity) {
            return [];
          }
          return currentEntity.attributes.entity_id.map(
            entities.get.bind(entities));
        },
      ],
    },
  },

  observers: [
    'statesChanged(stateObj, states)',
  ],

  statesChanged(stateObj, states) {
    let groupDomainStateObj = false;

    if (states && states.length > 0) {
      const baseStateObj = states[0];

      groupDomainStateObj = baseStateObj.set('entityId', stateObj.entityId).set(
          'attributes', Object.assign({}, baseStateObj.attributes));

      for (let i = 0; i < states.length; i++) {
        const s = states[i];
        if (s && s.domain) {
          if (groupDomainStateObj.domain !== s.domain) {
            groupDomainStateObj = false;
          }
        }
      }
    }

    if (!groupDomainStateObj) {
      const el = Polymer.dom(this.$.groupedControlDetails);
      if (el.lastChild) {
        el.removeChild(el.lastChild);
      }
    } else {
      window.hassUtil.dynamicContentUpdater(
        this.$.groupedControlDetails,
          `MORE-INFO-${window.hassUtil.stateMoreInfoType(groupDomainStateObj).toUpperCase()}`,
          { stateObj: groupDomainStateObj });
    }
  },
});

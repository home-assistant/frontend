import hass from '../util/home-assistant-js-instance';

import maxBy from 'lodash/maxBy';
import Polymer from '../polymer';
import nuclearObserver from '../util/bound-nuclear-behavior';
import dynamicContentUpdater from '../util/dynamic-content-updater';
import stateMoreInfoType from '../util/state-more-info-type';

require('../state-summary/state-card-content');


const {
  entityGetters,
  moreInfoGetters,
} = hass;

export default new Polymer({
  is: 'more-info-group',

  behaviors: [nuclearObserver],

  properties: {
    stateObj: {
      type: Object,
    },

    states: {
      type: Array,
      bindNuclear: [
        moreInfoGetters.currentEntity,
        entityGetters.entityMap,
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
      const baseStateObj = maxBy(states, (s) => Object.keys(s.attributes).length);
      groupDomainStateObj = {
        attributes: Object.assign({}, baseStateObj.attributes),
        domain: baseStateObj.domain,
        entityDisplay: stateObj.entityDisplay,
        entityId: stateObj.entityId,
        id: stateObj.id,
        isCustomGroup: baseStateObj.isCustomGroup,
        lastChanged: baseStateObj.lastChanged,
        lastChangedAsDate: baseStateObj.lastChangedAsDate,
        lastUpdatedAt: baseStateObj.lastUpdatedAt,
        lastUpdatedAsDate: baseStateObj.lastUpdatedAsDate,
        objectId: stateObj.objectId,
        state: baseStateObj.state,
        stateDisplay: baseStateObj.stateDisplay,
      };
    }

    for (const s of states) {
      if (s && s.domain) {
        if (groupDomainStateObj.domain !== s.domain) {
          groupDomainStateObj = false;
          break;
        }
      }
    }

    if (!groupDomainStateObj) {
      const el = Polymer.dom(this.$.groupedControlDetails);
      if (el.lastChild) {
        el.removeChild(el.lastChild);
      }
    } else {
      dynamicContentUpdater(
        this.$.groupedControlDetails,
          `MORE-INFO-${stateMoreInfoType(groupDomainStateObj).toUpperCase()}`,
          { stateObj: groupDomainStateObj });
    }
  },
});

import Polymer from '../polymer';
import { util } from '../util/home-assistant-js-instance';

require('../cards/ha-domain-card');
require('../cards/ha-badges-card');

const PRIORITY = {
  a: -1,
  sun: 0,
  device_tracker: 1,
  sensor: 2,
  scene: 3,
  script: 4,
  configurator: 10,
  group: 20,
  thermostat: 40,
  media_player: 50,
  camera: 60,
};

function getPriority(domain) {
  return (domain in PRIORITY) ? PRIORITY[domain] : 30;
}

function entityDomainMap(entityMap) {
  return entityMap.groupBy(entity => entity.domain);
}

export default new Polymer({
  is: 'ha-zone-cards',

  properties: {
    columns: {
      type: Number,
      value: 2,
    },

    states: {
      type: Object,
    },

    cards: {
      type: Object,
      computed: 'computeDomains(columns, states)',
    },
  },

  computeDomains(columns, states) {
    const byDomain = entityDomainMap(states);
    const hasGroup = {};

    const cards = {
      _demo: false,
      _badges: [],
      _columns: {},
    };
    for (let i = 0; i < columns; i++) { cards._columns[i] = []; }

    let index = 0;
    function pushCard(name, entities, filterGrouped = true) {
      const filtered = filterGrouped ?
        entities.filter(entity => !(entity.entityId in hasGroup)) :
        entities;
      if (filtered.length === 0) {
        return;
      }
      cards._columns[index].push(name);
      index = (index + 1) % columns;
      cards[name] = filtered;
    }

    byDomain.keySeq().sortBy(domain => getPriority(domain))
      .forEach(domain => {
        if (domain === 'a') {
          cards._demo = true;
        } else if (getPriority(domain) < 10) {
          cards._badges.push.apply(cards._badges, byDomain.get(domain).toArray());
        } else if (domain === 'group') {
          byDomain.get(domain).filter(st => !st.attributes.auto)
            .forEach(groupState => {
              const entities = util.expandGroup(groupState, states);
              entities.forEach(entity => hasGroup[entity.entityId] = true);
              pushCard(groupState.entityDisplay, entities, false);
            }
          );
        } else {
          pushCard(domain, byDomain.get(domain).toArray());
        }
      }
    );
    return cards;
  },

  computeStatesOfCard(cards, card) {
    return cards[card];
  },
});

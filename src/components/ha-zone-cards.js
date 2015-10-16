import Polymer from '../polymer';
import { util } from '../util/home-assistant-js-instance';

require('.//ha-demo-badge');
require('../cards/ha-badges-card');
require('../cards/ha-domain-card');
require('../cards/ha-introduction-card');

const PRIORITY = {
  configurator: -20,
  group: -10,
  a: -1,
  sun: 0,
  device_tracker: 1,
  alarm_control_panel: 2,
  sensor: 3,
  scene: 4,
  script: 5,
  thermostat: 40,
  media_player: 50,
  camera: 60,
};

function getPriority(domain) {
  return (domain in PRIORITY) ? PRIORITY[domain] : 30;
}

function entitySortBy(entity) {
  return entity.entityDisplay.toLowerCase();
}

export default new Polymer({
  is: 'ha-zone-cards',

  properties: {
    showIntroduction: {
      type: Boolean,
      value: false,
    },

    columns: {
      type: Number,
      value: 2,
    },

    states: {
      type: Object,
    },

    cards: {
      type: Object,
      computed: 'computeDomains(columns, states, showIntroduction)',
    },
  },

  computeDomains(columns, states, showIntroduction) {
    const byDomain = states.groupBy(entity => entity.domain);
    const hasGroup = {};

    const cards = {
      _demo: false,
      _badges: [],
      _columns: [],
    };
    for (let idx = 0; idx < columns; idx++) { cards._columns[idx] = []; }

    function filterGrouped(entities) {
      return entities.filter(entity => !(entity.entityId in hasGroup));
    }

    let index = 0;
    function increaseIndex() {
      const old = index;
      index = (index + 1) % columns;
      return old;
    }
    if (showIntroduction) {
      increaseIndex();
    }

    function pushCard(name, entities, groupEntity = false) {
      if (entities.length === 0) {
        return;
      }
      cards._columns[increaseIndex()].push(name);
      cards[name] = {entities, groupEntity};
    }

    byDomain.keySeq().sortBy(domain => getPriority(domain))
      .forEach(domain => {
        if (domain === 'a') {
          cards._demo = true;
          return;
        }

        const priority = getPriority(domain);

        if (priority >= 0 && priority < 10) {
          cards._badges.push.apply(
            cards._badges, filterGrouped(byDomain.get(domain)).sortBy(
              entitySortBy).toArray());
        } else if (domain === 'group') {
          byDomain.get(domain).filter(st => !st.attributes.auto).sortBy(entitySortBy)
            .forEach(groupState => {
              const entities = util.expandGroup(groupState, states);
              entities.forEach(entity => hasGroup[entity.entityId] = true);
              pushCard(groupState.entityDisplay, entities.toArray(), groupState);
            }
          );
        } else {
          pushCard(domain, filterGrouped(byDomain.get(domain)).sortBy(entitySortBy).toArray());
        }
      }
    );
    return cards;
  },

  computeShouldRenderColumn(index, items) {
    return index === 0 || items.length;
  },

  computeShowIntroduction(index, showIntroduction, cards) {
    return index === 0 && (showIntroduction || cards._demo);
  },

  computeShowHideInstruction(states, cards) {
    return states.size > 0 && !__DEMO__ && !cards._demo;
  },

  computeGroupEntityOfCard(cards, card) {
    return cards[card].groupEntity;
  },

  computeStatesOfCard(cards, card) {
    return cards[card].entities;
  },
});

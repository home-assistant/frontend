import Polymer from '../polymer';
import hass from '../util/home-assistant-js-instance';

require('.//ha-demo-badge');
require('../cards/ha-badges-card');
require('../cards/ha-entities-card');
require('../cards/ha-introduction-card');

const { util } = hass;
const PRIORITY = {
  configurator: -20,
  group: -10,
  a: -1,
  updater: 0,
  sun: 1,
  device_tracker: 2,
  alarm_control_panel: 3,
  camera: 4,
  sensor: 5,
  binary_sensor: 6,
  scene: 7,
  script: 8,
};

function getPriority(domain) {
  return (domain in PRIORITY) ? PRIORITY[domain] : 30;
}

function entitySortBy(entity) {
  return entity.domain === 'group' ? entity.attributes.order :
                                     entity.entityDisplay.toLowerCase();
}

export default new Polymer({
  is: 'ha-cards',

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
      computed: 'computeCards(columns, states, showIntroduction)',
    },
  },

  computeCards(columns, states, showIntroduction) {
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
      cards[name] = { entities, groupEntity };
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
          byDomain.get(domain).sortBy(entitySortBy)
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
    return card in cards && cards[card].groupEntity;
  },

  computeStatesOfCard(cards, card) {
    return card in cards && cards[card].entities;
  },
});

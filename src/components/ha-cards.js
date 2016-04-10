import Polymer from '../polymer';
import hass from '../util/home-assistant-js-instance';

require('.//ha-demo-badge');
require('../cards/ha-badges-card');
require('../cards/ha-card-chooser');

const { util } = hass;

// mapping domain to size of the card.
const DOMAINS_WITH_CARD = {
  camera: 4,
  media_player: 3,
};

const PRIORITY = {
  configurator: -20,
  group: -10,
  a: -1,
  updater: 0,
  sun: 1,
  device_tracker: 2,
  alarm_control_panel: 3,
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
    },
  },

  observers: [
    'updateCards(columns, states, showIntroduction)',
  ],

  updateCards(columns, states, showIntroduction) {
    this.debounce(
      'updateCards',
      () => { this.cards = this.computeCards(columns, states, showIntroduction); },
      0
    );
  },

  computeCards(columns, states, showIntroduction) {
    const byDomain = states.groupBy(entity => entity.domain);
    const hasGroup = {};

    const cards = {
      _demo: false,
      _badges: [],
      _columns: [],
    };
    const entityCount = [];
    for (let idx = 0; idx < columns; idx++) {
      cards._columns.push([]);
      entityCount.push(0);
    }

    function filterGrouped(entities) {
      return entities.filter(entity => !(entity.entityId in hasGroup));
    }

    // Find column with < 5 entities, else column with lowest count
    function getIndex(size) {
      let minIndex = 0;
      for (let i = minIndex; i < entityCount.length; i++) {
        if (entityCount[i] < 5) {
          minIndex = i;
          break;
        }
        if (entityCount[i] < entityCount[minIndex]) {
          minIndex = i;
        }
      }

      entityCount[minIndex] += size;

      return minIndex;
    }
    if (showIntroduction) {
      cards._columns[getIndex(5)].push('ha-introduction');
      cards['ha-introduction'] = {
        cardType: 'introduction',
        showHideInstruction: states.size > 0 && !__DEMO__,
      };
    }

    function addEntitiesCard(name, entities, groupEntity = false) {
      if (entities.length === 0) return;

      const owncard = [];
      const other = [];

      let size = 0;

      entities.forEach(entity => {
        if (entity.domain in DOMAINS_WITH_CARD) {
          owncard.push(entity);
          size += DOMAINS_WITH_CARD[entity.domain];
        } else {
          other.push(entity);
          size++;
        }
      });

      // Add 1 to the size if we're rendering entities card
      size += other.length > 1;

      const curIndex = getIndex(size);

      if (other.length > 0) {
        cards._columns[curIndex].push(name);
        cards[name] = {
          cardType: 'entities',
          states: other,
          groupEntity,
        };
      }

      owncard.forEach(entity => {
        cards._columns[curIndex].push(entity.entityId);
        cards[entity.entityId] = {
          cardType: entity.domain,
          stateObj: entity,
        };
      });
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
              entities.forEach(entity => { hasGroup[entity.entityId] = true; });
              addEntitiesCard(groupState.entityId, entities.toArray(), groupState);
            }
          );
        } else {
          addEntitiesCard(
            domain, filterGrouped(byDomain.get(domain)).sortBy(entitySortBy).toArray());
        }
      }
    );

    // Remove empty columns
    cards._columns = cards._columns.filter(val => val.length > 0);

    return cards;
  },

  computeCardDataOfCard(cards, card) {
    return cards[card];
  },
});

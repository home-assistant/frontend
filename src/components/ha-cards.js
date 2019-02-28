import "@polymer/iron-flex-layout/iron-flex-layout-classes";
import { timeOut } from "@polymer/polymer/lib/utils/async";
import { Debouncer } from "@polymer/polymer/lib/utils/debounce";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../cards/ha-badges-card";
import "../cards/ha-card-chooser";
import "./ha-demo-badge";

import computeStateDomain from "../common/entity/compute_state_domain";
import splitByGroups from "../common/entity/split_by_groups";
import getGroupEntities from "../common/entity/get_group_entities";

// mapping domain to size of the card.
const DOMAINS_WITH_CARD = {
  camera: 4,
  history_graph: 4,
  media_player: 3,
  persistent_notification: 0,
  plant: 3,
  weather: 4,
};

// 4 types:
// badges: 0 .. 10
// before groups < 0
// groups: X
// rest: 100

const PRIORITY = {
  // before groups < 0
  configurator: -20,
  persistent_notification: -15,

  // badges have priority >= 0
  updater: 0,
  sun: 1,
  person: 2,
  device_tracker: 3,
  alarm_control_panel: 4,
  timer: 5,
  sensor: 6,
  binary_sensor: 7,
  mailbox: 8,
};

const getPriority = (domain) => (domain in PRIORITY ? PRIORITY[domain] : 100);

const sortPriority = (domainA, domainB) => domainA.priority - domainB.priority;

const entitySortBy = (entityA, entityB) => {
  const nameA = (
    entityA.attributes.friendly_name || entityA.entity_id
  ).toLowerCase();
  const nameB = (
    entityB.attributes.friendly_name || entityB.entity_id
  ).toLowerCase();

  if (nameA < nameB) {
    return -1;
  }
  if (nameA > nameB) {
    return 1;
  }
  return 0;
};

const iterateDomainSorted = (collection, func) => {
  Object.keys(collection)
    .map((key) => collection[key])
    .sort(sortPriority)
    .forEach((domain) => {
      domain.states.sort(entitySortBy);
      func(domain);
    });
};

class HaCards extends PolymerElement {
  static get template() {
    return html`
      <style include="iron-flex iron-flex-factors"></style>
      <style>
        :host {
          display: block;
          padding: 4px 4px 0;
          transform: translateZ(0);
          position: relative;
        }

        .badges {
          font-size: 85%;
          text-align: center;
          padding-top: 16px;
        }

        .column {
          max-width: 500px;
          overflow-x: hidden;
        }

        ha-card-chooser {
          display: block;
          margin: 4px 4px 8px;
        }

        @media (max-width: 500px) {
          :host {
            padding-left: 0;
            padding-right: 0;
          }

          ha-card-chooser {
            margin-left: 0;
            margin-right: 0;
          }
        }

        @media (max-width: 599px) {
          .column {
            max-width: 600px;
          }
        }
      </style>

      <div id="main">
        <template is="dom-if" if="[[cards.badges.length]]">
          <div class="badges">
            <template is="dom-if" if="[[cards.demo]]">
              <ha-demo-badge></ha-demo-badge>
            </template>

            <ha-badges-card
              states="[[cards.badges]]"
              hass="[[hass]]"
            ></ha-badges-card>
          </div>
        </template>

        <div class="horizontal layout center-justified">
          <template is="dom-repeat" items="[[cards.columns]]" as="column">
            <div class="column flex-1">
              <template is="dom-repeat" items="[[column]]" as="card">
                <ha-card-chooser card-data="[[card]]"></ha-card-chooser>
              </template>
            </div>
          </template>
        </div>
      </div>
    `;
  }

  static get properties() {
    return {
      hass: Object,

      columns: {
        type: Number,
        value: 2,
      },

      states: Object,

      viewVisible: {
        type: Boolean,
        value: false,
      },

      orderedGroupEntities: Array,

      cards: Object,
    };
  }

  static get observers() {
    return ["updateCards(columns, states, viewVisible, orderedGroupEntities)"];
  }

  updateCards(columns, states, viewVisible, orderedGroupEntities) {
    if (!viewVisible) {
      if (this.$.main.parentNode) {
        this.$.main._parentNode = this.$.main.parentNode;
        this.$.main.parentNode.removeChild(this.$.main);
      }
      return;
    }
    if (!this.$.main.parentNode && this.$.main._parentNode) {
      this.$.main._parentNode.appendChild(this.$.main);
    }
    this._debouncer = Debouncer.debounce(
      this._debouncer,
      timeOut.after(10),
      () => {
        // Things might have changed since it got scheduled.
        if (this.viewVisible) {
          this.cards = this.computeCards(columns, states, orderedGroupEntities);
        }
      }
    );
  }

  emptyCards() {
    return {
      demo: false,
      badges: [],
      columns: [],
    };
  }

  computeCards(columns, states, orderedGroupEntities) {
    const hass = this.hass;

    const cards = this.emptyCards();

    const entityCount = [];
    for (let i = 0; i < columns; i++) {
      cards.columns.push([]);
      entityCount.push(0);
    }

    // Find column with < 5 entities, else column with lowest count
    function getIndex(size) {
      let minIndex = 0;
      for (let i = 0; i < entityCount.length; i++) {
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

    function addEntitiesCard(name, entities, groupEntity) {
      if (entities.length === 0) return;

      const owncard = [];
      const other = [];

      let size = 0;

      entities.forEach((entity) => {
        const domain = computeStateDomain(entity);

        if (
          domain in DOMAINS_WITH_CARD &&
          !entity.attributes.custom_ui_state_card
        ) {
          owncard.push(entity);
          size += DOMAINS_WITH_CARD[domain];
        } else {
          other.push(entity);
          size++;
        }
      });

      // Add 1 to the size if we're rendering entities card
      size += other.length > 0;

      const curIndex = getIndex(size);

      if (other.length > 0) {
        cards.columns[curIndex].push({
          hass: hass,
          cardType: "entities",
          states: other,
          groupEntity: groupEntity || false,
        });
      }

      owncard.forEach((entity) => {
        cards.columns[curIndex].push({
          hass: hass,
          cardType: computeStateDomain(entity),
          stateObj: entity,
        });
      });
    }

    const splitted = splitByGroups(states);
    if (orderedGroupEntities) {
      splitted.groups.sort(
        (gr1, gr2) =>
          orderedGroupEntities[gr1.entity_id] -
          orderedGroupEntities[gr2.entity_id]
      );
    } else {
      splitted.groups.sort(
        (gr1, gr2) => gr1.attributes.order - gr2.attributes.order
      );
    }

    const badgesColl = {};
    const beforeGroupColl = {};
    const afterGroupedColl = {};

    Object.keys(splitted.ungrouped).forEach((key) => {
      const state = splitted.ungrouped[key];
      const domain = computeStateDomain(state);

      if (domain === "a") {
        cards.demo = true;
        return;
      }

      const priority = getPriority(domain);
      let coll;

      if (priority < 0) {
        coll = beforeGroupColl;
      } else if (priority < 10) {
        coll = badgesColl;
      } else {
        coll = afterGroupedColl;
      }

      if (!(domain in coll)) {
        coll[domain] = {
          domain: domain,
          priority: priority,
          states: [],
        };
      }

      coll[domain].states.push(state);
    });

    if (orderedGroupEntities) {
      Object.keys(badgesColl)
        .map((key) => badgesColl[key])
        .forEach((domain) => {
          cards.badges.push.apply(cards.badges, domain.states);
        });

      cards.badges.sort(
        (e1, e2) =>
          orderedGroupEntities[e1.entity_id] -
          orderedGroupEntities[e2.entity_id]
      );
    } else {
      iterateDomainSorted(badgesColl, (domain) => {
        cards.badges.push.apply(cards.badges, domain.states);
      });
    }

    iterateDomainSorted(beforeGroupColl, (domain) => {
      addEntitiesCard(domain.domain, domain.states);
    });

    splitted.groups.forEach((groupState) => {
      const entities = getGroupEntities(states, groupState);
      addEntitiesCard(
        groupState.entity_id,
        Object.keys(entities).map((key) => entities[key]),
        groupState
      );
    });

    iterateDomainSorted(afterGroupedColl, (domain) => {
      addEntitiesCard(domain.domain, domain.states);
    });

    // Remove empty columns
    cards.columns = cards.columns.filter((val) => val.length > 0);

    return cards;
  }
}
customElements.define("ha-cards", HaCards);

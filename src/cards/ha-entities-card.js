import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import '../components/ha-card.js';
import '../components/entity/ha-entity-toggle.js';
import '../state-summary/state-card-content.js';
import '../util/hass-mixins.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
class HaEntitiesCard extends
  window.hassMixins.LocalizeMixin(window.hassMixins.EventsMixin(PolymerElement)) {
  static get template() {
    return html`
    <style is="custom-style" include="iron-flex"></style>
    <style>
      ha-card {
        padding: 16px;
      }
      .state {
        padding: 4px 0;
      }
      .header {
        @apply --paper-font-headline;
        /* overwriting line-height +8 because entity-toggle can be 40px height,
           compensating this with reduced padding */
        line-height: 40px;
        color: var(--primary-text-color);
        padding: 4px 0 12px;
      }
      .header .name {
        @apply --paper-font-common-nowrap;
      }
      ha-entity-toggle {
        margin-left: 16px;
      }
      .more-info {
        cursor: pointer;
      }
    </style>

    <ha-card>
      <template is="dom-if" if="[[title]]">
        <div class\$="[[computeTitleClass(groupEntity)]]" on-click="entityTapped">
          <div class="flex name">[[title]]</div>
          <template is="dom-if" if="[[showGroupToggle(groupEntity, states)]]">
            <ha-entity-toggle hass="[[hass]]" state-obj="[[groupEntity]]"></ha-entity-toggle>
          </template>
        </div>
      </template>
      <div class="states">
        <template is="dom-repeat" items="[[states]]" on-dom-change="addTapEvents">
          <div class\$="[[computeStateClass(item)]]">
            <state-card-content hass="[[hass]]" class="state-card" state-obj="[[item]]"></state-card-content>
          </div>
        </template>
      </div>
    </ha-card>
`;
  }

  static get is() { return 'ha-entities-card'; }
  static get properties() {
    return {
      hass: Object,
      states: Array,
      groupEntity: Object,
      title: {
        type: String,
        computed: 'computeTitle(states, groupEntity, localize)',
      },
    };
  }

  constructor() {
    super();
    // We need to save a single bound function reference to ensure the event listener
    // can identify it properly.
    this.entityTapped = this.entityTapped.bind(this);
  }

  computeTitle(states, groupEntity, localize) {
    if (groupEntity) {
      return window.hassUtil.computeStateName(groupEntity).trim();
    }
    const domain = window.hassUtil.computeDomain(states[0]);
    return (localize && localize(`domain.${domain}`)) || domain.replace(/_/g, ' ');
  }

  computeTitleClass(groupEntity) {
    let classes = 'header horizontal layout center ';
    if (groupEntity) {
      classes += 'more-info';
    }
    return classes;
  }

  computeStateClass(stateObj) {
    return window.hassUtil.stateMoreInfoType(stateObj) !== 'hidden' ? 'state more-info' : 'state';
  }

  addTapEvents() {
    const cards = this.root.querySelectorAll('.state');
    cards.forEach((card) => {
      if (card.classList.contains('more-info')) {
        card.addEventListener('click', this.entityTapped);
      } else {
        card.removeEventListener('click', this.entityTapped);
      }
    });
  }

  entityTapped(ev) {
    const item = this.root.querySelector('dom-repeat').itemForElement(ev.target);
    let entityId;
    if (!item && !this.groupEntity) {
      return;
    }
    ev.stopPropagation();

    if (item) {
      entityId = item.entity_id;
    } else {
      entityId = this.groupEntity.entity_id;
    }
    this.fire('hass-more-info', { entityId: entityId });
  }

  showGroupToggle(groupEntity, states) {
    if (!groupEntity || !states || groupEntity.attributes.control === 'hidden' ||
        (groupEntity.state !== 'on' && groupEntity.state !== 'off')) {
      return false;
    }

    // Only show if we can toggle 2+ entities in group
    let canToggleCount = 0;
    for (let i = 0; i < states.length; i++) {
      if (!window.hassUtil.canToggleState(this.hass, states[i])) {
        continue;
      }

      canToggleCount++;

      if (canToggleCount > 1) {
        break;
      }
    }

    return canToggleCount > 1;
  }
}
customElements.define(HaEntitiesCard.is, HaEntitiesCard);

import "@polymer/iron-flex-layout/iron-flex-layout-classes";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../components/entity/ha-entity-toggle";
import "../components/ha-card";
import "../state-summary/state-card-content";

import computeStateDomain from "../common/entity/compute_state_domain";
import computeStateName from "../common/entity/compute_state_name";
import stateMoreInfoType from "../common/entity/state_more_info_type";
import canToggleState from "../common/entity/can_toggle_state";
import { EventsMixin } from "../mixins/events-mixin";
import LocalizeMixin from "../mixins/localize-mixin";

class HaEntitiesCard extends LocalizeMixin(EventsMixin(PolymerElement)) {
  static get template() {
    return html`
      <style include="iron-flex"></style>
      <style>
        ha-card {
          padding: 16px;
        }
        .states {
          margin: -4px 0;
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
          <div
            class$="[[computeTitleClass(groupEntity)]]"
            on-click="entityTapped"
          >
            <div class="flex name">[[title]]</div>
            <template is="dom-if" if="[[showGroupToggle(groupEntity, states)]]">
              <ha-entity-toggle
                hass="[[hass]]"
                state-obj="[[groupEntity]]"
              ></ha-entity-toggle>
            </template>
          </div>
        </template>
        <div class="states">
          <template
            is="dom-repeat"
            items="[[states]]"
            on-dom-change="addTapEvents"
          >
            <div class$="[[computeStateClass(item)]]">
              <state-card-content
                hass="[[hass]]"
                class="state-card"
                state-obj="[[item]]"
              ></state-card-content>
            </div>
          </template>
        </div>
      </ha-card>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      states: Array,
      groupEntity: Object,
      title: {
        type: String,
        computed: "computeTitle(states, groupEntity, localize)",
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
      return computeStateName(groupEntity).trim();
    }
    const domain = computeStateDomain(states[0]);
    return (
      (localize && localize(`domain.${domain}`)) || domain.replace(/_/g, " ")
    );
  }

  computeTitleClass(groupEntity) {
    let classes = "header horizontal layout center ";
    if (groupEntity) {
      classes += "more-info";
    }
    return classes;
  }

  computeStateClass(stateObj) {
    return stateMoreInfoType(stateObj) !== "hidden"
      ? "state more-info"
      : "state";
  }

  addTapEvents() {
    const cards = this.root.querySelectorAll(".state");
    cards.forEach((card) => {
      if (card.classList.contains("more-info")) {
        card.addEventListener("click", this.entityTapped);
      } else {
        card.removeEventListener("click", this.entityTapped);
      }
    });
  }

  entityTapped(ev) {
    const item = this.root
      .querySelector("dom-repeat")
      .itemForElement(ev.target);
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
    this.fire("hass-more-info", { entityId: entityId });
  }

  showGroupToggle(groupEntity, states) {
    if (
      !groupEntity ||
      !states ||
      groupEntity.attributes.control === "hidden" ||
      (groupEntity.state !== "on" && groupEntity.state !== "off")
    ) {
      return false;
    }

    // Only show if we can toggle 2+ entities in group
    let canToggleCount = 0;
    for (let i = 0; i < states.length; i++) {
      if (!canToggleState(this.hass, states[i])) {
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
customElements.define("ha-entities-card", HaEntitiesCard);

import "@polymer/paper-item/paper-icon-item.js";
import "@polymer/paper-item/paper-item-body.js";
import "@polymer/paper-card/paper-card.js";
import { html } from "@polymer/polymer/lib/utils/html-tag.js";
import { PolymerElement } from "@polymer/polymer/polymer-element.js";

import "../../../layouts/hass-subpage.js";

import EventsMixin from "../../../mixins/events-mixin.js";
import LocalizeMixIn from "../../../mixins/localize-mixin.js";
import computeStateName from "../../../common/entity/compute_state_name.js";
import "../../../components/entity/state-badge.js";

function computeEntityName(hass, entity) {
  if (entity.name) return entity.name;
  const state = hass.states[entity.entity_id];
  return state ? computeStateName(state) : null;
}

/*
 * @appliesMixin LocalizeMixIn
 * @appliesMixin EventsMixin
 */
class HaCeEntitiesCard extends LocalizeMixIn(EventsMixin(PolymerElement)) {
  static get template() {
    return html`
    <style>
      paper-card {
        flex: 1 0 100%;
        padding-bottom: 8px;
      }
      paper-icon-item {
        cursor: pointer;
        padding-top: 4px;
        padding-bottom: 4px;
      }
    </style>
    <paper-card heading='[[heading]]'>
      <template is='dom-repeat' items='[[entities]]' as='entity'>
        <paper-icon-item on-click='_openMoreInfo'>
          <state-badge
            state-obj="[[_computeStateObj(entity, hass)]]"
            slot='item-icon'
          ></state-badge>
          <paper-item-body>
            <div class='name'>[[_computeEntityName(entity, hass)]]</div>
            <div class='secondary entity-id'>[[entity.entity_id]]</div>
          </paper-item-body>
        </paper-icon-item>
      </template>
    </paper-card>
    `;
  }

  static get properties() {
    return {
      heading: String,
      entities: Array,
      hass: Object,
    };
  }

  _computeStateObj(entity, hass) {
    return hass.states[entity.entity_id];
  }

  _computeEntityName(entity, hass) {
    return (
      computeEntityName(hass, entity) ||
      `(${this.localize(
        "ui.panel.config.integrations.config_entry.entity_unavailable"
      )})`
    );
  }

  _openMoreInfo(ev) {
    this.fire("hass-more-info", { entityId: ev.model.entity.entity_id });
  }
}

customElements.define("ha-ce-entities-card", HaCeEntitiesCard);

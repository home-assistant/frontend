import "@polymer/paper-item/paper-icon-item";
import "@polymer/paper-item/paper-item-body";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../../../components/ha-card";
import "../../../../layouts/hass-subpage";

import { EventsMixin } from "../../../../mixins/events-mixin";
import LocalizeMixIn from "../../../../mixins/localize-mixin";
import "../../../../components/entity/state-badge";
import { computeEntityRegistryName } from "../../../../data/entity_registry";

/*
 * @appliesMixin LocalizeMixIn
 * @appliesMixin EventsMixin
 */
class HaCeEntitiesCard extends LocalizeMixIn(EventsMixin(PolymerElement)) {
  static get template() {
    return html`
      <style>
        ha-card {
          flex: 1 0 100%;
          padding-bottom: 8px;
        }
        paper-icon-item {
          cursor: pointer;
          padding-top: 4px;
          padding-bottom: 4px;
        }
      </style>
      <ha-card header="[[heading]]">
        <template is="dom-repeat" items="[[entities]]" as="entity">
          <paper-icon-item on-click="_openMoreInfo">
            <state-badge
              state-obj="[[_computeStateObj(entity, hass)]]"
              slot="item-icon"
            ></state-badge>
            <paper-item-body>
              <div class="name">[[_computeEntityName(entity, hass)]]</div>
              <div class="secondary entity-id">[[entity.entity_id]]</div>
            </paper-item-body>
          </paper-icon-item>
        </template>
      </ha-card>
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
      computeEntityRegistryName(hass, entity) ||
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

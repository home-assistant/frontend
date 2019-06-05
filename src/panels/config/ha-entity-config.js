import "@material/mwc-button";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import "@polymer/paper-spinner/paper-spinner";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";
import "../../components/ha-card";

import computeStateName from "../../common/entity/compute_state_name";

class HaEntityConfig extends PolymerElement {
  static get template() {
    return html`
      <style include="iron-flex ha-style">
        ha-card {
          direction: ltr;
        }

        .device-picker {
          @apply --layout-horizontal;
          padding-bottom: 24px;
        }

        .form-placeholder {
          @apply --layout-vertical;
          @apply --layout-center-center;
          height: 96px;
        }

        [hidden]: {
          display: none;
        }

        .card-actions {
          @apply --layout-horizontal;
          @apply --layout-justified;
        }
      </style>
      <ha-card>
        <div class="card-content">
          <div class="device-picker">
            <paper-dropdown-menu
              label="[[label]]"
              class="flex"
              disabled="[[!entities.length]]"
            >
              <paper-listbox
                slot="dropdown-content"
                selected="{{selectedEntity}}"
              >
                <template is="dom-repeat" items="[[entities]]" as="state">
                  <paper-item>[[computeSelectCaption(state)]]</paper-item>
                </template>
              </paper-listbox>
            </paper-dropdown-menu>
          </div>

          <div class="form-container">
            <template is="dom-if" if="[[computeShowPlaceholder(formState)]]">
              <div class="form-placeholder">
                <template is="dom-if" if="[[computeShowNoDevices(formState)]]">
                  No entities found! :-(
                </template>

                <template is="dom-if" if="[[computeShowSpinner(formState)]]">
                  <paper-spinner active="" alt="[[formState]]"></paper-spinner>
                  [[formState]]
                </template>
              </div>
            </template>

            <div hidden$="[[!computeShowForm(formState)]]" id="form"></div>
          </div>
        </div>
        <div class="card-actions">
          <mwc-button
            on-click="saveEntity"
            disabled="[[computeShowPlaceholder(formState)]]"
            >SAVE</mwc-button
          >
          <template is="dom-if" if="[[allowDelete]]">
            <mwc-button
              class="warning"
              on-click="deleteEntity"
              disabled="[[computeShowPlaceholder(formState)]]"
              >DELETE</mwc-button
            >
          </template>
        </div>
      </ha-card>
    `;
  }

  static get properties() {
    return {
      hass: {
        type: Object,
        observer: "hassChanged",
      },

      label: {
        type: String,
        value: "Device",
      },

      entities: {
        type: Array,
        observer: "entitiesChanged",
      },

      allowDelete: {
        type: Boolean,
        value: false,
      },

      selectedEntity: {
        type: Number,
        value: -1,
        observer: "entityChanged",
      },

      formState: {
        type: String,
        // no-devices, loading, saving, editing
        value: "no-devices",
      },

      config: {
        type: Object,
      },
    };
  }

  connectedCallback() {
    super.connectedCallback();
    this.formEl = document.createElement(this.config.component);
    this.formEl.hass = this.hass;
    this.$.form.appendChild(this.formEl);
    this.entityChanged(this.selectedEntity);
  }

  computeSelectCaption(stateObj) {
    return this.config.computeSelectCaption
      ? this.config.computeSelectCaption(stateObj)
      : computeStateName(stateObj);
  }

  computeShowNoDevices(formState) {
    return formState === "no-devices";
  }

  computeShowSpinner(formState) {
    return formState === "loading" || formState === "saving";
  }

  computeShowPlaceholder(formState) {
    return formState !== "editing";
  }

  computeShowForm(formState) {
    return formState === "editing";
  }

  hassChanged(hass) {
    if (this.formEl) {
      this.formEl.hass = hass;
    }
  }

  entitiesChanged(entities, oldEntities) {
    if (entities.length === 0) {
      this.formState = "no-devices";
      return;
    }
    if (!oldEntities) {
      this.selectedEntity = 0;
      return;
    }

    var oldEntityId = oldEntities[this.selectedEntity].entity_id;

    var newIndex = entities.findIndex(function(ent) {
      return ent.entity_id === oldEntityId;
    });

    if (newIndex === -1) {
      this.selectedEntity = 0;
    } else if (newIndex !== this.selectedEntity) {
      // Entity moved index
      this.selectedEntity = newIndex;
    }
  }

  entityChanged(index) {
    if (!this.entities || !this.formEl) return;
    var entity = this.entities[index];
    if (!entity) return;

    this.formState = "loading";
    var el = this;
    this.formEl.loadEntity(entity).then(function() {
      el.formState = "editing";
    });
  }

  saveEntity() {
    this.formState = "saving";
    var el = this;
    this.formEl.saveEntity().then(function() {
      el.formState = "editing";
    });
  }
}

customElements.define("ha-entity-config", HaEntityConfig);

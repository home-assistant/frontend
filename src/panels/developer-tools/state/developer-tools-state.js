import "@material/mwc-button";
import "@polymer/paper-checkbox/paper-checkbox";
import "@polymer/paper-input/paper-input";
import "@polymer/paper-menu-button";
import copy from "copy-to-clipboard";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import { safeDump, safeLoad } from "js-yaml";

import "../../../components/entity/ha-entity-picker";
import "../../../components/ha-code-editor";
import "../../../resources/ha-style";
import { EventsMixin } from "../../../mixins/events-mixin";
import LocalizeMixin from "../../../mixins/localize-mixin";
import { showToast } from "../../../util/toast";

const ERROR_SENTINEL = {};
/*
 * @appliesMixin EventsMixin
 * @appliesMixin LocalizeMixin
 */
class HaPanelDevState extends EventsMixin(LocalizeMixin(PolymerElement)) {
  static get template() {
    return html`
      <style include="ha-style">
        :host {
          -ms-user-select: initial;
          -webkit-user-select: initial;
          -moz-user-select: initial;
          display: block;
          padding: 16px;
          direction: ltr;
        }

        .inputs {
          max-width: 400px;
        }

        mwc-button {
          margin-top: 8px;
        }

        .entities th {
          text-align: left;
        }

        .entities tr {
          vertical-align: top;
        }

        .entities tr:nth-child(odd) {
          background-color: var(--table-row-background-color, #fff);
        }

        .entities tr:nth-child(even) {
          background-color: var(--table-row-alternative-background-color, #eee);
        }
        .entities td {
          padding: 4px;
        }
        .entities paper-icon-button {
          height: 24px;
          padding: 0;
        }
        .entities td:nth-child(3) {
          white-space: pre-wrap;
          word-break: break-word;
        }

        .entities a {
          color: var(--primary-color);
        }
        paper-item {
          cursor: pointer;
        }
      </style>

      <div class="inputs">
        <p>
          [[localize('ui.panel.developer-tools.tabs.states.description1')]]<br />
          [[localize('ui.panel.developer-tools.tabs.states.description2')]]
        </p>

        <ha-entity-picker
          autofocus
          hass="[[hass]]"
          value="{{_entityId}}"
          on-change="entityIdChanged"
          allow-custom-entity
        ></ha-entity-picker>
        <paper-input
          label="[[localize('ui.panel.developer-tools.tabs.states.state')]]"
          required
          autocapitalize="none"
          autocomplete="off"
          autocorrect="off"
          spellcheck="false"
          value="{{_state}}"
          class="state-input"
        ></paper-input>
        <p>
          [[localize('ui.panel.developer-tools.tabs.states.state_attributes')]]
        </p>
        <ha-code-editor
          mode="yaml"
          value="[[_stateAttributes]]"
          error="[[!validJSON]]"
          on-value-changed="_yamlChanged"
        ></ha-code-editor>
        <mwc-button on-click="handleSetState" disabled="[[!validJSON]]" raised
          >[[localize('ui.panel.developer-tools.tabs.states.set_state')]]</mwc-button
        >
      </div>

      <h1>
        [[localize('ui.panel.developer-tools.tabs.states.current_entities')]]
      </h1>
      <table class="entities">
        <tr>
          <th>[[localize('ui.panel.developer-tools.tabs.states.entity')]]</th>
          <th>[[localize('ui.panel.developer-tools.tabs.states.state')]]</th>
          <th hidden$="[[narrow]]">
            [[localize('ui.panel.developer-tools.tabs.states.attributes')]]
            <paper-checkbox checked="{{_showAttributes}}"></paper-checkbox>
          </th>
        </tr>
        <tr>
          <th>
            <paper-input
              label="[[localize('ui.panel.developer-tools.tabs.states.filter_entities')]]"
              type="search"
              value="{{_entityFilter}}"
            ></paper-input>
          </th>
          <th>
            <paper-input
              label="[[localize('ui.panel.developer-tools.tabs.states.filter_states')]]"
              type="search"
              value="{{_stateFilter}}"
            ></paper-input>
          </th>
          <th hidden$="[[!computeShowAttributes(narrow, _showAttributes)]]">
            <paper-input
              label="[[localize('ui.panel.developer-tools.tabs.states.filter_attributes')]]"
              type="search"
              value="{{_attributeFilter}}"
            ></paper-input>
          </th>
        </tr>
        <tr hidden$="[[!computeShowEntitiesPlaceholder(_entities)]]">
          <td colspan="3">
            [[localize('ui.panel.developer-tools.tabs.states.no_entities')]]
          </td>
        </tr>
        <template is="dom-repeat" items="[[_entities]]" as="entity">
          <tr>
            <td>
              <paper-icon-button
                on-click="entityMoreInfo"
                icon="hass:information-outline"
                alt="[[localize('ui.panel.developer-tools.tabs.states.more_info')]]"
                title="[[localize('ui.panel.developer-tools.tabs.states.more_info')]]"
              >
              </paper-icon-button>
              <paper-menu-button>
                <paper-icon-button
                  icon="hass:menu"
                  slot="dropdown-trigger"
                  alt="menu"
                ></paper-icon-button>
                <paper-listbox slot="dropdown-content" role="listbox">
                  <paper-item action="copyId" on-click="entityCopyValue">
                    <paper-icon-button
                      icon="hass:content-copy"
                      alt="[[localize('ui.panel.developer-tools.tabs.states.copy_entity_id')]]"
                      title="[[localize('ui.panel.developer-tools.tabs.states.copy_entity_id')]]"
                    ></paper-icon-button>
                    [[localize('ui.panel.developer-tools.tabs.states.copy_entity_id')]]
                  </paper-item>

                  <paper-item action="copyState" on-click="entityCopyValue">
                    <paper-icon-button
                      icon="hass:content-copy"
                      alt="[[localize('ui.panel.developer-tools.tabs.states.copy_entity_state')]]"
                      title="[[localize('ui.panel.developer-tools.tabs.states.copy_entity_state')]]"
                    ></paper-icon-button>
                    [[localize('ui.panel.developer-tools.tabs.states.copy_entity_state')]]
                  </paper-item>

                  <paper-item
                    action="copyAttributes"
                    on-click="entityCopyValue"
                  >
                    <paper-icon-button
                      icon="hass:content-copy"
                      alt="[[localize('ui.panel.developer-tools.tabs.states.copy_entity_attribute')]]"
                      title="[[localize('ui.panel.developer-tools.tabs.states.copy_entity_attribute')]]"
                    ></paper-icon-button>
                    [[localize('ui.panel.developer-tools.tabs.states.copy_entity_attribute')]]
                  </paper-item>
                </paper-listbox>
              </paper-menu-button>
              <a href="#" on-click="entitySelected">[[entity.entity_id]]</a>
            </td>
            <td>[[entity.state]]</td>
            <template
              is="dom-if"
              if="[[computeShowAttributes(narrow, _showAttributes)]]"
            >
              <td>[[attributeString(entity)]]</td>
            </template>
          </tr>
        </template>
      </table>
    `;
  }

  static get properties() {
    return {
      hass: {
        type: Object,
      },

      parsedJSON: {
        type: Object,
        computed: "_computeParsedStateAttributes(_stateAttributes)",
      },

      validJSON: {
        type: Boolean,
        computed: "_computeValidJSON(parsedJSON)",
      },

      _entityId: {
        type: String,
        value: "",
      },

      _entityFilter: {
        type: String,
        value: "",
      },

      _stateFilter: {
        type: String,
        value: "",
      },

      _attributeFilter: {
        type: String,
        value: "",
      },

      _state: {
        type: String,
        value: "",
      },

      _stateAttributes: {
        type: String,
        value: "",
      },

      _showAttributes: {
        type: Boolean,
        value: true,
      },

      _entities: {
        type: Array,
        computed:
          "computeEntities(hass, _entityFilter, _stateFilter, _attributeFilter)",
      },
    };
  }

  entitySelected(ev) {
    var state = ev.model.entity;
    this._entityId = state.entity_id;
    this._state = state.state;
    this._stateAttributes = safeDump(state.attributes);
    ev.preventDefault();
  }

  entityIdChanged() {
    if (this._entityId === "") {
      this._state = "";
      this._stateAttributes = "";
      return;
    }
    var state = this.hass.states[this._entityId];
    this._state = state.state;
    this._stateAttributes = safeDump(state.attributes);
  }

  entityMoreInfo(ev) {
    ev.preventDefault();
    this.fire("hass-more-info", { entityId: ev.model.entity.entity_id });
  }

  entityCopyValue(ev) {
    var action = ev.currentTarget.attributes.action.value;
    if (action === "copyId") {
      copy(ev.model.entity.entity_id);
    } else if (action === "copyState") {
      copy(ev.model.entity.state);
    } else if (action === "copyAttributes") {
      copy(this.attributeString(ev.model.entity).replace(/\n/g, "<br />"));
    } else {
      return;
    }
    showToast(this, {
      message: this.hass.localize(
        "ui.panel.developer-tools.tabs.states.copied"
      ),
    });
  }

  handleSetState() {
    if (!this._entityId) {
      alert(
        this.hass.localize(
          "ui.panel.developer-tools.tabs.states.alert_entity_field"
        )
      );
      return;
    }
    this.hass.callApi("POST", "states/" + this._entityId, {
      state: this._state,
      attributes: this.parsedJSON,
    });
  }

  computeEntities(hass, _entityFilter, _stateFilter, _attributeFilter) {
    return Object.keys(hass.states)
      .map(function(key) {
        return hass.states[key];
      })
      .filter(function(value) {
        if (!value.entity_id.includes(_entityFilter.toLowerCase())) {
          return false;
        }

        if (!value.state.includes(_stateFilter.toLowerCase())) {
          return false;
        }

        if (_attributeFilter !== "") {
          var attributeFilter = _attributeFilter.toLowerCase();
          var colonIndex = attributeFilter.indexOf(":");
          var multiMode = colonIndex !== -1;

          var keyFilter = attributeFilter;
          var valueFilter = attributeFilter;

          if (multiMode) {
            // we need to filter keys and values separately
            keyFilter = attributeFilter.substring(0, colonIndex).trim();
            valueFilter = attributeFilter.substring(colonIndex + 1).trim();
          }

          var attributeKeys = Object.keys(value.attributes);

          for (var i = 0; i < attributeKeys.length; i++) {
            var key = attributeKeys[i];

            if (key.includes(keyFilter) && !multiMode) {
              return true; // in single mode we're already satisfied with this match
            }
            if (!key.includes(keyFilter) && multiMode) {
              continue;
            }

            var attributeValue = value.attributes[key];

            if (
              attributeValue !== null &&
              JSON.stringify(attributeValue)
                .toLowerCase()
                .includes(valueFilter)
            ) {
              return true;
            }
          }

          // there are no attributes where the key and/or value can be matched
          return false;
        }

        return true;
      })
      .sort(function(entityA, entityB) {
        if (entityA.entity_id < entityB.entity_id) {
          return -1;
        }
        if (entityA.entity_id > entityB.entity_id) {
          return 1;
        }
        return 0;
      });
  }

  computeShowEntitiesPlaceholder(_entities) {
    return _entities.length === 0;
  }

  computeShowAttributes(narrow, _showAttributes) {
    return !narrow && _showAttributes;
  }

  attributeString(entity) {
    var output = "";
    var i;
    var keys;
    var key;
    var value;

    for (i = 0, keys = Object.keys(entity.attributes); i < keys.length; i++) {
      key = keys[i];
      value = entity.attributes[key];
      if (!Array.isArray(value) && value instanceof Object) {
        value = JSON.stringify(value, null, "  ");
      }
      output += key + ": " + value + "\n";
    }

    return output;
  }

  _computeParsedStateAttributes(stateAttributes) {
    try {
      return stateAttributes.trim() ? safeLoad(stateAttributes) : {};
    } catch (err) {
      return ERROR_SENTINEL;
    }
  }

  _computeValidJSON(parsedJSON) {
    return parsedJSON !== ERROR_SENTINEL;
  }

  _yamlChanged(ev) {
    this._stateAttributes = ev.detail.value;
  }
}

customElements.define("developer-tools-state", HaPanelDevState);

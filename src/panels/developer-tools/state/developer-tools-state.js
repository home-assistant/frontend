import "@material/mwc-button";
import {
  mdiInformationOutline,
  mdiClipboardTextMultipleOutline,
} from "@mdi/js";
import "@polymer/paper-checkbox/paper-checkbox";
import "@polymer/paper-input/paper-input";
import { html } from "@polymer/polymer/lib/utils/html-tag";
/* eslint-plugin-disable lit */
import { PolymerElement } from "@polymer/polymer/polymer-element";
import { safeDump, safeLoad } from "js-yaml";
import { formatDateTimeWithSeconds } from "../../../common/datetime/format_date_time";
import { computeRTL } from "../../../common/util/compute_rtl";
import "../../../components/entity/ha-entity-picker";
import "../../../components/ha-code-editor";
import "../../../components/ha-svg-icon";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";
import { EventsMixin } from "../../../mixins/events-mixin";
import LocalizeMixin from "../../../mixins/localize-mixin";
import "../../../styles/polymer-ha-style";
import { copyToClipboard } from "../../../common/util/copy-clipboard";

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
        }

        .inputs {
          width: 100%;
          max-width: 400px;
        }

        .info {
          padding: 0 16px;
        }

        mwc-button {
          margin-top: 8px;
        }

        .table-wrapper {
          width: 100%;
          overflow: auto;
        }

        .entities th {
          padding: 0 8px;
          text-align: left;
          font-size: var(
            --paper-input-container-shared-input-style_-_font-size
          );
        }

        :host([rtl]) .entities th {
          text-align: right;
        }

        .entities tr {
          vertical-align: top;
          direction: ltr;
        }

        .entities tr:nth-child(odd) {
          background-color: var(--table-row-background-color, #fff);
        }

        .entities tr:nth-child(even) {
          background-color: var(--table-row-alternative-background-color, #eee);
        }
        .entities td {
          padding: 4px;
          min-width: 200px;
          word-break: break-word;
        }
        .entities ha-svg-icon {
          --mdc-icon-size: 20px;
          padding: 4px;
          cursor: pointer;
        }
        .entities td:nth-child(3) {
          white-space: pre-wrap;
          word-break: break-word;
        }

        .entities a {
          color: var(--primary-color);
        }

        :host([narrow]) .state-wrapper {
          flex-direction: column;
        }

        :host([narrow]) .info {
          padding: 0;
        }
      </style>

      <p>
        [[localize('ui.panel.developer-tools.tabs.states.description1')]]<br />
        [[localize('ui.panel.developer-tools.tabs.states.description2')]]
      </p>
      <div class="state-wrapper flex layout horizontal">
        <div class="inputs">
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
        <div class="info">
          <template is="dom-if" if="[[_entity]]">
            <p>
              <b
                >[[localize('ui.panel.developer-tools.tabs.states.last_changed')]]:</b
              ><br />[[lastChangedString(_entity)]]
            </p>
            <p>
              <b
                >[[localize('ui.panel.developer-tools.tabs.states.last_updated')]]:</b
              ><br />[[lastUpdatedString(_entity)]]
            </p>
          </template>
        </div>
      </div>

      <h1>
        [[localize('ui.panel.developer-tools.tabs.states.current_entities')]]
      </h1>
      <div class="table-wrapper">
        <table class="entities">
          <tr>
            <th>[[localize('ui.panel.developer-tools.tabs.states.entity')]]</th>
            <th>[[localize('ui.panel.developer-tools.tabs.states.state')]]</th>
            <th hidden$="[[narrow]]">
              [[localize('ui.panel.developer-tools.tabs.states.attributes')]]
              <paper-checkbox
                checked="{{_showAttributes}}"
                on-change="{{saveAttributeCheckboxState}}"
              ></paper-checkbox>
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
                <ha-svg-icon
                  on-click="entityMoreInfo"
                  alt="[[localize('ui.panel.developer-tools.tabs.states.more_info')]]"
                  title="[[localize('ui.panel.developer-tools.tabs.states.more_info')]]"
                  path="[[informationOutlineIcon()]]"
                ></ha-svg-icon>
                <ha-svg-icon
                  on-click="copyEntity"
                  alt="[[localize('ui.panel.developer-tools.tabs.states.copy_id')]]"
                  title="[[localize('ui.panel.developer-tools.tabs.states.copy_id')]]"
                  path="[[clipboardOutlineIcon()]]"
                ></ha-svg-icon>
                <a href="#" on-click="entitySelected">[[entity.entity_id]]</a>
              </td>
              <td>
                [[entity.state]]
              </td>
              <template
                is="dom-if"
                if="[[computeShowAttributes(narrow, _showAttributes)]]"
              >
                <td>[[attributeString(entity)]]</td>
              </template>
            </tr>
          </template>
        </table>
      </div>
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

      _entity: {
        type: Object,
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
        value: JSON.parse(
          localStorage.getItem("devToolsShowAttributes") || true
        ),
      },

      _entities: {
        type: Array,
        computed:
          "computeEntities(hass, _entityFilter, _stateFilter, _attributeFilter)",
      },

      narrow: {
        type: Boolean,
        reflectToAttribute: true,
      },

      rtl: {
        reflectToAttribute: true,
        computed: "_computeRTL(hass)",
      },
    };
  }

  copyEntity(ev) {
    ev.preventDefault();
    copyToClipboard(ev.model.entity.entity_id);
  }

  entitySelected(ev) {
    const state = ev.model.entity;
    this._entityId = state.entity_id;
    this._entity = state;
    this._state = state.state;
    this._stateAttributes = safeDump(state.attributes);
    ev.preventDefault();
  }

  entityIdChanged() {
    if (this._entityId === "") {
      this._entity = undefined;
      this._state = "";
      this._stateAttributes = "";
      return;
    }
    const state = this.hass.states[this._entityId];
    if (!state) {
      return;
    }
    this._entity = state;
    this._state = state.state;
    this._stateAttributes = safeDump(state.attributes);
  }

  entityMoreInfo(ev) {
    ev.preventDefault();
    this.fire("hass-more-info", { entityId: ev.model.entity.entity_id });
  }

  handleSetState() {
    if (!this._entityId) {
      showAlertDialog(this, {
        text: this.hass.localize(
          "ui.panel.developer-tools.tabs.states.alert_entity_field"
        ),
      });
      return;
    }
    this.hass.callApi("POST", "states/" + this._entityId, {
      state: this._state,
      attributes: this.parsedJSON,
    });
  }

  informationOutlineIcon() {
    return mdiInformationOutline;
  }

  clipboardOutlineIcon() {
    return mdiClipboardTextMultipleOutline;
  }

  computeEntities(hass, _entityFilter, _stateFilter, _attributeFilter) {
    return Object.keys(hass.states)
      .map(function (key) {
        return hass.states[key];
      })
      .filter(function (value) {
        if (!value.entity_id.includes(_entityFilter.toLowerCase())) {
          return false;
        }

        if (!value.state.includes(_stateFilter.toLowerCase())) {
          return false;
        }

        if (_attributeFilter !== "") {
          const attributeFilter = _attributeFilter.toLowerCase();
          const colonIndex = attributeFilter.indexOf(":");
          const multiMode = colonIndex !== -1;

          let keyFilter = attributeFilter;
          let valueFilter = attributeFilter;

          if (multiMode) {
            // we need to filter keys and values separately
            keyFilter = attributeFilter.substring(0, colonIndex).trim();
            valueFilter = attributeFilter.substring(colonIndex + 1).trim();
          }

          const attributeKeys = Object.keys(value.attributes);

          for (let i = 0; i < attributeKeys.length; i++) {
            const key = attributeKeys[i];

            if (key.includes(keyFilter) && !multiMode) {
              return true; // in single mode we're already satisfied with this match
            }
            if (!key.includes(keyFilter) && multiMode) {
              continue;
            }

            const attributeValue = value.attributes[key];

            if (
              attributeValue !== null &&
              JSON.stringify(attributeValue).toLowerCase().includes(valueFilter)
            ) {
              return true;
            }
          }

          // there are no attributes where the key and/or value can be matched
          return false;
        }

        return true;
      })
      .sort(function (entityA, entityB) {
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
    let output = "";
    let i;
    let keys;
    let key;
    let value;

    for (i = 0, keys = Object.keys(entity.attributes); i < keys.length; i++) {
      key = keys[i];
      value = this.formatAttributeValue(entity.attributes[key]);
      output += `${key}: ${value}\n`;
    }
    return output;
  }

  lastChangedString(entity) {
    return formatDateTimeWithSeconds(
      new Date(entity.last_changed),
      this.hass.language
    );
  }

  lastUpdatedString(entity) {
    return formatDateTimeWithSeconds(
      new Date(entity.last_updated),
      this.hass.language
    );
  }

  formatAttributeValue(value) {
    if (
      (Array.isArray(value) && value.some((val) => val instanceof Object)) ||
      (!Array.isArray(value) && value instanceof Object)
    ) {
      return `\n${safeDump(value)}`;
    }
    return Array.isArray(value) ? value.join(", ") : value;
  }

  saveAttributeCheckboxState(ev) {
    try {
      localStorage.setItem("devToolsShowAttributes", ev.target.checked);
    } catch (e) {
      // Catch for Safari private mode
    }
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

  _computeRTL(hass) {
    return computeRTL(hass);
  }
}

customElements.define("developer-tools-state", HaPanelDevState);

import { addHours } from "date-fns/esm";
import "@material/mwc-button";
import {
  mdiClipboardTextMultipleOutline,
  mdiInformationOutline,
  mdiRefresh,
} from "@mdi/js";
import { html } from "@polymer/polymer/lib/utils/html-tag";
/* eslint-plugin-disable lit */
import { PolymerElement } from "@polymer/polymer/polymer-element";
import { dump, load } from "js-yaml";
import { formatDateTimeWithSeconds } from "../../../common/datetime/format_date_time";
import { computeRTL } from "../../../common/util/compute_rtl";
import { escapeRegExp } from "../../../common/string/escape_regexp";
import { copyToClipboard } from "../../../common/util/copy-clipboard";
import "../../../components/entity/ha-entity-picker";
import "../../../components/ha-code-editor";
import "../../../components/ha-icon-button";
import "../../../components/ha-svg-icon";
import "../../../components/ha-checkbox";
import "../../../components/ha-tip";
import "../../../components/search-input";
import "../../../components/ha-expansion-panel";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";
import { EventsMixin } from "../../../mixins/events-mixin";
import LocalizeMixin from "../../../mixins/localize-mixin";
import "../../../styles/polymer-ha-style";

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

        ha-textfield {
          display: block;
        }

        .state-input {
          margin-top: 16px;
        }

        ha-expansion-panel {
          margin: 0 8px 16px;
        }

        .inputs {
          width: 100%;
          max-width: 400px;
        }

        .info {
          padding: 0 16px;
        }

        .button-row {
          display: flex;
          margin-top: 8px;
          align-items: center;
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

        .filters th {
          padding: 0;
        }

        .filters search-input {
          display: block;
          --mdc-text-field-fill-color: transparent;
        }
        ha-tip {
          display: flex;
          padding: 8px 0;
        }

        th.attributes {
          position: relative;
        }

        th.attributes ha-checkbox {
          position: absolute;
          bottom: -8px;
        }

        :host([rtl]) .entities th {
          text-align: right;
          direction: rtl;
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
          flex-shrink: 0;
          margin-right: 8px;
        }
        .entities td:nth-child(1) {
          min-width: 300px;
          width: 30%;
        }
        .entities td:nth-child(3) {
          white-space: pre-wrap;
          word-break: break-word;
        }

        .entities a {
          color: var(--primary-color);
        }

        .entities .id-name-container {
          display: flex;
          flex-direction: column;
        }
        .entities .id-name-row {
          display: flex;
          align-items: center;
        }

        :host([narrow]) .state-wrapper {
          flex-direction: column;
        }

        :host([narrow]) .info {
          padding: 0;
        }
      </style>
      <h1>
        [[localize('ui.panel.developer-tools.tabs.states.current_entities')]]
      </h1>
      <ha-expansion-panel
        header="[[localize('ui.panel.developer-tools.tabs.states.set_state')]]"
        outlined
        expanded="[[_expanded]]"
        on-expanded-changed="expandedChanged"
      >
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
            <ha-tip>[[localize('ui.tips.key_e_hint')]]</ha-tip>
            <ha-textfield
              label="[[localize('ui.panel.developer-tools.tabs.states.state')]]"
              required
              autocapitalize="none"
              autocomplete="off"
              autocorrect="off"
              spellcheck="false"
              value="[[_state]]"
              on-change="stateChanged"
              class="state-input"
            ></ha-textfield>
            <p>
              [[localize('ui.panel.developer-tools.tabs.states.state_attributes')]]
            </p>
            <ha-code-editor
              mode="yaml"
              value="[[_stateAttributes]]"
              error="[[!validJSON]]"
              on-value-changed="_yamlChanged"
              dir="ltr"
            ></ha-code-editor>
            <div class="button-row">
              <mwc-button
                on-click="handleSetState"
                disabled="[[!validJSON]]"
                raised
                >[[localize('ui.panel.developer-tools.tabs.states.set_state')]]</mwc-button
              >
              <ha-icon-button
                on-click="entityIdChanged"
                label="[[localize('ui.common.refresh')]]"
                path="[[refreshIcon()]]"
              ></ha-icon-button>
            </div>
          </div>
          <div class="info">
            <template is="dom-if" if="[[_entity]]">
              <p>
                <b
                  >[[localize('ui.panel.developer-tools.tabs.states.last_changed')]]:</b
                ><br />
                <a href="[[historyFromLastChanged(_entity)]]"
                  >[[lastChangedString(_entity)]]</a
                >
              </p>
              <p>
                <b
                  >[[localize('ui.panel.developer-tools.tabs.states.last_updated')]]:</b
                ><br />
                <a href="[[historyFromLastUpdated(_entity)]]"
                  >[[lastUpdatedString(_entity)]]</a
                >
              </p>
            </template>
          </div>
        </div>
      </ha-expansion-panel>
      <div class="table-wrapper">
        <table class="entities">
          <tr>
            <th>[[localize('ui.panel.developer-tools.tabs.states.entity')]]</th>
            <th>[[localize('ui.panel.developer-tools.tabs.states.state')]]</th>
            <th hidden$="[[narrow]]" class="attributes">
              [[localize('ui.panel.developer-tools.tabs.states.attributes')]]
              <ha-checkbox
                checked="[[_showAttributes]]"
                on-change="saveAttributeCheckboxState"
                reducedTouchTarget
              ></ha-checkbox>
            </th>
          </tr>
          <tr class="filters">
            <th>
              <search-input
                label="[[localize('ui.panel.developer-tools.tabs.states.filter_entities')]]"
                value="[[_entityFilter]]"
                on-value-changed="_entityFilterChanged"
              ></search-input>
            </th>
            <th>
              <search-input
                label="[[localize('ui.panel.developer-tools.tabs.states.filter_states')]]"
                type="search"
                value="[[_stateFilter]]"
                on-value-changed="_stateFilterChanged"
              ></search-input>
            </th>
            <th hidden$="[[!computeShowAttributes(narrow, _showAttributes)]]">
              <search-input
                label="[[localize('ui.panel.developer-tools.tabs.states.filter_attributes')]]"
                type="search"
                value="[[_attributeFilter]]"
                on-value-changed="_attributeFilterChanged"
              ></search-input>
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
                <div class="id-name-container">
                  <div class="id-name-row">
                    <ha-svg-icon
                      on-click="copyEntity"
                      alt="[[localize('ui.panel.developer-tools.tabs.states.copy_id')]]"
                      title="[[localize('ui.panel.developer-tools.tabs.states.copy_id')]]"
                      path="[[clipboardOutlineIcon()]]"
                    ></ha-svg-icon>
                    <a href="#" on-click="entitySelected"
                      >[[entity.entity_id]]</a
                    >
                  </div>
                  <div class="id-name-row">
                    <ha-svg-icon
                      on-click="entityMoreInfo"
                      alt="[[localize('ui.panel.developer-tools.tabs.states.more_info')]]"
                      title="[[localize('ui.panel.developer-tools.tabs.states.more_info')]]"
                      path="[[informationOutlineIcon()]]"
                    ></ha-svg-icon>
                    <span class="secondary">
                      [[entity.attributes.friendly_name]]
                    </span>
                  </div>
                </div>
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

      _expanded: {
        type: Boolean,
        value: false,
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
    this._stateAttributes = dump(state.attributes);
    this._expanded = true;
    ev.preventDefault();
  }

  entityIdChanged() {
    if (!this._entityId) {
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
    this._stateAttributes = dump(state.attributes);
    this._expanded = true;
  }

  stateChanged(ev) {
    this._state = ev.target.value;
  }

  _entityFilterChanged(ev) {
    this._entityFilter = ev.detail.value;
  }

  _stateFilterChanged(ev) {
    this._stateFilter = ev.detail.value;
  }

  _attributeFilterChanged(ev) {
    this._attributeFilter = ev.detail.value;
  }

  _getHistoryURL(entityId, inputDate) {
    const date = new Date(inputDate);
    const hourBefore = addHours(date, -1).toISOString();
    return `/history?entity_id=${entityId}&start_date=${hourBefore}`;
  }

  historyFromLastChanged(entity) {
    return this._getHistoryURL(entity.entity_id, entity.last_changed);
  }

  historyFromLastUpdated(entity) {
    return this._getHistoryURL(entity.entity_id, entity.last_updated);
  }

  expandedChanged(ev) {
    this._expanded = ev.detail.expanded;
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

  refreshIcon() {
    return mdiRefresh;
  }

  computeEntities(hass, _entityFilter, _stateFilter, _attributeFilter) {
    const entityFilterRegExp =
      _entityFilter &&
      RegExp(escapeRegExp(_entityFilter).replace(/\\\*/g, ".*"), "i");

    const stateFilterRegExp =
      _stateFilter &&
      RegExp(escapeRegExp(_stateFilter).replace(/\\\*/g, ".*"), "i");

    let keyFilterRegExp;
    let valueFilterRegExp;
    let multiMode = false;

    if (_attributeFilter) {
      const colonIndex = _attributeFilter.indexOf(":");
      multiMode = colonIndex !== -1;

      const keyFilter = multiMode
        ? _attributeFilter.substring(0, colonIndex).trim()
        : _attributeFilter;
      const valueFilter = multiMode
        ? _attributeFilter.substring(colonIndex + 1).trim()
        : _attributeFilter;

      keyFilterRegExp = RegExp(
        escapeRegExp(keyFilter).replace(/\\\*/g, ".*"),
        "i"
      );
      valueFilterRegExp = multiMode
        ? RegExp(escapeRegExp(valueFilter).replace(/\\\*/g, ".*"), "i")
        : keyFilterRegExp;
    }

    return Object.values(hass.states)
      .filter((value) => {
        if (
          entityFilterRegExp &&
          !entityFilterRegExp.test(value.entity_id) &&
          (value.attributes.friendly_name === undefined ||
            !entityFilterRegExp.test(value.attributes.friendly_name))
        ) {
          return false;
        }

        if (stateFilterRegExp && !stateFilterRegExp.test(value.state)) {
          return false;
        }

        if (keyFilterRegExp && valueFilterRegExp) {
          for (const [key, attributeValue] of Object.entries(
            value.attributes
          )) {
            const match = keyFilterRegExp.test(key);
            if (match && !multiMode) {
              return true; // in single mode we're already satisfied with this match
            }
            if (!match && multiMode) {
              continue;
            }

            if (
              attributeValue !== undefined &&
              valueFilterRegExp.test(JSON.stringify(attributeValue))
            ) {
              return true;
            }
          }

          // there are no attributes where the key and/or value can be matched
          return false;
        }

        return true;
      })
      .sort((entityA, entityB) => {
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
      this.hass.locale
    );
  }

  lastUpdatedString(entity) {
    return formatDateTimeWithSeconds(
      new Date(entity.last_updated),
      this.hass.locale
    );
  }

  formatAttributeValue(value) {
    if (
      (Array.isArray(value) && value.some((val) => val instanceof Object)) ||
      (!Array.isArray(value) && value instanceof Object)
    ) {
      return `\n${dump(value)}`;
    }
    return Array.isArray(value) ? value.join(", ") : value;
  }

  saveAttributeCheckboxState(ev) {
    this._showAttributes = ev.target.checked;
    try {
      localStorage.setItem("devToolsShowAttributes", ev.target.checked);
    } catch (e) {
      // Catch for Safari private mode
    }
  }

  _computeParsedStateAttributes(stateAttributes) {
    try {
      return stateAttributes.trim() ? load(stateAttributes) : {};
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

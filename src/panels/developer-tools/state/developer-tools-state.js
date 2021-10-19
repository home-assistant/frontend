import {
  mdiClipboardTextMultipleOutline,
  mdiInformationOutline,
  mdiRefresh,
} from "@mdi/js";
import "@polymer/paper-checkbox/paper-checkbox";
import { html } from "@polymer/polymer/lib/utils/html-tag";
/* eslint-plugin-disable lit */
import { PolymerElement } from "@polymer/polymer/polymer-element";
import { dump } from "js-yaml";
import { computeRTL } from "../../../common/util/compute_rtl";
import { escapeRegExp } from "../../../common/string/escape_regexp";
import { copyToClipboard } from "../../../common/util/copy-clipboard";
import "../../../components/ha-icon-button";
import { EventsMixin } from "../../../mixins/events-mixin";
import LocalizeMixin from "../../../mixins/localize-mixin";
import "../../../styles/polymer-ha-style";

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
          padding: 4px;
        }

        .button-row {
          display: flex;
          margin-top: 8px;
          align-items: center;
        }

        table {
          width: 100%;
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
        .entities ha-icon-button {
          --mdc-icon-size: 20px;
          --mdc-icon-button-size: 28px;
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

      <table class="entities">
        <tr>
          <th>[[localize('ui.panel.developer-tools.tabs.states.entity')]]</th>
          <th>[[localize('ui.panel.developer-tools.tabs.states.state')]]</th>
          <th hidden$="[[narrow]]">
            [[localize('ui.panel.developer-tools.tabs.states.attributes')]]
            <paper-checkbox
              checked="{{_showAttributes}}"
              on-change="saveAttributeCheckboxState"
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
              <div class="id-name-row">
                <ha-icon-button
                  on-click="copyEntity"
                  alt="[[localize('ui.panel.developer-tools.tabs.states.copy_id')]]"
                  title="[[localize('ui.panel.developer-tools.tabs.states.copy_id')]]"
                  path="[[clipboardOutlineIcon()]]"
                ></ha-icon-button>
                [[entity.entity_id]]
              </div>
              <div class="id-name-row">
                <ha-icon-button
                  on-click="entityMoreInfo"
                  alt="[[localize('ui.panel.developer-tools.tabs.states.more_info')]]"
                  title="[[localize('ui.panel.developer-tools.tabs.states.more_info')]]"
                  path="[[informationOutlineIcon()]]"
                ></ha-icon-button>
                <span class="secondary">
                  [[entity.attributes.friendly_name]]
                </span>
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
    `;
  }

  static get properties() {
    return {
      hass: {
        type: Object,
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

  entityMoreInfo(ev) {
    ev.preventDefault();
    this.fire("hass-more-info", { entityId: ev.model.entity.entity_id });
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
    try {
      localStorage.setItem("devToolsShowAttributes", ev.target.checked);
    } catch (e) {
      // Catch for Safari private mode
    }
  }

  _computeRTL(hass) {
    return computeRTL(hass);
  }
}

customElements.define("developer-tools-state", HaPanelDevState);

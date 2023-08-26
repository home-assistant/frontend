import { addHours } from "date-fns/esm";
import "@material/mwc-button";
import {
  mdiClipboardTextMultipleOutline,
  mdiInformationOutline,
  mdiRefresh,
} from "@mdi/js";
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
import { CSSResultGroup, LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import { fireEvent } from "../../../common/dom/fire_event";

const ERROR_SENTINEL = {};

@customElement("developer-tools-state")
class HaPanelDevState extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _entityId: string = "";

  @state() private _entityFilter: string = "";

  @state() private _stateFilter: string = "";

  @state() private _attributeFilter: string = "";

  @state() private _entity?: object;

  @state() private _state: string = "";

  @state() private _stateAttributes: string = "";

  @state() private _expanded: boolean = false;

  @state() private _validJSON: boolean = true;

  @state() private _showAttributes =
    localStorage.getItem("devToolsShowAttributes") || true;

  @property({ reflect: true }) public narrow: boolean = true;

  @property({ reflect: true }) public rtl = computeRTL(this.hass);

  protected render() {
    const entities = this.computeEntities();

    return html`
      <h1>
        ${this.hass.localize(
          "ui.panel.developer-tools.tabs.states.current_entities"
        )}
      </h1>
      <ha-expansion-panel
        header=${this.hass.localize(
          "ui.panel.developer-tools.tabs.states.set_state"
        )}
        outlined
        expanded=${this._expanded}
        @expanded-changed=${this.expandedChanged}
      >
        <p>
          ${this.hass.localize(
            "ui.panel.developer-tools.tabs.states.description1"
          )}<br />
          ${this.hass.localize(
            "ui.panel.developer-tools.tabs.states.description2"
          )}
        </p>
        <div class="state-wrapper flex layout horizontal">
          <div class="inputs">
            <ha-entity-picker
              autofocus
              .hass=${this.hass}
              .value=${this._entityId}
              @change=${this.entityIdChanged}
              allow-custom-entity
              item-label-path="entity_id"
            ></ha-entity-picker>
            <ha-tip .hass=${this.hass}
              >${this.hass.localize("ui.tips.key_e_hint")}</ha-tip
            >
            <ha-textfield
              label=${this.hass.localize(
                "ui.panel.developer-tools.tabs.states.state"
              )}
              required
              autocapitalize="none"
              autocomplete="off"
              autocorrect="off"
              input-spellcheck="false"
              .value=${this._state}
              @change=${this.stateChanged}
              class="state-input"
            ></ha-textfield>
            <p>
              ${this.hass.localize(
                "ui.panel.developer-tools.tabs.states.state_attributes"
              )}
            </p>
            <ha-code-editor
              mode="yaml"
              .value=${this._stateAttributes}
              .error=${!this._validJSON}
              @value-changed=${this._yamlChanged}
              dir="ltr"
            ></ha-code-editor>
            <div class="button-row">
              <mwc-button
                @click=${this.handleSetState}
                .disabled=${!this._validJSON}
                raised
                >${this.hass.localize(
                  "ui.panel.developer-tools.tabs.states.set_state"
                )}</mwc-button
              >
              <ha-icon-button
                @click=${this.entityIdChanged}
                label=${this.hass.localize("ui.common.refresh")}
                path=${mdiRefresh}
              ></ha-icon-button>
            </div>
          </div>
          <div class="info">
            ${this._entity
              ? html`<p>
                    <b
                      >${this.hass.localize(
                        "ui.panel.developer-tools.tabs.states.last_changed"
                      )}:</b
                    ><br />
                    <a href=${this.historyFromLastChanged(this._entity)}
                      >${this.lastChangedString(this._entity)}</a
                    >
                  </p>
                  <p>
                    <b
                      >${this.hass.localize(
                        "ui.panel.developer-tools.tabs.states.last_updated"
                      )}:</b
                    ><br />
                    <a href=${this.historyFromLastUpdated(this._entity)}
                      >${this.lastUpdatedString(this._entity)}</a
                    >
                  </p>`
              : nothing}
          </div>
        </div>
      </ha-expansion-panel>
      <div class="table-wrapper">
        <table class="entities">
          <tr>
            <th>
              ${this.hass.localize(
                "ui.panel.developer-tools.tabs.states.entity"
              )}
            </th>
            <th>
              ${this.hass.localize(
                "ui.panel.developer-tools.tabs.states.state"
              )}
            </th>
            ${!this.narrow
              ? html`<th class="attributes">
                  ${this.hass.localize(
                    "ui.panel.developer-tools.tabs.states.attributes"
                  )}
                  <ha-checkbox
                    checked=${this._showAttributes}
                    @change=${this.saveAttributeCheckboxState}
                    reducedTouchTarget
                  ></ha-checkbox>
                </th>`
              : nothing}
          </tr>
          <tr class="filters">
            <th>
              <search-input
                label=${this.hass.localize(
                  "ui.panel.developer-tools.tabs.states.filter_entities"
                )}
                .value=${this._entityFilter}
                @value-changed=${this._entityFilterChanged}
              ></search-input>
            </th>
            <th>
              <search-input
                label=${this.hass.localize(
                  "ui.panel.developer-tools.tabs.states.filter_states"
                )}
                type="search"
                .value=${this._stateFilter}
                @value-changed=${this._stateFilterChanged}
              ></search-input>
            </th>
            ${this.computeShowAttributes(this.narrow, this._showAttributes)
              ? html`<th>
                  <search-input
                    label=${this.hass.localize(
                      "ui.panel.developer-tools.tabs.states.filter_attributes"
                    )}
                    type="search"
                    .value=${this._attributeFilter}
                    @value-changed=${this._attributeFilterChanged}
                  ></search-input>
                </th>`
              : nothing}
          </tr>
          ${this.computeShowEntitiesPlaceholder(entities)
            ? html`<tr>
                <td colspan="3">
                  ${this.hass.localize(
                    "ui.panel.developer-tools.tabs.states.no_entities"
                  )}
                </td>
              </tr>`
            : nothing}
          ${entities.map(
            (entity) =>
              html` <tr>
                <td>
                  <div class="id-name-container">
                    <div class="id-name-row">
                      <ha-svg-icon
                        @click=${this.copyEntity}
                        .entity=${entity}
                        alt="${this.hass.localize(
                          "ui.panel.developer-tools.tabs.states.copy_id"
                        )}"
                        title="${this.hass.localize(
                          "ui.panel.developer-tools.tabs.states.copy_id"
                        )}"
                        path=${mdiClipboardTextMultipleOutline}
                      ></ha-svg-icon>
                      <a
                        href="#"
                        .entity=${entity}
                        @click=${this.entitySelected}
                        >${entity.entity_id}</a
                      >
                    </div>
                    <div class="id-name-row">
                      <ha-svg-icon
                        @click=${this.entityMoreInfo}
                        .entity=${entity}
                        alt="${this.hass.localize(
                          "ui.panel.developer-tools.tabs.states.more_info"
                        )}"
                        title="${this.hass.localize(
                          "ui.panel.developer-tools.tabs.states.more_info"
                        )}"
                        path=${mdiInformationOutline}
                      ></ha-svg-icon>
                      <span class="secondary">
                        ${entity.attributes.friendly_name}
                      </span>
                    </div>
                  </div>
                </td>
                <td>${entity.state}</td>
                ${this.computeShowAttributes(this.narrow, this._showAttributes)
                  ? html`<td>${this.attributeString(entity)}</td>`
                  : nothing}
              </tr>`
          )}
        </table>
      </div>
    `;
  }

  copyEntity(ev) {
    ev.preventDefault();
    const entity = (ev.currentTarget! as any).entity;
    copyToClipboard(entity.entity_id);
  }

  entitySelected(ev) {
    const state = (ev.currentTarget! as any).entity;
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
    const entity = (ev.currentTarget! as any).entity;
    fireEvent(this, "hass-more-info", { entityId: entity.entity_id });
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
    const parsedJSON = this._computeParsedStateAttributes(
      this._stateAttributes
    );
    this.hass.callApi("POST", "states/" + this._entityId, {
      state: this._state,
      attributes: parsedJSON,
    });
  }

  computeEntities() {
    const entityFilterRegExp =
      this._entityFilter &&
      RegExp(escapeRegExp(this._entityFilter).replace(/\\\*/g, ".*"), "i");

    const stateFilterRegExp =
      this._stateFilter &&
      RegExp(escapeRegExp(this._stateFilter).replace(/\\\*/g, ".*"), "i");

    let keyFilterRegExp;
    let valueFilterRegExp;
    let multiMode = false;

    if (this._attributeFilter) {
      const colonIndex = this._attributeFilter.indexOf(":");
      multiMode = colonIndex !== -1;

      const keyFilter = multiMode
        ? this._attributeFilter.substring(0, colonIndex).trim()
        : this._attributeFilter;
      const valueFilter = multiMode
        ? this._attributeFilter.substring(colonIndex + 1).trim()
        : this._attributeFilter;

      keyFilterRegExp = RegExp(
        escapeRegExp(keyFilter).replace(/\\\*/g, ".*"),
        "i"
      );
      valueFilterRegExp = multiMode
        ? RegExp(escapeRegExp(valueFilter).replace(/\\\*/g, ".*"), "i")
        : keyFilterRegExp;
    }

    return Object.values(this.hass.states)
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
    console.log(_entities);
    return _entities.length === 0;
  }

  computeShowAttributes(narrow, _showAttributes) {
    return !narrow && _showAttributes;
  }

  attributeString(entity) {
    let output = "";

    if (entity && entity.attributes) {
      Object.keys(entity.attributes).map((key) => {
        output += `${key}: ${entity.attributes[key]}\n`;
      });
    }

    return output;
  }

  lastChangedString(entity) {
    return formatDateTimeWithSeconds(
      new Date(entity.last_changed),
      this.hass.locale,
      this.hass.config
    );
  }

  lastUpdatedString(entity) {
    return formatDateTimeWithSeconds(
      new Date(entity.last_updated),
      this.hass.locale,
      this.hass.config
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
    this._validJSON = this._computeValidJSON(this._stateAttributes);
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          -ms-user-select: initial;
          -webkit-user-select: initial;
          -moz-user-select: initial;
          display: block;
          padding: 16px;
          padding: max(16px, env(safe-area-inset-top))
            max(16px, env(safe-area-inset-right))
            max(16px, env(safe-area-inset-bottom))
            max(16px, env(safe-area-inset-left));
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
          max-width: 800px;
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

        :host([rtl]) .filters {
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "developer-tools-state": HaPanelDevState;
  }
}

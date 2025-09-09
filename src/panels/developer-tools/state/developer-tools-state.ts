import { mdiContentCopy, mdiRefresh } from "@mdi/js";
import { addHours } from "date-fns";
import type {
  HassEntities,
  HassEntity,
  HassEntityAttributeBase,
} from "home-assistant-js-websocket";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { formatDateTimeWithSeconds } from "../../../common/datetime/format_date_time";
import { storage } from "../../../common/decorators/storage";
import { escapeRegExp } from "../../../common/string/escape_regexp";
import { copyToClipboard } from "../../../common/util/copy-clipboard";
import "../../../components/entity/ha-entity-picker";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-checkbox";
import "../../../components/ha-expansion-panel";
import "../../../components/ha-icon-button";
import "../../../components/ha-input-helper-text";
import "../../../components/ha-svg-icon";
import "../../../components/ha-tip";
import "../../../components/ha-yaml-editor";
import type { HaYamlEditor } from "../../../components/ha-yaml-editor";
import "../../../components/search-input";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { showToast } from "../../../util/toast";
import "./developer-tools-state-renderer";

// Use virtualizer after threshold to avoid performance issues
// NOTE: If virtualizer is used when filtered entiity state
// array size is 1, the virtualizer will scroll up the page on
// render updates until the view matches to near the top of the
// virtualized list, an undesirable effect.
const VIRTUALIZE_THRESHOLD = 100;

@customElement("developer-tools-state")
class HaPanelDevState extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _error = "";

  @state() private _entityId = "";

  @state() private _entityFilter = "";

  @state() private _stateFilter = "";

  @state() private _attributeFilter = "";

  @state() private _entity?: HassEntity;

  @state() private _state = "";

  @state() private _stateAttributes: HassEntityAttributeBase &
    Record<string, any> = {};

  @state() private _expanded = false;

  @state() private _validJSON = true;

  @state()
  @storage({
    key: "devToolsShowAttributes",
    state: true,
  })
  private _showAttributes = true;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @query("ha-yaml-editor") private _yamlEditor?: HaYamlEditor;

  private _filteredEntities = memoizeOne(
    (
      entityFilter: string,
      stateFilter: string,
      attributeFilter: string,
      states: HassEntities
    ): HassEntity[] =>
      this._applyFiltersOnEntities(
        entityFilter,
        stateFilter,
        attributeFilter,
        states
      )
  );

  protected render() {
    const entities = this._filteredEntities(
      this._entityFilter,
      this._stateFilter,
      this._attributeFilter,
      this.hass.states
    );

    return html`
      <div class="heading">
        <h1>
          ${this.hass.localize(
            "ui.panel.developer-tools.tabs.states.current_entities"
          )}
        </h1>
        ${!this.narrow
          ? html` <ha-formfield
              .label=${this.hass.localize(
                "ui.panel.developer-tools.tabs.states.attributes"
              )}
            >
              <ha-checkbox
                .checked=${this._showAttributes}
                @change=${this._saveAttributeCheckboxState}
                reducedTouchTarget
              ></ha-checkbox>
            </ha-formfield>`
          : nothing}
      </div>
      <ha-expansion-panel
        .header=${this.hass.localize(
          "ui.panel.developer-tools.tabs.states.set_state"
        )}
        outlined
        .expanded=${this._expanded}
        @expanded-changed=${this._expandedChanged}
      >
        <p>
          ${this.hass.localize(
            "ui.panel.developer-tools.tabs.states.description1"
          )}<br />
          ${this.hass.localize(
            "ui.panel.developer-tools.tabs.states.description2"
          )}
        </p>
        ${this._error
          ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
          : nothing}
        <div class="state-wrapper flex-horizontal">
          <div class="inputs">
            <ha-entity-picker
              autofocus
              .hass=${this.hass}
              .value=${this._entityId}
              @value-changed=${this._entityIdChanged}
              allow-custom-entity
              show-entity-id
            ></ha-entity-picker>
            ${this._entityId
              ? html`
                  <div class="entity-id">
                    <span>${this._entityId}</span>
                    <ha-icon-button
                      .path=${mdiContentCopy}
                      @click=${this._copyStateEntity}
                      title=${this.hass.localize(
                        "ui.panel.developer-tools.tabs.states.copy_id"
                      )}
                    ></ha-icon-button>
                  </div>
                `
              : nothing}
            <ha-textfield
              .label=${this.hass.localize(
                "ui.panel.developer-tools.tabs.states.state"
              )}
              required
              autocapitalize="none"
              autocomplete="off"
              .autocorrect=${false}
              input-spellcheck="false"
              .value=${this._state}
              @change=${this._stateChanged}
              class="state-input"
            ></ha-textfield>
            <p>
              ${this.hass.localize(
                "ui.panel.developer-tools.tabs.states.state_attributes"
              )}
            </p>
            <ha-yaml-editor
              .value=${this._stateAttributes}
              .error=${!this._validJSON}
              @value-changed=${this._yamlChanged}
              dir="ltr"
            ></ha-yaml-editor>
            <div class="button-row">
              <ha-button
                @click=${this._handleSetState}
                .disabled=${!this._validJSON}
                raised
                >${this.hass.localize(
                  "ui.panel.developer-tools.tabs.states.set_state"
                )}</ha-button
              >
              <ha-icon-button
                @click=${this._updateEntity}
                .label=${this.hass.localize("ui.common.refresh")}
                .path=${mdiRefresh}
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
                    <a href=${this._historyFromLastChanged(this._entity)}
                      >${this._lastChangedString(this._entity)}</a
                    >
                  </p>
                  <p>
                    <b
                      >${this.hass.localize(
                        "ui.panel.developer-tools.tabs.states.last_updated"
                      )}:</b
                    ><br />
                    <a href=${this._historyFromLastUpdated(this._entity)}
                      >${this._lastUpdatedString(this._entity)}</a
                    >
                  </p>`
              : nothing}
          </div>
        </div>
      </ha-expansion-panel>
      <developer-tools-state-renderer
        .hass=${this.hass}
        .narrow=${this.narrow}
        .entities=${entities}
        .virtualize=${entities.length > VIRTUALIZE_THRESHOLD}
        .showAttributes=${this._showAttributes}
        @states-tool-entity-selected=${this._entitySelected}
      >
        <search-input
          slot="filter-entities"
          .hass=${this.hass}
          .label=${this.hass.localize(
            "ui.panel.developer-tools.tabs.states.filter_entities"
          )}
          .value=${this._entityFilter}
          @value-changed=${this._entityFilterChanged}
        ></search-input>
        <search-input
          slot="filter-states"
          .hass=${this.hass}
          .label=${this.hass.localize(
            "ui.panel.developer-tools.tabs.states.filter_states"
          )}
          type="search"
          .value=${this._stateFilter}
          @value-changed=${this._stateFilterChanged}
        ></search-input>
        <search-input
          slot="filter-attributes"
          .hass=${this.hass}
          .label=${this.hass.localize(
            "ui.panel.developer-tools.tabs.states.filter_attributes"
          )}
          type="search"
          .value=${this._attributeFilter}
          @value-changed=${this._attributeFilterChanged}
        ></search-input>
      </developer-tools-state-renderer>
    `;
  }

  private async _copyStateEntity(ev) {
    ev.preventDefault();
    await copyToClipboard(this._entityId);
    showToast(this, {
      message: this.hass.localize("ui.common.copied_clipboard"),
    });
  }

  private _entitySelected(ev) {
    const entityState: HassEntity = ev.detail.entity;
    this._entityId = entityState.entity_id;
    this._entity = entityState;
    this._state = entityState.state;
    this._stateAttributes = entityState.attributes;
    this._updateEditor();
    this._expanded = true;
    ev.preventDefault();
    window.scrollTo({ top: 0 });
  }

  private _updateEditor() {
    this._yamlEditor?.setValue(this._stateAttributes);
  }

  private _entityIdChanged(ev: CustomEvent) {
    this._entityId = ev.detail.value;
    this._updateEntity();
  }

  private _updateEntity() {
    const entityState = this._entityId
      ? this.hass.states[this._entityId]
      : undefined;
    if (!entityState) {
      this._entity = undefined;
      this._state = "";
      this._stateAttributes = {};
      this._updateEditor();
      return;
    }
    this._entity = entityState;
    this._state = entityState.state;
    this._stateAttributes = entityState.attributes;
    this._updateEditor();
    this._expanded = true;
  }

  private _stateChanged(ev) {
    this._state = ev.target.value;
  }

  private _entityFilterChanged(ev) {
    this._entityFilter = ev.detail.value;
  }

  private _stateFilterChanged(ev) {
    this._stateFilter = ev.detail.value;
  }

  private _attributeFilterChanged(ev) {
    this._attributeFilter = ev.detail.value;
  }

  private _getHistoryURL(entityId, inputDate) {
    const date = new Date(inputDate);
    const hourBefore = addHours(date, -1).toISOString();
    return `/history?entity_id=${entityId}&start_date=${hourBefore}`;
  }

  private _historyFromLastChanged(entity) {
    return this._getHistoryURL(entity.entity_id, entity.last_changed);
  }

  private _historyFromLastUpdated(entity) {
    return this._getHistoryURL(entity.entity_id, entity.last_updated);
  }

  private _expandedChanged(ev) {
    this._expanded = ev.detail.expanded;
    if (!ev.detail.expanded) {
      // lit-virtulizer in state renderer will not show items
      // if none were in view when panel was expanded
      // so we fire scroll event to trigger a re-render
      setTimeout(() => {
        window.dispatchEvent(new Event("scroll"));
      }, 100);
    }
  }

  private async _handleSetState() {
    this._error = "";
    if (!this._entityId) {
      showAlertDialog(this, {
        text: this.hass.localize(
          "ui.panel.developer-tools.tabs.states.alert_entity_field"
        ),
      });
      return;
    }
    this._updateEditor();
    try {
      await this.hass.callApi("POST", "states/" + this._entityId, {
        state: this._state,
        attributes: this._stateAttributes,
      });
    } catch (e: any) {
      this._error = e.body?.message || "Unknown error";
    }
  }

  private _applyFiltersOnEntities(
    entityFilter: string,
    stateFilter: string,
    attributeFilter: string,
    states: HassEntities
  ) {
    const entityFilterRegExp =
      entityFilter &&
      RegExp(escapeRegExp(entityFilter).replace(/\\\*/g, ".*"), "i");

    const stateFilterRegExp =
      stateFilter &&
      RegExp(escapeRegExp(stateFilter).replace(/\\\*/g, ".*"), "i");

    let keyFilterRegExp;
    let valueFilterRegExp;
    let multiMode = false;

    if (attributeFilter) {
      const colonIndex = attributeFilter.indexOf(":");
      multiMode = colonIndex !== -1;

      const keyFilter = multiMode
        ? attributeFilter.substring(0, colonIndex).trim()
        : attributeFilter;
      const valueFilter = multiMode
        ? attributeFilter.substring(colonIndex + 1).trim()
        : attributeFilter;

      keyFilterRegExp = RegExp(
        escapeRegExp(keyFilter).replace(/\\\*/g, ".*"),
        "i"
      );
      valueFilterRegExp = multiMode
        ? RegExp(escapeRegExp(valueFilter).replace(/\\\*/g, ".*"), "i")
        : keyFilterRegExp;
    }

    return Object.values(states)
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

  private _lastChangedString(entity) {
    return formatDateTimeWithSeconds(
      new Date(entity.last_changed),
      this.hass.locale,
      this.hass.config
    );
  }

  private _lastUpdatedString(entity) {
    return formatDateTimeWithSeconds(
      new Date(entity.last_updated),
      this.hass.locale,
      this.hass.config
    );
  }

  private _saveAttributeCheckboxState(ev) {
    this._showAttributes = ev.target.checked;
  }

  private _yamlChanged(ev) {
    this._stateAttributes = ev.detail.value;
    this._validJSON = ev.detail.isValid;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          display: block;
          height: 100%;
        }

        :host {
          -ms-user-select: initial;
          -webkit-user-select: initial;
          -moz-user-select: initial;
          display: block;
          padding: 16px;
          padding: 16px max(16px, var(--safe-area-inset-right))
            max(16px, var(--safe-area-inset-bottom))
            max(16px, var(--safe-area-inset-left));
        }

        :host search-input {
          display: block;
          width: 100%;
        }

        ha-textfield {
          display: block;
        }

        .heading {
          display: flex;
          justify-content: space-between;
        }

        .heading ha-formfield {
          margin-right: 8px;
          --mdc-typography-body2-font-size: var(--ha-font-size-m);
          --mdc-typography-body2-font-weight: var(--ha-font-weight-medium);
        }

        .entity-id {
          display: block;
          font-family: var(--ha-font-family-code);
          color: var(--secondary-text-color);
          padding: 0 8px;
          margin-bottom: 8px;
          margin-top: 4px;
          font-size: var(--ha-font-size-s);
          --mdc-icon-size: 14px;
          --mdc-icon-button-size: 24px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .entity-id ha-icon-button {
          flex: none;
        }

        .entity-id span {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .state-input {
          margin-top: 16px;
        }

        ha-expansion-panel {
          margin: 0 8px 16px;
        }

        ha-expansion-panel p {
          padding: 0 8px;
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
          margin: 8px 0;
          align-items: center;
          gap: 8px;
        }

        :host([narrow]) .state-wrapper {
          flex-direction: column;
        }

        :host([narrow]) .info {
          padding: 0;
        }

        .flex-horizontal {
          display: flex;
          flex-direction: row;
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

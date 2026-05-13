import { mdiContentCopy, mdiRefresh } from "@mdi/js";
import { consume, type ContextType } from "@lit/context";
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
import { formatDateTimeWithSeconds } from "../../../../common/datetime/format_date_time";
import { storage } from "../../../../common/decorators/storage";
import { escapeRegExp } from "../../../../common/string/escape_regexp";
import { computeAreaName } from "../../../../common/entity/compute_area_name";
import { computeDeviceName } from "../../../../common/entity/compute_device_name";
import { copyToClipboard } from "../../../../common/util/copy-clipboard";
import "../../../../components/entity/ha-entity-picker";
import "../../../../components/ha-alert";
import "../../../../components/ha-button";
import "../../../../components/ha-checkbox";
import "../../../../components/ha-expansion-panel";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-input-helper-text";
import "../../../../components/ha-svg-icon";
import "../../../../components/ha-tip";
import "../../../../components/ha-yaml-editor";
import type { HaYamlEditor } from "../../../../components/ha-yaml-editor";
import "../../../../components/input/ha-input";
import type { HaInput } from "../../../../components/input/ha-input";
import "../../../../components/input/ha-input-search";
import type { HaInputSearch } from "../../../../components/input/ha-input-search";
import {
  apiContext,
  configContext,
  internationalizationContext,
  registriesContext,
  statesContext,
} from "../../../../data/context";
import { showAlertDialog } from "../../../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant, HomeAssistantRegistries } from "../../../../types";
import { showToast } from "../../../../util/toast";
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

  @state() private _deviceFilter = "";

  @state() private _areaFilter = "";

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

  @state()
  @consume({ context: apiContext, subscribe: true })
  private _api!: ContextType<typeof apiContext>;

  @state()
  @consume({ context: configContext, subscribe: true })
  private _config!: ContextType<typeof configContext>;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @state()
  @consume({ context: registriesContext, subscribe: true })
  private _registries!: ContextType<typeof registriesContext>;

  @state()
  @consume({ context: statesContext, subscribe: true })
  private _states!: ContextType<typeof statesContext>;

  @query("ha-yaml-editor") private _yamlEditor?: HaYamlEditor;

  private _filteredEntities = memoizeOne(
    (
      entityFilter: string,
      stateFilter: string,
      attributeFilter: string,
      deviceFilter: string,
      areaFilter: string,
      states: HassEntities,
      entities: HomeAssistantRegistries["entities"],
      devices: HomeAssistantRegistries["devices"],
      areas: HomeAssistantRegistries["areas"]
    ): HassEntity[] =>
      this._applyFiltersOnEntities(
        entityFilter,
        stateFilter,
        attributeFilter,
        deviceFilter,
        areaFilter,
        states,
        entities,
        devices,
        areas
      )
  );

  protected render() {
    const entities = this._filteredEntities(
      this._entityFilter,
      this._stateFilter,
      this._attributeFilter,
      this._deviceFilter,
      this._areaFilter,
      this._states,
      this._registries.entities,
      this._registries.devices,
      this._registries.areas
    );

    return html`
      <div class="heading">
        <h1>
          ${this._i18n.localize(
            "ui.panel.config.developer-tools.tabs.states.current_entities"
          )}
        </h1>
        ${!this.narrow
          ? html`<ha-checkbox
              .checked=${this._showAttributes}
              @change=${this._saveAttributeCheckboxState}
            >
              ${this._i18n.localize(
                "ui.panel.config.developer-tools.tabs.states.attributes"
              )}
            </ha-checkbox>`
          : nothing}
      </div>
      <ha-expansion-panel
        .header=${this._i18n.localize(
          "ui.panel.config.developer-tools.tabs.states.set_state"
        )}
        outlined
        .expanded=${this._expanded}
        @expanded-changed=${this._expandedChanged}
      >
        <p>
          ${this._i18n.localize(
            "ui.panel.config.developer-tools.tabs.states.description1"
          )}<br />
          ${this._i18n.localize(
            "ui.panel.config.developer-tools.tabs.states.description2"
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
              show-entity-id
            ></ha-entity-picker>
            ${this._entityId
              ? html`
                  <div class="entity-id">
                    <span>${this._entityId}</span>
                    <ha-icon-button
                      .path=${mdiContentCopy}
                      @click=${this._copyStateEntity}
                      title=${this._i18n.localize(
                        "ui.panel.config.developer-tools.tabs.states.copy_id"
                      )}
                    ></ha-icon-button>
                  </div>
                `
              : nothing}
            <ha-input
              .label=${this._i18n.localize(
                "ui.panel.config.developer-tools.tabs.states.state"
              )}
              required
              autocapitalize="none"
              autocomplete="off"
              .autocorrect=${false}
              .spellcheck=${false}
              .value=${this._state}
              @change=${this._stateChanged}
              class="state-input"
            ></ha-input>
            <p>
              ${this._i18n.localize(
                "ui.panel.config.developer-tools.tabs.states.state_attributes"
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
                >${this._i18n.localize(
                  "ui.panel.config.developer-tools.tabs.states.set_state"
                )}</ha-button
              >
              <ha-icon-button
                @click=${this._updateEntity}
                .label=${this._i18n.localize("ui.common.refresh")}
                .path=${mdiRefresh}
              ></ha-icon-button>
            </div>
          </div>
          <div class="info">
            ${this._entity
              ? html`<p>
                    <b
                      >${this._i18n.localize(
                        "ui.panel.config.developer-tools.tabs.states.last_changed"
                      )}:</b
                    ><br />
                    <a href=${this._historyFromLastChanged(this._entity)}
                      >${this._lastChangedString(this._entity)}</a
                    >
                  </p>
                  <p>
                    <b
                      >${this._i18n.localize(
                        "ui.panel.config.developer-tools.tabs.states.last_updated"
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
        .narrow=${this.narrow}
        .entities=${entities}
        .virtualize=${entities.length > VIRTUALIZE_THRESHOLD}
        .showAttributes=${this._showAttributes}
        @states-tool-entity-selected=${this._entitySelected}
      >
        <ha-input-search
          slot="filter-entities"
          .label=${this._i18n.localize(
            "ui.panel.config.developer-tools.tabs.states.filter_entities"
          )}
          .value=${this._entityFilter}
          @input=${this._entityFilterChanged}
        ></ha-input-search>
        <ha-input-search
          slot="filter-states"
          .label=${this._i18n.localize(
            "ui.panel.config.developer-tools.tabs.states.filter_states"
          )}
          type="search"
          .value=${this._stateFilter}
          @input=${this._stateFilterChanged}
        ></ha-input-search>
        <ha-input-search
          slot="filter-devices"
          .label=${this._i18n.localize(
            "ui.panel.config.entities.picker.headers.device"
          )}
          type="search"
          .value=${this._deviceFilter}
          @input=${this._deviceFilterChanged}
        ></ha-input-search>
        <ha-input-search
          slot="filter-areas"
          .label=${this._i18n.localize("ui.panel.config.generic.headers.area")}
          type="search"
          .value=${this._areaFilter}
          @input=${this._areaFilterChanged}
        ></ha-input-search>
        <ha-input-search
          slot="filter-attributes"
          .label=${this._i18n.localize(
            "ui.panel.config.developer-tools.tabs.states.filter_attributes"
          )}
          type="search"
          .value=${this._attributeFilter}
          @input=${this._attributeFilterChanged}
        ></ha-input-search>
      </developer-tools-state-renderer>
    `;
  }

  private async _copyStateEntity(ev) {
    ev.preventDefault();
    await copyToClipboard(this._entityId);
    showToast(this, {
      message: this._i18n.localize("ui.common.copied_clipboard"),
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
      ? this._states[this._entityId]
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

  private _stateChanged(ev: InputEvent) {
    this._state = (ev.target as HaInput).value ?? "";
  }

  private _entityFilterChanged(ev: InputEvent) {
    this._entityFilter = (ev.target as HaInputSearch).value ?? "";
  }

  private _stateFilterChanged(ev: InputEvent) {
    this._stateFilter = (ev.target as HaInputSearch).value ?? "";
  }

  private _attributeFilterChanged(ev: InputEvent) {
    this._attributeFilter = (ev.target as HaInputSearch).value ?? "";
  }

  private _deviceFilterChanged(ev: InputEvent) {
    this._deviceFilter = (ev.target as HaInputSearch).value ?? "";
  }

  private _areaFilterChanged(ev: InputEvent) {
    this._areaFilter = (ev.target as HaInputSearch).value ?? "";
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
        text: this._i18n.localize(
          "ui.panel.config.developer-tools.tabs.states.alert_entity_field"
        ),
      });
      return;
    }
    this._updateEditor();
    try {
      await this._api.callApi("POST", "states/" + this._entityId, {
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
    deviceFilter: string,
    areaFilter: string,
    states: HassEntities,
    entities: HomeAssistantRegistries["entities"],
    devices: HomeAssistantRegistries["devices"],
    areas: HomeAssistantRegistries["areas"]
  ) {
    const entityFilterRegExp =
      entityFilter &&
      RegExp(escapeRegExp(entityFilter).replace(/\\\*/g, ".*"), "i");

    const stateFilterRegExp =
      stateFilter &&
      RegExp(escapeRegExp(stateFilter).replace(/\\\*/g, ".*"), "i");

    const deviceFilterRegExp =
      deviceFilter &&
      RegExp(escapeRegExp(deviceFilter).replace(/\\\*/g, ".*"), "i");

    const areaFilterRegExp =
      areaFilter &&
      RegExp(escapeRegExp(areaFilter).replace(/\\\*/g, ".*"), "i");

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

        if (deviceFilterRegExp) {
          const entry = entities[value.entity_id];
          const device = entry?.device_id
            ? devices[entry.device_id]
            : undefined;
          const deviceName = device ? computeDeviceName(device) : undefined;
          if (!deviceName || !deviceFilterRegExp.test(deviceName)) {
            return false;
          }
        }

        if (areaFilterRegExp) {
          const entry = entities[value.entity_id];
          const device = entry?.device_id
            ? devices[entry.device_id]
            : undefined;
          const areaId = entry?.area_id || device?.area_id;
          const area = areaId ? areas[areaId] : undefined;
          const areaName = area ? computeAreaName(area) : undefined;
          if (!areaName || !areaFilterRegExp.test(areaName)) {
            return false;
          }
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
      this._i18n.locale,
      this._config.config
    );
  }

  private _lastUpdatedString(entity) {
    return formatDateTimeWithSeconds(
      new Date(entity.last_updated),
      this._i18n.locale,
      this._config.config
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
          padding: var(--ha-space-4);
        }

        :host ha-input-search {
          width: 100%;
          --ha-input-padding-bottom: 0;
        }

        .heading {
          display: flex;
          justify-content: space-between;
        }

        .heading ha-checkbox {
          margin-right: var(--ha-space-2);
          justify-content: center;
        }

        .entity-id {
          display: block;
          font-family: var(--ha-font-family-code);
          color: var(--secondary-text-color);
          padding: 0 var(--ha-space-2);
          margin-bottom: var(--ha-space-2);
          margin-top: var(--ha-space-1);
          font-size: var(--ha-font-size-s);
          --mdc-icon-size: 14px;
          --ha-icon-button-size: 24px;
          display: flex;
          align-items: center;
          gap: var(--ha-space-2);
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
          margin-top: var(--ha-space-4);
        }

        ha-expansion-panel {
          margin: 0 var(--ha-space-2) var(--ha-space-4);
        }

        ha-expansion-panel p {
          padding: 0 var(--ha-space-2);
        }

        .inputs {
          width: 100%;
          max-width: 800px;
        }

        .info {
          padding: 0 var(--ha-space-4);
        }

        .button-row {
          display: flex;
          margin: var(--ha-space-2) 0;
          align-items: center;
          gap: var(--ha-space-2);
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

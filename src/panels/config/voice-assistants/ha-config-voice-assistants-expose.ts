import { consume } from "@lit/context";
import {
  mdiCloseBoxMultiple,
  mdiCloseCircleOutline,
  mdiPlus,
  mdiPlusBoxMultiple,
} from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import memoize from "memoize-one";
import type { HASSDomEvent } from "../../../common/dom/fire_event";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeStateName } from "../../../common/entity/compute_state_name";
import type { EntityDomainFilter } from "../../../common/entity/entity_domain_filter";
import {
  generateEntityDomainFilter,
  isEmptyEntityDomainFilter,
} from "../../../common/entity/entity_domain_filter";
import { navigate } from "../../../common/navigate";
import type {
  DataTableColumnContainer,
  DataTableRowData,
  RowClickedEvent,
  SelectionChangedEvent,
  SortingChangedEvent,
} from "../../../components/data-table/ha-data-table";
import "../../../components/ha-fab";
import "../../../components/ha-tooltip";
import type { AlexaEntity } from "../../../data/alexa";
import { fetchCloudAlexaEntities } from "../../../data/alexa";
import type { CloudStatus, CloudStatusLoggedIn } from "../../../data/cloud";
import { entitiesContext } from "../../../data/context";
import type { ExtEntityRegistryEntry } from "../../../data/entity_registry";
import { getExtendedEntityRegistryEntries } from "../../../data/entity_registry";
import type { ExposeEntitySettings } from "../../../data/expose";
import { exposeEntities, voiceAssistants } from "../../../data/expose";
import type { GoogleEntity } from "../../../data/google_assistant";
import { fetchCloudGoogleEntities } from "../../../data/google_assistant";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-loading-screen";
import "../../../layouts/hass-tabs-subpage-data-table";
import type { HaTabsSubpageDataTable } from "../../../layouts/hass-tabs-subpage-data-table";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant, Route } from "../../../types";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "./expose/expose-assistant-icon";
import { voiceAssistantTabs } from "./ha-config-voice-assistants";
import { showExposeEntityDialog } from "./show-dialog-expose-entity";
import { showVoiceSettingsDialog } from "./show-dialog-voice-settings";
import { storage } from "../../../common/decorators/storage";
import { domainToName } from "../../../data/integration";
import { computeDomain } from "../../../common/entity/compute_domain";

@customElement("ha-config-voice-assistants-expose")
export class VoiceAssistantsExpose extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public cloudStatus?: CloudStatus;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  @property({ attribute: false }) public exposedEntities?: Record<
    string,
    ExposeEntitySettings
  >;

  @state()
  @consume({ context: entitiesContext, subscribe: true })
  _entities!: HomeAssistant["entities"];

  @state() private _extEntities?: Record<string, ExtEntityRegistryEntry>;

  @state()
  @storage({
    storage: "sessionStorage",
    key: "voice-expose-table-search",
    state: true,
    subscribe: false,
  })
  private _filter = "";

  @state() private _searchParms = new URLSearchParams(window.location.search);

  @state() private _selectedEntities: string[] = [];

  @state() private _supportedEntities?: Record<
    "cloud.google_assistant" | "cloud.alexa" | "conversation",
    string[] | undefined
  >;

  @storage({
    key: "voice-expose-table-sort",
    state: false,
    subscribe: false,
  })
  private _activeSorting?: SortingChangedEvent;

  @storage({
    key: "voice-expose-table-grouping",
    state: false,
    subscribe: false,
  })
  private _activeGrouping?: string;

  @storage({
    key: "voice-expose-table-collapsed",
    state: false,
    subscribe: false,
  })
  private _activeCollapsed?: string;

  @storage({
    key: "voice-expose-table-column-order",
    state: false,
    subscribe: false,
  })
  private _activeColumnOrder?: string[];

  @storage({
    key: "voice-expose-table-hidden-columns",
    state: false,
    subscribe: false,
  })
  private _activeHiddenColumns?: string[];

  @query("hass-tabs-subpage-data-table", true)
  private _dataTable!: HaTabsSubpageDataTable;

  private _columns = memoize(
    (
      narrow: boolean,
      availableAssistants: string[],
      supportedEntities:
        | Record<
            "cloud.google_assistant" | "cloud.alexa" | "conversation",
            string[] | undefined
          >
        | undefined,
      _language: string,
      localize: LocalizeFunc
    ): DataTableColumnContainer => ({
      icon: {
        title: "",
        label: localize("ui.panel.config.voice_assistants.expose.headers.icon"),
        type: "icon",
        moveable: false,
        hidden: narrow,
        template: (entry) => html`
          <ha-state-icon
            title=${ifDefined(entry.entity?.state)}
            .stateObj=${entry.entity}
            .hass=${this.hass}
          ></ha-state-icon>
        `,
      },
      name: {
        main: true,
        title: localize("ui.panel.config.voice_assistants.expose.headers.name"),
        sortable: true,
        filterable: true,
        direction: "asc",
        flex: 2,
        template: narrow
          ? undefined
          : (entry) => html`
              ${entry.name}<br />
              <div class="secondary">${entry.entity_id}</div>
            `,
      },
      // For search & narrow
      entity_id: {
        title: localize(
          "ui.panel.config.voice_assistants.expose.headers.entity_id"
        ),
        hidden: !narrow,
        filterable: true,
      },
      domain: {
        title: localize(
          "ui.panel.config.voice_assistants.expose.headers.domain"
        ),
        sortable: false,
        hidden: true,
        filterable: true,
        groupable: true,
      },
      area: {
        title: localize("ui.panel.config.voice_assistants.expose.headers.area"),
        sortable: true,
        groupable: true,
        filterable: true,
      },
      assistants: {
        title: localize(
          "ui.panel.config.voice_assistants.expose.headers.assistants"
        ),
        showNarrow: true,
        sortable: true,
        filterable: true,
        minWidth: "160px",
        maxWidth: "160px",
        type: "flex",
        template: (entry) =>
          html`${availableAssistants.map((key) => {
            const supported =
              !supportedEntities?.[key] ||
              supportedEntities[key].includes(entry.entity_id);
            const manual = entry.manAssistants?.includes(key);
            return entry.assistants.includes(key)
              ? html`
                  <voice-assistants-expose-assistant-icon
                    .assistant=${key}
                    .hass=${this.hass}
                    .manual=${manual}
                    .unsupported=${!supported}
                  >
                  </voice-assistants-expose-assistant-icon>
                `
              : html`<div style="width: 40px;"></div>`;
          })}`,
      },
      aliases: {
        title: localize(
          "ui.panel.config.voice_assistants.expose.headers.aliases"
        ),
        sortable: true,
        filterable: true,
        template: (entry) =>
          entry.aliases.length === 0
            ? "-"
            : entry.aliases.length === 1
              ? entry.aliases[0]
              : this.hass.localize(
                  "ui.panel.config.voice_assistants.expose.aliases",
                  { count: entry.aliases.length }
                ),
      },
      remove: {
        title: "",
        label: localize(
          "ui.panel.config.voice_assistants.expose.headers.remove"
        ),
        type: "icon-button",
        hidden: narrow,
        template: () =>
          html`<ha-icon-button
            @click=${this._removeEntity}
            .path=${mdiCloseCircleOutline}
          ></ha-icon-button>`,
      },
    })
  );

  private _getEntityFilterFuncs = memoize(
    (googleFilter: EntityDomainFilter, alexaFilter: EntityDomainFilter) => ({
      google: generateEntityDomainFilter(
        googleFilter.include_domains,
        googleFilter.include_entities,
        googleFilter.exclude_domains,
        googleFilter.exclude_entities
      ),
      amazon: generateEntityDomainFilter(
        alexaFilter.include_domains,
        alexaFilter.include_entities,
        alexaFilter.exclude_domains,
        alexaFilter.exclude_entities
      ),
    })
  );

  private _availableAssistants = memoize(
    (cloudStatus: CloudStatus | undefined) => {
      const googleEnabled =
        cloudStatus?.logged_in === true &&
        cloudStatus.prefs.google_enabled === true;
      const alexaEnabled =
        cloudStatus?.logged_in === true &&
        cloudStatus.prefs.alexa_enabled === true;

      const showAssistants = [...Object.keys(voiceAssistants)];

      if (!googleEnabled) {
        showAssistants.splice(
          showAssistants.indexOf("cloud.google_assistant"),
          1
        );
      }

      if (!alexaEnabled) {
        showAssistants.splice(showAssistants.indexOf("cloud.alexa"), 1);
      }

      return showAssistants;
    }
  );

  private _filteredEntities = memoize(
    (
      localize: LocalizeFunc,
      entities: Record<string, ExtEntityRegistryEntry>,
      exposedEntities: Record<string, ExposeEntitySettings>,
      devices: HomeAssistant["devices"],
      areas: HomeAssistant["areas"],
      cloudStatus: CloudStatus | undefined,
      filters: URLSearchParams
    ) => {
      const googleEnabled =
        cloudStatus?.logged_in === true &&
        cloudStatus.prefs.google_enabled === true;
      const alexaEnabled =
        cloudStatus?.logged_in === true &&
        cloudStatus.prefs.alexa_enabled === true;

      const showAssistants = [...this._availableAssistants(cloudStatus)];

      const alexaManual =
        alexaEnabled &&
        !isEmptyEntityDomainFilter(
          (this.cloudStatus as CloudStatusLoggedIn).alexa_entities
        );
      const googleManual =
        googleEnabled &&
        !isEmptyEntityDomainFilter(
          (this.cloudStatus as CloudStatusLoggedIn).google_entities
        );

      if (googleManual) {
        showAssistants.splice(
          showAssistants.indexOf("cloud.google_assistant"),
          1
        );
      }

      if (alexaManual) {
        showAssistants.splice(showAssistants.indexOf("cloud.alexa"), 1);
      }

      const result: Record<string, DataTableRowData> = {};

      let filteredEntities = Object.values(this.hass.states);

      filteredEntities = filteredEntities.filter((entity) =>
        showAssistants.some(
          (assis) => exposedEntities?.[entity.entity_id]?.[assis]
        )
      );

      let filteredAssistants: string[];

      filters.forEach((value, key) => {
        if (key === "assistants") {
          filteredAssistants = value.split(",");
          filteredEntities = filteredEntities.filter((entity) =>
            filteredAssistants.some(
              (assis) =>
                !(assis === "cloud.alexa" && alexaManual) &&
                !(assis === "cloud.google_assistant" && googleManual) &&
                exposedEntities?.[entity.entity_id]?.[assis]
            )
          );
        }
      });

      for (const entityState of filteredEntities) {
        const entry: ExtEntityRegistryEntry | undefined =
          entities[entityState.entity_id];
        const areaId =
          entry?.area_id ??
          (entry?.device_id ? devices[entry.device_id!]?.area_id : undefined);
        const area = areaId ? areas[areaId] : undefined;

        result[entityState.entity_id] = {
          entity_id: entityState.entity_id,
          entity: entityState,
          name:
            computeStateName(entityState) ||
            this.hass.localize(
              "ui.panel.config.entities.picker.unnamed_entity"
            ),
          domain: domainToName(localize, computeDomain(entityState.entity_id)),
          area: area ? area.name : "—",
          assistants: Object.keys(
            exposedEntities?.[entityState.entity_id]
          ).filter(
            (key) =>
              showAssistants.includes(key) &&
              exposedEntities?.[entityState.entity_id]?.[key]
          ),
          aliases: entry?.aliases || [],
        };
      }

      if (alexaManual || googleManual) {
        const manFilterFuncs = this._getEntityFilterFuncs(
          (this.cloudStatus as CloudStatusLoggedIn).google_entities,
          (this.cloudStatus as CloudStatusLoggedIn).alexa_entities
        );
        Object.keys(this.hass.states).forEach((entityId) => {
          const assistants: string[] = [];
          if (alexaManual && manFilterFuncs.amazon(entityId)) {
            assistants.push("cloud.alexa");
          }
          if (googleManual && manFilterFuncs.google(entityId)) {
            assistants.push("cloud.google_assistant");
          }
          if (!assistants.length) {
            return;
          }
          if (entityId in result) {
            result[entityId].assistants.push(...assistants);
            result[entityId].manAssistants = assistants;
          } else if (
            !filteredAssistants ||
            filteredAssistants.some((ass) => assistants.includes(ass))
          ) {
            const entityState = this.hass.states[entityId];
            const entry: ExtEntityRegistryEntry | undefined =
              entities[entityId];
            const areaId =
              entry?.area_id ??
              (entry?.device_id
                ? devices[entry.device_id!]?.area_id
                : undefined);
            const area = areaId ? areas[areaId] : undefined;
            result[entityId] = {
              entity_id: entityState.entity_id,
              entity: entityState,
              name: computeStateName(entityState),
              area: area ? area.name : "—",
              assistants: [
                ...(exposedEntities
                  ? Object.keys(
                      exposedEntities?.[entityState.entity_id]
                    ).filter(
                      (key) =>
                        showAssistants.includes(key) &&
                        exposedEntities?.[entityState.entity_id]?.[key]
                    )
                  : []),
                ...assistants,
              ],
              manAssistants: assistants,
              aliases: entry?.aliases || [],
            };
          }
        });
      }

      return Object.values(result);
    }
  );

  public connectedCallback() {
    super.connectedCallback();
    window.addEventListener("location-changed", this._locationChanged);
    window.addEventListener("popstate", this._popState);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener("location-changed", this._locationChanged);
    window.removeEventListener("popstate", this._popState);
  }

  private _locationChanged = () => {
    if (window.location.search.substring(1) !== this._searchParms.toString()) {
      this._searchParms = new URLSearchParams(window.location.search);
    }
  };

  private _popState = () => {
    if (window.location.search.substring(1) !== this._searchParms.toString()) {
      this._searchParms = new URLSearchParams(window.location.search);
    }
  };

  private async _fetchEntities() {
    this._extEntities = await getExtendedEntityRegistryEntries(
      this.hass,
      Object.keys(this._entities)
    );
    this._fetchSupportedEntities();
  }

  private async _fetchSupportedEntities() {
    let alexaEntitiesProm: Promise<AlexaEntity[]> | undefined;
    let googleEntitiesProm: Promise<GoogleEntity[]> | undefined;
    if (this.cloudStatus?.logged_in && this.cloudStatus.prefs.alexa_enabled) {
      alexaEntitiesProm = fetchCloudAlexaEntities(this.hass);
    }
    if (this.cloudStatus?.logged_in && this.cloudStatus.prefs.google_enabled) {
      googleEntitiesProm = fetchCloudGoogleEntities(this.hass);
    }
    const [alexaEntities, googleEntities] = await Promise.all([
      alexaEntitiesProm,
      googleEntitiesProm,
    ]);
    this._supportedEntities = {
      "cloud.alexa": alexaEntities?.map((entity) => entity.entity_id),
      "cloud.google_assistant": googleEntities?.map(
        (entity) => entity.entity_id
      ),
      // TODO add supported entity for assist
      conversation: undefined,
    };
  }

  public willUpdate(changedProperties: PropertyValues): void {
    if (changedProperties.has("_entities")) {
      this._fetchEntities();
      return;
    }
    if (
      changedProperties.has("hass") &&
      this.hass.config.state === "RUNNING" &&
      changedProperties.get("hass")?.config.state !== this.hass.config.state
    ) {
      this._fetchSupportedEntities();
    }
  }

  protected render() {
    if (!this.hass || !this.exposedEntities || !this._extEntities) {
      return html`<hass-loading-screen></hass-loading-screen>`;
    }

    const filteredEntities = this._filteredEntities(
      this.hass.localize,
      this._extEntities,
      this.exposedEntities,
      this.hass.devices,
      this.hass.areas,
      this.cloudStatus,
      this._searchParms
    );

    return html`
      <hass-tabs-subpage-data-table
        .hass=${this.hass}
        .narrow=${this.narrow}
        .backPath=${this._searchParms.has("historyBack")
          ? undefined
          : "/config"}
        .route=${this.route}
        .tabs=${voiceAssistantTabs}
        .columns=${this._columns(
          this.narrow,
          this._availableAssistants(this.cloudStatus),
          this._supportedEntities,
          this.hass.language,
          this.hass.localize
        )}
        .data=${filteredEntities}
        .searchLabel=${this.hass.localize(
          "ui.panel.config.entities.picker.search",
          {
            number: filteredEntities.length,
          }
        )}
        .filter=${this._filter}
        selectable
        .selected=${this._selectedEntities.length}
        clickable
        .initialSorting=${this._activeSorting}
        .initialGroupColumn=${this._activeGrouping}
        .initialCollapsedGroups=${this._activeCollapsed}
        .columnOrder=${this._activeColumnOrder}
        .hiddenColumns=${this._activeHiddenColumns}
        @columns-changed=${this._handleColumnsChanged}
        @sorting-changed=${this._handleSortingChanged}
        @selection-changed=${this._handleSelectionChanged}
        @grouping-changed=${this._handleGroupingChanged}
        @collapsed-changed=${this._handleCollapseChanged}
        @clear-filter=${this._clearFilter}
        @search-changed=${this._handleSearchChange}
        @row-click=${this._openEditEntry}
        id="entity_id"
        has-fab
      >
        ${this._selectedEntities.length
          ? html`
              <div class="header-btns" slot="selection-bar">
                ${!this.narrow
                  ? html`
                      <mwc-button @click=${this._exposeSelected}
                        >${this.hass.localize(
                          "ui.panel.config.voice_assistants.expose.expose"
                        )}</mwc-button
                      >
                      <mwc-button @click=${this._unexposeSelected}
                        >${this.hass.localize(
                          "ui.panel.config.voice_assistants.expose.unexpose"
                        )}</mwc-button
                      >
                    `
                  : html`
                      <ha-tooltip
                        .content=${this.hass.localize(
                          "ui.panel.config.voice_assistants.expose.expose"
                        )}
                        placement="left"
                      >
                        <ha-icon-button
                          @click=${this._exposeSelected}
                          .path=${mdiPlusBoxMultiple}
                          .label=${this.hass.localize(
                            "ui.panel.config.voice_assistants.expose.expose"
                          )}
                        ></ha-icon-button>
                      </ha-tooltip>
                      <ha-tooltip
                        content=${this.hass.localize(
                          "ui.panel.config.voice_assistants.expose.unexpose"
                        )}
                        placement="left"
                      >
                        <ha-icon-button
                          @click=${this._unexposeSelected}
                          .path=${mdiCloseBoxMultiple}
                          .label=${this.hass.localize(
                            "ui.panel.config.voice_assistants.expose.unexpose"
                          )}
                        ></ha-icon-button>
                      </ha-tooltip>
                    `}
              </div>
            `
          : ""}
        <ha-fab
          slot="fab"
          .label=${this.hass.localize(
            "ui.panel.config.voice_assistants.expose.add"
          )}
          extended
          @click=${this._addEntry}
        >
          <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
        </ha-fab>
      </hass-tabs-subpage-data-table>
    `;
  }

  private _addEntry() {
    const assistants = this._searchParms.has("assistants")
      ? this._searchParms.get("assistants")!.split(",")
      : this._availableAssistants(this.cloudStatus);
    showExposeEntityDialog(this, {
      filterAssistants: assistants,
      exposedEntities: this.exposedEntities!,
      exposeEntities: (entities) => {
        exposeEntities(this.hass, assistants, entities, true).then(() =>
          fireEvent(this, "exposed-entities-changed")
        );
      },
    });
  }

  private _handleSearchChange(ev: CustomEvent) {
    this._filter = ev.detail.value;
  }

  private _handleSelectionChanged(
    ev: HASSDomEvent<SelectionChangedEvent>
  ): void {
    this._selectedEntities = ev.detail.value;
  }

  private _removeEntity = (ev) => {
    ev.stopPropagation();
    const entityId = ev.currentTarget.closest(".mdc-data-table__row").rowId;
    const assistants = this._searchParms.has("assistants")
      ? this._searchParms.get("assistants")!.split(",")
      : this._availableAssistants(this.cloudStatus);
    exposeEntities(this.hass, assistants, [entityId], false).then(() =>
      fireEvent(this, "exposed-entities-changed")
    );
  };

  private _unexposeSelected() {
    const assistants = this._searchParms.has("assistants")
      ? this._searchParms.get("assistants")!.split(",")
      : this._availableAssistants(this.cloudStatus);
    showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.voice_assistants.expose.unexpose_confirm_title"
      ),
      text: this.hass.localize(
        "ui.panel.config.voice_assistants.expose.unexpose_confirm_text",
        {
          assistants: assistants
            .map((ass) => voiceAssistants[ass].name)
            .join(", "),
          entities: this._selectedEntities.length,
        }
      ),
      confirmText: this.hass.localize(
        "ui.panel.config.voice_assistants.expose.unexpose"
      ),
      dismissText: this.hass.localize("ui.common.cancel"),
      confirm: () => {
        exposeEntities(
          this.hass,
          assistants,
          this._selectedEntities,
          false
        ).then(() => fireEvent(this, "exposed-entities-changed"));
        this._clearSelection();
      },
    });
  }

  private _exposeSelected() {
    const assistants = this._searchParms.has("assistants")
      ? this._searchParms.get("assistants")!.split(",")
      : this._availableAssistants(this.cloudStatus);
    showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.voice_assistants.expose.expose_confirm_title"
      ),
      text: this.hass.localize(
        "ui.panel.config.voice_assistants.expose.expose_confirm_text",
        {
          assistants: assistants
            .map((ass) => voiceAssistants[ass].name)
            .join(", "),
          entities: this._selectedEntities.length,
        }
      ),
      confirmText: this.hass.localize(
        "ui.panel.config.voice_assistants.expose.expose"
      ),
      dismissText: this.hass.localize("ui.common.cancel"),
      confirm: () => {
        exposeEntities(
          this.hass,
          assistants,
          this._selectedEntities,
          true
        ).then(() => fireEvent(this, "exposed-entities-changed"));
        this._clearSelection();
      },
    });
  }

  private _clearSelection() {
    this._dataTable.clearSelection();
  }

  private _openEditEntry(ev: CustomEvent): void {
    const entityId = (ev.detail as RowClickedEvent).id;
    showVoiceSettingsDialog(this, {
      entityId,
      exposed: this.exposedEntities![entityId],
      extEntityReg: this._extEntities?.[entityId],
      exposedEntitiesChanged: () => {
        fireEvent(this, "exposed-entities-changed");
      },
    });
  }

  private _clearFilter() {
    navigate(window.location.pathname, { replace: true });
  }

  private _handleSortingChanged(ev: CustomEvent) {
    this._activeSorting = ev.detail;
  }

  private _handleGroupingChanged(ev: CustomEvent) {
    this._activeGrouping = ev.detail.value;
  }

  private _handleCollapseChanged(ev: CustomEvent) {
    this._activeCollapsed = ev.detail.value;
  }

  private _handleColumnsChanged(ev: CustomEvent) {
    this._activeColumnOrder = ev.detail.columnOrder;
    this._activeHiddenColumns = ev.detail.hiddenColumns;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        hass-loading-screen {
          --app-header-background-color: var(--sidebar-background-color);
          --app-header-text-color: var(--sidebar-text-color);
        }
        .table-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          height: 56px;
          background-color: var(--mdc-text-field-fill-color, whitesmoke);
          border-bottom: 1px solid
            var(--mdc-text-field-idle-line-color, rgba(0, 0, 0, 0.42));
          box-sizing: border-box;
        }
        .header-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: var(--secondary-text-color);
          position: relative;
          top: -4px;
        }
        .selected-txt {
          font-weight: var(--ha-font-weight-bold);
          padding-left: 16px;
          padding-inline-start: 16px;
          direction: var(--direction);
        }
        .table-header .selected-txt {
          margin-top: 20px;
        }
        .header-toolbar .selected-txt {
          font-size: var(--ha-font-size-l);
        }
        .header-toolbar .header-btns {
          margin-right: -12px;
          margin-inline-end: -12px;
          direction: var(--direction);
        }
        .header-btns {
          display: flex;
        }
        .header-btns > mwc-button,
        .header-btns > ha-icon-button {
          margin: 8px;
        }
        ha-button-menu {
          margin-left: 8px;
          margin-inline-start: 8px;
          margin-inline-end: initial;
        }
        .clear {
          color: var(--primary-color);
          padding-left: 8px;
          padding-inline-start: 8px;
          text-transform: uppercase;
          direction: var(--direction);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-voice-assistants-expose": VoiceAssistantsExpose;
  }
}

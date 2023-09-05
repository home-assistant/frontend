import { consume } from "@lit-labs/context";
import "@lrnwebcomponents/simple-tooltip/simple-tooltip";
import {
  mdiCloseBoxMultiple,
  mdiCloseCircleOutline,
  mdiFilterVariant,
  mdiPlus,
  mdiPlusBoxMultiple,
} from "@mdi/js";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  nothing,
  PropertyValues,
} from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import memoize from "memoize-one";
import { fireEvent, HASSDomEvent } from "../../../common/dom/fire_event";
import { computeStateName } from "../../../common/entity/compute_state_name";
import {
  EntityFilter,
  generateFilter,
  isEmptyFilter,
} from "../../../common/entity/entity_filter";
import { navigate } from "../../../common/navigate";
import { computeRTL } from "../../../common/util/compute_rtl";
import {
  DataTableColumnContainer,
  DataTableRowData,
  RowClickedEvent,
  SelectionChangedEvent,
} from "../../../components/data-table/ha-data-table";
import "../../../components/ha-fab";
import { AlexaEntity, fetchCloudAlexaEntities } from "../../../data/alexa";
import { CloudStatus, CloudStatusLoggedIn } from "../../../data/cloud";
import { entitiesContext } from "../../../data/context";
import {
  ExtEntityRegistryEntry,
  getExtendedEntityRegistryEntries,
} from "../../../data/entity_registry";
import {
  exposeEntities,
  ExposeEntitySettings,
  voiceAssistants,
} from "../../../data/expose";
import {
  fetchCloudGoogleEntities,
  GoogleEntity,
} from "../../../data/google_assistant";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-loading-screen";
import "../../../layouts/hass-tabs-subpage-data-table";
import type { HaTabsSubpageDataTable } from "../../../layouts/hass-tabs-subpage-data-table";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant, Route } from "../../../types";
import "./expose/expose-assistant-icon";
import { voiceAssistantTabs } from "./ha-config-voice-assistants";
import { showExposeEntityDialog } from "./show-dialog-expose-entity";
import { showVoiceSettingsDialog } from "./show-dialog-voice-settings";

@customElement("ha-config-voice-assistants-expose")
export class VoiceAssistantsExpose extends LitElement {
  @property() public hass!: HomeAssistant;

  @property({ attribute: false }) public cloudStatus?: CloudStatus;

  @property({ type: Boolean }) public isWide!: boolean;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ attribute: false }) public route!: Route;

  @property({ attribute: false }) public exposedEntities?: Record<
    string,
    ExposeEntitySettings
  >;

  @state()
  @consume({ context: entitiesContext, subscribe: true })
  _entities!: HomeAssistant["entities"];

  @state() private _extEntities?: Record<string, ExtEntityRegistryEntry>;

  @state() private _filter: string = history.state?.filter || "";

  @state() private _numHiddenEntities = 0;

  @state() private _searchParms = new URLSearchParams(window.location.search);

  @state() private _selectedEntities: string[] = [];

  @state() private _supportedEntities?: Record<
    "cloud.google_assistant" | "cloud.alexa" | "conversation",
    string[] | undefined
  >;

  @query("hass-tabs-subpage-data-table", true)
  private _dataTable!: HaTabsSubpageDataTable;

  private _activeFilters = memoize(
    (filters: URLSearchParams): string[] | undefined => {
      const filterTexts: string[] = [];
      filters.forEach((value, key) => {
        switch (key) {
          case "assistants": {
            const assistants = value.split(",");
            assistants.forEach((assistant) => {
              filterTexts.push(voiceAssistants[assistant]?.name || assistant);
            });
          }
        }
      });
      return filterTexts.length ? filterTexts : undefined;
    }
  );

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
      _language: string
    ): DataTableColumnContainer => ({
      icon: {
        title: "",
        type: "icon",
        hidden: narrow,
        template: (entry) => html`
          <ha-state-icon
            title=${ifDefined(entry.entity?.state)}
            .state=${entry.entity}
          ></ha-state-icon>
        `,
      },
      name: {
        main: true,
        title: this.hass.localize(
          "ui.panel.config.voice_assistants.expose.headers.name"
        ),
        sortable: true,
        filterable: true,
        direction: "asc",
        grows: true,
        template: (entry) => html`
          ${entry.name}<br />
          <div class="secondary">${entry.entity_id}</div>
        `,
      },
      area: {
        title: this.hass.localize(
          "ui.panel.config.voice_assistants.expose.headers.area"
        ),
        sortable: true,
        hidden: narrow,
        filterable: true,
        width: "15%",
      },
      assistants: {
        title: this.hass.localize(
          "ui.panel.config.voice_assistants.expose.headers.assistants"
        ),
        sortable: true,
        filterable: true,
        width: "160px",
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
        title: this.hass.localize(
          "ui.panel.config.voice_assistants.expose.headers.aliases"
        ),
        sortable: true,
        filterable: true,
        hidden: narrow,
        width: "15%",
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
        type: "icon-button",
        hidden: narrow,
        template: () =>
          html`<ha-icon-button
            @click=${this._removeEntity}
            .path=${mdiCloseCircleOutline}
          ></ha-icon-button>`,
      },
      // For search
      entity_id: {
        title: "",
        hidden: true,
        filterable: true,
      },
    })
  );

  private _getEntityFilterFuncs = memoize(
    (googleFilter: EntityFilter, alexaFilter: EntityFilter) => ({
      google: generateFilter(
        googleFilter.include_domains,
        googleFilter.include_entities,
        googleFilter.exclude_domains,
        googleFilter.exclude_entities
      ),
      amazon: generateFilter(
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
        !isEmptyFilter(
          (this.cloudStatus as CloudStatusLoggedIn).alexa_entities
        );
      const googleManual =
        googleEnabled &&
        !isEmptyFilter(
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

      // If nothing gets filtered, this is our correct count of entities
      const startLength = filteredEntities.length;

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

      this._numHiddenEntities = startLength - Object.values(result).length;

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

  public constructor() {
    super();
    window.addEventListener("location-changed", () => {
      if (
        window.location.search.substring(1) !== this._searchParms.toString()
      ) {
        this._searchParms = new URLSearchParams(window.location.search);
      }
    });
    window.addEventListener("popstate", () => {
      if (
        window.location.search.substring(1) !== this._searchParms.toString()
      ) {
        this._searchParms = new URLSearchParams(window.location.search);
      }
    });
  }

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
    const activeFilters = this._activeFilters(this._searchParms);

    const filteredEntities = this._filteredEntities(
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
          this.hass.language
        )}
        .data=${filteredEntities}
        .activeFilters=${activeFilters}
        .numHidden=${this._numHiddenEntities}
        .hideFilterMenu=${this._selectedEntities.length > 0}
        .searchLabel=${this.hass.localize(
          "ui.panel.config.entities.picker.search"
        )}
        .hiddenLabel=${this.hass.localize(
          "ui.panel.config.entities.picker.filter.hidden_entities",
          "number",
          this._numHiddenEntities
        )}
        .filter=${this._filter}
        selectable
        clickable
        @selection-changed=${this._handleSelectionChanged}
        @clear-filter=${this._clearFilter}
        @search-changed=${this._handleSearchChange}
        @row-click=${this._openEditEntry}
        id="entity_id"
        hasFab
      >
        ${this._selectedEntities.length
          ? html`
              <div
                class=${classMap({
                  "header-toolbar": this.narrow,
                  "table-header": !this.narrow,
                })}
                slot="header"
              >
                <p class="selected-txt">
                  ${this.hass.localize(
                    "ui.panel.config.entities.picker.selected",
                    "number",
                    this._selectedEntities.length
                  )}
                </p>
                <div class="header-btns">
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
                        <ha-icon-button
                          id="enable-btn"
                          @click=${this._exposeSelected}
                          .path=${mdiPlusBoxMultiple}
                          .label=${this.hass.localize(
                            "ui.panel.config.voice_assistants.expose.expose"
                          )}
                        ></ha-icon-button>
                        <simple-tooltip animation-delay="0" for="enable-btn">
                          ${this.hass.localize(
                            "ui.panel.config.voice_assistants.expose.expose"
                          )}
                        </simple-tooltip>
                        <ha-icon-button
                          id="disable-btn"
                          @click=${this._unexposeSelected}
                          .path=${mdiCloseBoxMultiple}
                          .label=${this.hass.localize(
                            "ui.panel.config.voice_assistants.expose.unexpose"
                          )}
                        ></ha-icon-button>
                        <simple-tooltip animation-delay="0" for="disable-btn">
                          ${this.hass.localize(
                            "ui.panel.config.voice_assistants.expose.unexpose"
                          )}
                        </simple-tooltip>
                      `}
                </div>
              </div>
            `
          : ""}
        <ha-fab
          slot="fab"
          .label=${this.hass.localize(
            "ui.panel.config.voice_assistants.expose.add"
          )}
          extended
          ?rtl=${computeRTL(this.hass)}
          @click=${this._addEntry}
        >
          <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
        </ha-fab>
        ${this.narrow && activeFilters?.length
          ? html`
              <ha-button-menu slot="filter-menu" multi>
                <ha-icon-button
                  slot="trigger"
                  .label=${this.hass!.localize(
                    "ui.panel.config.devices.picker.filter.filter"
                  )}
                  .path=${mdiFilterVariant}
                ></ha-icon-button>
                <mwc-list-item @click=${this._clearFilter}>
                  ${this.hass.localize("ui.components.data-table.filtering_by")}
                  ${activeFilters.join(", ")}
                  <span class="clear">
                    ${this.hass.localize("ui.common.clear")}
                  </span>
                </mwc-list-item>
              </ha-button-menu>
            `
          : nothing}
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
    history.replaceState({ filter: this._filter }, "");
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
    if (this._activeFilters(this._searchParms)) {
      navigate(window.location.pathname, { replace: true });
    }
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
          font-weight: bold;
          padding-left: 16px;
          padding-inline-start: 16px;
          direction: var(--direction);
        }
        .table-header .selected-txt {
          margin-top: 20px;
        }
        .header-toolbar .selected-txt {
          font-size: 16px;
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

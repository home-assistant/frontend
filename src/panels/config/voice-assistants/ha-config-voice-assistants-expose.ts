import { consume } from "@lit-labs/context";
import "@lrnwebcomponents/simple-tooltip/simple-tooltip";
import {
  mdiMinusCircle,
  mdiMinusCircleOutline,
  mdiPlus,
  mdiPlusCircle,
} from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, PropertyValues } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import { styleMap } from "lit/directives/style-map";
import memoize from "memoize-one";
import { HASSDomEvent } from "../../../common/dom/fire_event";
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
import { CloudStatus, CloudStatusLoggedIn } from "../../../data/cloud";
import { entitiesContext } from "../../../data/context";
import {
  computeEntityRegistryName,
  EntityRegistryEntry,
  ExtEntityRegistryEntry,
  getExtendedEntityRegistryEntries,
} from "../../../data/entity_registry";
import {
  exposeEntities,
  voiceAssistantKeys,
  voiceAssistants,
} from "../../../data/voice";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-loading-screen";
import "../../../layouts/hass-tabs-subpage-data-table";
import type { HaTabsSubpageDataTable } from "../../../layouts/hass-tabs-subpage-data-table";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant, Route } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";
import { voiceAssistantTabs } from "./ha-config-voice-assistants";
import { showExposeEntityDialog } from "./show-dialog-expose-entity";
import { showVoiceSettingsDialog } from "./show-dialog-voice-settings";

@customElement("ha-config-voice-assistants-expose")
export class VoiceAssistantsExpose extends SubscribeMixin(LitElement) {
  @property() public hass!: HomeAssistant;

  @property({ attribute: false }) public cloudStatus?: CloudStatus;

  @property({ type: Boolean }) public isWide!: boolean;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ attribute: false }) public route!: Route;

  @state()
  @consume({ context: entitiesContext, subscribe: true })
  _entities!: HomeAssistant["entities"];

  @state() private _extEntities?: Record<string, ExtEntityRegistryEntry>;

  @state() private _filter: string = history.state?.filter || "";

  @state() private _numHiddenEntities = 0;

  @state() private _searchParms = new URLSearchParams(window.location.search);

  @state() private _selectedEntities: string[] = [];

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
    (narrow, _language): DataTableColumnContainer => ({
      icon: {
        title: "",
        type: "icon",
        template: (_, entry) => html`
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
        template: narrow
          ? (name, entry) =>
              html`
                ${name}<br />
                <div class="secondary">${entry.entity_id}</div>
              `
          : undefined,
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
        template: (assistants, entry) =>
          html`${voiceAssistantKeys.map((key) =>
            assistants.includes(key)
              ? html`<div>
                  <img
                    style="height: 24px; margin-right: 16px;${styleMap({
                      filter: entry.manAssistants?.includes(key)
                        ? "grayscale(100%)"
                        : "",
                    })}"
                    alt=""
                    src=${brandsUrl({
                      domain: voiceAssistants[key].domain,
                      type: "icon",
                      darkOptimized: this.hass.themes?.darkMode,
                    })}
                    referrerpolicy="no-referrer"
                    slot="prefix"
                  />${entry.manAssistants?.includes(key)
                    ? html`<simple-tooltip
                        animation-delay="0"
                        position="bottom"
                        offset="1"
                      >
                        Configured in YAML, not editable in UI
                      </simple-tooltip>`
                    : ""}
                </div>`
              : html`<div style="width: 40px;"></div>`
          )}`,
      },
      aliases: {
        title: this.hass.localize(
          "ui.panel.config.voice_assistants.expose.headers.aliases"
        ),
        sortable: true,
        filterable: true,
        width: "15%",
        template: (aliases) =>
          aliases.length === 0
            ? "-"
            : aliases.length === 1
            ? aliases[0]
            : this.hass.localize(
                "ui.panel.config.voice_assistants.expose.aliases",
                { count: aliases.length }
              ),
      },
      remove: {
        title: "",
        type: "icon-button",
        template: () =>
          html`<ha-icon-button
            @click=${this._removeEntity}
            .path=${mdiMinusCircleOutline}
          ></ha-icon-button>`,
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

  private _filteredEntities = memoize(
    (
      entities: HomeAssistant["entities"],
      extEntities: Record<string, ExtEntityRegistryEntry> | undefined,
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

      const showAssistants = [...voiceAssistantKeys];

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

      if (!googleEnabled || googleManual) {
        showAssistants.splice(
          showAssistants.indexOf("cloud.google_assistant"),
          1
        );
      }

      if (!alexaEnabled || alexaManual) {
        showAssistants.splice(showAssistants.indexOf("cloud.alexa"), 1);
      }

      const result: Record<string, DataTableRowData> = {};

      let filteredEntities = Object.values(entities);

      filteredEntities = filteredEntities.filter((entity) =>
        showAssistants.some(
          (assis) =>
            extEntities?.[entity.entity_id].options?.[assis]?.should_expose
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
                extEntities?.[entity.entity_id].options?.[assis]?.should_expose
            )
          );
        }
      });

      for (const entry of filteredEntities) {
        const entity = this.hass.states[entry.entity_id];
        const areaId = entry.area_id ?? devices[entry.device_id!]?.area_id;
        const area = areaId ? areas[areaId] : undefined;

        result[entry.entity_id] = {
          entity_id: entry.entity_id,
          entity,
          name: computeEntityRegistryName(
            this.hass!,
            entry as EntityRegistryEntry
          ),
          area: area ? area.name : "—",
          assistants: Object.keys(
            extEntities![entry.entity_id].options!
          ).filter(
            (key) =>
              showAssistants.includes(key) &&
              extEntities![entry.entity_id].options![key]?.should_expose
          ),
          aliases: extEntities?.[entry.entity_id].aliases,
        };
      }

      this._numHiddenEntities = startLength - Object.values(result).length;

      if (alexaManual || googleManual) {
        const manFilterFuncs = this._getEntityFilterFuncs(
          (this.cloudStatus as CloudStatusLoggedIn).google_entities,
          (this.cloudStatus as CloudStatusLoggedIn).alexa_entities
        );
        Object.keys(entities).forEach((entityId) => {
          const assistants: string[] = [];
          if (
            alexaManual &&
            (!filteredAssistants ||
              filteredAssistants.includes("cloud.alexa")) &&
            manFilterFuncs.amazon(entityId)
          ) {
            assistants.push("cloud.alexa");
          }
          if (
            googleManual &&
            (!filteredAssistants ||
              filteredAssistants.includes("cloud.google_assistant")) &&
            manFilterFuncs.google(entityId)
          ) {
            assistants.push("cloud.google_assistant");
          }
          if (!assistants.length) {
            return;
          }
          if (entityId in result) {
            result[entityId].assistants.push(...assistants);
            result[entityId].manAssistants = assistants;
          } else {
            const entry = entities[entityId];
            const areaId = entry.area_id ?? devices[entry.device_id!]?.area_id;
            const area = areaId ? areas[areaId] : undefined;
            result[entityId] = {
              entity_id: entry.entity_id,
              entity: this.hass.states[entityId],
              name: computeEntityRegistryName(
                this.hass!,
                entry as EntityRegistryEntry
              ),
              area: area ? area.name : "—",
              assistants: [
                ...(extEntities
                  ? Object.keys(extEntities[entry.entity_id].options!).filter(
                      (key) =>
                        showAssistants.includes(key) &&
                        extEntities[entry.entity_id].options![key]
                          ?.should_expose
                    )
                  : []),
                ...assistants,
              ],
              manAssistants: assistants,
              aliases: extEntities?.[entityId].aliases,
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

  private async _fetchExtendedEntities() {
    this._extEntities = await getExtendedEntityRegistryEntries(
      this.hass,
      Object.keys(this._entities)
    );
  }

  public willUpdate(changedProperties: PropertyValues): void {
    if (changedProperties.has("_entities")) {
      this._fetchExtendedEntities();
    }
  }

  protected render() {
    if (!this.hass || this.hass.entities === undefined) {
      return html`<hass-loading-screen></hass-loading-screen>`;
    }
    const activeFilters = this._activeFilters(this._searchParms);

    const filteredEntities = this._filteredEntities(
      this._entities,
      this._extEntities,
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
        .columns=${this._columns(this.narrow, this.hass.language)}
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
                          .path=${mdiPlusCircle}
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
                          .path=${mdiMinusCircle}
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
      </hass-tabs-subpage-data-table>
    `;
  }

  private _addEntry() {
    const assistants = this._searchParms.has("assistants")
      ? this._searchParms.get("assistants")!.split(",")
      : voiceAssistantKeys;
    showExposeEntityDialog(this, {
      filterAssistants: assistants,
      extendedEntities: this._extEntities!,
      exposeEntities: (entities) => {
        exposeEntities(this.hass, assistants, entities, true);
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
      : voiceAssistantKeys;
    exposeEntities(this.hass, assistants, [entityId], false);
  };

  private _unexposeSelected() {
    const assistants = this._searchParms.has("assistants")
      ? this._searchParms.get("assistants")!.split(",")
      : voiceAssistantKeys;
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
        exposeEntities(this.hass, assistants, this._selectedEntities, false);
        this._clearSelection();
      },
    });
  }

  private _exposeSelected() {
    const assistants = this._searchParms.has("assistants")
      ? this._searchParms.get("assistants")!.split(",")
      : voiceAssistantKeys;
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
        exposeEntities(this.hass, assistants, this._selectedEntities, true);
        this._clearSelection();
      },
    });
  }

  private _clearSelection() {
    this._dataTable.clearSelection();
  }

  private _openEditEntry(ev: CustomEvent): void {
    const entityId = (ev.detail as RowClickedEvent).id;
    showVoiceSettingsDialog(this, { entityId });
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

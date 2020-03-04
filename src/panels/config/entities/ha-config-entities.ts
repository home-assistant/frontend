import "@polymer/paper-checkbox/paper-checkbox";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-item/paper-icon-item";
import "@polymer/paper-listbox/paper-listbox";
import "@polymer/paper-tooltip/paper-tooltip";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  query,
  TemplateResult,
} from "lit-element";
import { styleMap } from "lit-html/directives/style-map";
import memoize from "memoize-one";
import { computeDomain } from "../../../common/entity/compute_domain";
import { domainIcon } from "../../../common/entity/domain_icon";
import { stateIcon } from "../../../common/entity/state_icon";
import {
  DataTableColumnContainer,
  DataTableColumnData,
  RowClickedEvent,
  SelectionChangedEvent,
} from "../../../components/data-table/ha-data-table";
import "../../../components/ha-icon";
import "../../../common/search/search-input";
import {
  computeEntityRegistryName,
  EntityRegistryEntry,
  removeEntityRegistryEntry,
  subscribeEntityRegistry,
  updateEntityRegistryEntry,
} from "../../../data/entity_registry";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-loading-screen";
import "../../../layouts/hass-tabs-subpage-data-table";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import { HomeAssistant, Route } from "../../../types";
import { DialogEntityEditor } from "./dialog-entity-editor";
import {
  loadEntityEditorDialog,
  showEntityEditorDialog,
} from "./show-dialog-entity-editor";
import { configSections } from "../ha-panel-config";
import { classMap } from "lit-html/directives/class-map";
import { computeStateName } from "../../../common/entity/compute_state_name";
// tslint:disable-next-line: no-duplicate-imports
import { HaTabsSubpageDataTable } from "../../../layouts/hass-tabs-subpage-data-table";
import { HASSDomEvent } from "../../../common/dom/fire_event";

export interface StateEntity extends EntityRegistryEntry {
  readonly?: boolean;
  selectable?: boolean;
}

export interface EntityRow extends StateEntity {
  icon: string;
  unavailable: boolean;
  restored: boolean;
  status: string;
}

@customElement("ha-config-entities")
export class HaConfigEntities extends SubscribeMixin(LitElement) {
  @property() public hass!: HomeAssistant;
  @property() public isWide!: boolean;
  @property() public narrow!: boolean;
  @property() public route!: Route;
  @property() private _entities?: EntityRegistryEntry[];
  @property() private _stateEntities: StateEntity[] = [];
  @property() private _showDisabled = false;
  @property() private _showUnavailable = true;
  @property() private _showReadOnly = true;
  @property() private _filter = "";
  @property() private _selectedEntities: string[] = [];
  @query("hass-tabs-subpage-data-table")
  private _dataTable!: HaTabsSubpageDataTable;
  private getDialog?: () => DialogEntityEditor | undefined;

  private _columns = memoize(
    (narrow, _language): DataTableColumnContainer => {
      const columns: DataTableColumnContainer = {
        icon: {
          title: "",
          type: "icon",
          template: (icon) => html`
            <ha-icon slot="item-icon" .icon=${icon}></ha-icon>
          `,
        },
        name: {
          title: this.hass.localize(
            "ui.panel.config.entities.picker.headers.name"
          ),
          sortable: true,
          filterable: true,
          direction: "asc",
          grows: true,
        },
      };

      const statusColumn: DataTableColumnData = {
        title: this.hass.localize(
          "ui.panel.config.entities.picker.headers.status"
        ),
        type: "icon",
        sortable: true,
        filterable: true,
        template: (_status, entity: any) =>
          entity.unavailable || entity.disabled_by || entity.readonly
            ? html`
                <div
                  tabindex="0"
                  style="display:inline-block; position: relative;"
                >
                  <ha-icon
                    style=${styleMap({
                      color: entity.unavailable ? "var(--google-red-500)" : "",
                    })}
                    .icon=${entity.restored
                      ? "hass:restore-alert"
                      : entity.unavailable
                      ? "hass:alert-circle"
                      : entity.disabled_by
                      ? "hass:cancel"
                      : "hass:pencil-off"}
                  ></ha-icon>
                  <paper-tooltip position="left">
                    ${entity.restored
                      ? this.hass.localize(
                          "ui.panel.config.entities.picker.status.restored"
                        )
                      : entity.unavailable
                      ? this.hass.localize(
                          "ui.panel.config.entities.picker.status.unavailable"
                        )
                      : entity.disabled_by
                      ? this.hass.localize(
                          "ui.panel.config.entities.picker.status.disabled"
                        )
                      : this.hass.localize(
                          "ui.panel.config.entities.picker.status.readonly"
                        )}
                  </paper-tooltip>
                </div>
              `
            : "",
      };

      if (narrow) {
        columns.name.template = (name, entity: any) => {
          return html`
            ${name}<br />
            ${entity.entity_id} |
            ${this.hass.localize(`component.${entity.platform}.config.title`) ||
              entity.platform}
          `;
        };
        columns.status = statusColumn;
        return columns;
      }

      columns.entity_id = {
        title: this.hass.localize(
          "ui.panel.config.entities.picker.headers.entity_id"
        ),
        sortable: true,
        filterable: true,
        width: "20%",
      };
      columns.platform = {
        title: this.hass.localize(
          "ui.panel.config.entities.picker.headers.integration"
        ),
        sortable: true,
        filterable: true,
        width: "20%",
        template: (platform) =>
          this.hass.localize(`component.${platform}.config.title`) || platform,
      };
      columns.status = statusColumn;

      return columns;
    }
  );

  private _filteredEntities = memoize(
    (
      entities: EntityRegistryEntry[],
      stateEntities: StateEntity[],
      showDisabled: boolean,
      showUnavailable: boolean,
      showReadOnly: boolean
    ): EntityRow[] => {
      if (!showDisabled) {
        entities = entities.filter((entity) => !Boolean(entity.disabled_by));
      }

      const result: EntityRow[] = [];

      for (const entry of showReadOnly
        ? entities.concat(stateEntities)
        : entities) {
        const entity = this.hass.states[entry.entity_id];
        const unavailable = entity?.state === "unavailable";
        const restored = entity?.attributes.restored;

        if (!showUnavailable && unavailable) {
          continue;
        }

        result.push({
          ...entry,
          icon: entity
            ? stateIcon(entity)
            : domainIcon(computeDomain(entry.entity_id)),
          name:
            computeEntityRegistryName(this.hass!, entry) ||
            this.hass.localize("state.default.unavailable"),
          unavailable,
          restored,
          status: restored
            ? this.hass.localize(
                "ui.panel.config.entities.picker.status.restored"
              )
            : unavailable
            ? this.hass.localize(
                "ui.panel.config.entities.picker.status.unavailable"
              )
            : entry.disabled_by
            ? this.hass.localize(
                "ui.panel.config.entities.picker.status.disabled"
              )
            : this.hass.localize("ui.panel.config.entities.picker.status.ok"),
        });
      }

      return result;
    }
  );

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      subscribeEntityRegistry(this.hass.connection!, (entities) => {
        this._entities = entities;
      }),
    ];
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    if (!this.getDialog) {
      return;
    }
    const dialog = this.getDialog();
    if (!dialog) {
      return;
    }
    dialog.closeDialog();
  }

  protected render(): TemplateResult {
    if (!this.hass || this._entities === undefined) {
      return html`
        <hass-loading-screen></hass-loading-screen>
      `;
    }
    const headerToolbar = this._selectedEntities.length
      ? html`
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
                  <mwc-button @click=${this._enableSelected}
                    >${this.hass.localize(
                      "ui.panel.config.entities.picker.enable_selected.button"
                    )}</mwc-button
                  >
                  <mwc-button @click=${this._disableSelected}
                    >${this.hass.localize(
                      "ui.panel.config.entities.picker.disable_selected.button"
                    )}</mwc-button
                  >
                  <mwc-button @click=${this._removeSelected}
                    >${this.hass.localize(
                      "ui.panel.config.entities.picker.remove_selected.button"
                    )}</mwc-button
                  >
                `
              : html`
                  <paper-icon-button
                    id="enable-btn"
                    icon="hass:undo"
                    @click=${this._enableSelected}
                  ></paper-icon-button>
                  <paper-tooltip for="enable-btn">
                    ${this.hass.localize(
                      "ui.panel.config.entities.picker.enable_selected.button"
                    )}
                  </paper-tooltip>
                  <paper-icon-button
                    id="disable-btn"
                    icon="hass:cancel"
                    @click=${this._disableSelected}
                  ></paper-icon-button>
                  <paper-tooltip for="disable-btn">
                    ${this.hass.localize(
                      "ui.panel.config.entities.picker.disable_selected.button"
                    )}
                  </paper-tooltip>
                  <paper-icon-button
                    id="remove-btn"
                    icon="hass:delete"
                    @click=${this._removeSelected}
                  ></paper-icon-button>
                  <paper-tooltip for="remove-btn">
                    ${this.hass.localize(
                      "ui.panel.config.entities.picker.remove_selected.button"
                    )}
                  </paper-tooltip>
                `}
          </div>
        `
      : html`
          <search-input
            no-label-float
            no-underline
            @value-changed=${this._handleSearchChange}
            .filter=${this._filter}
          ></search-input>
          <paper-menu-button no-animations horizontal-align="right">
            <paper-icon-button
              aria-label=${this.hass!.localize(
                "ui.panel.config.entities.picker.filter.filter"
              )}
              title="${this.hass!.localize(
                "ui.panel.config.entities.picker.filter.filter"
              )}"
              icon="hass:filter-variant"
              slot="dropdown-trigger"
            ></paper-icon-button>
            <paper-listbox slot="dropdown-content">
              <paper-icon-item @tap="${this._showDisabledChanged}">
                <paper-checkbox
                  .checked=${this._showDisabled}
                  slot="item-icon"
                ></paper-checkbox>
                ${this.hass!.localize(
                  "ui.panel.config.entities.picker.filter.show_disabled"
                )}
              </paper-icon-item>
              <paper-icon-item @tap="${this._showRestoredChanged}">
                <paper-checkbox
                  .checked=${this._showUnavailable}
                  slot="item-icon"
                ></paper-checkbox>
                ${this.hass!.localize(
                  "ui.panel.config.entities.picker.filter.show_unavailable"
                )}
              </paper-icon-item>
              <paper-icon-item @tap="${this._showReadOnlyChanged}">
                <paper-checkbox
                  .checked=${this._showReadOnly}
                  slot="item-icon"
                ></paper-checkbox>
                ${this.hass!.localize(
                  "ui.panel.config.entities.picker.filter.show_readonly"
                )}
              </paper-icon-item>
            </paper-listbox>
          </paper-menu-button>
        `;

    return html`
      <hass-tabs-subpage-data-table
        .hass=${this.hass}
        .narrow=${this.narrow}
        back-path="/config"
        .route=${this.route}
        .tabs=${configSections.integrations}
        .columns=${this._columns(this.narrow, this.hass.language)}
        .data=${this._filteredEntities(
          this._entities,
          this._stateEntities,
          this._showDisabled,
          this._showUnavailable,
          this._showReadOnly
        )}
        .filter=${this._filter}
        selectable
        @selection-changed=${this._handleSelectionChanged}
        @row-click=${this._openEditEntry}
        id="entity_id"
      >
        <div
          class=${classMap({
            "search-toolbar": this.narrow,
            "table-header": !this.narrow,
          })}
          slot="header"
        >
          ${headerToolbar}
        </div>
      </hass-tabs-subpage-data-table>
    `;
  }

  protected firstUpdated(changedProps): void {
    super.firstUpdated(changedProps);
    loadEntityEditorDialog();
  }

  protected updated(changedProps): void {
    super.updated(changedProps);
    const oldHass = changedProps.get("hass");
    let changed = false;
    if (!this.hass || !this._entities) {
      return;
    }
    if (changedProps.has("hass") || changedProps.has("_entities")) {
      const stateEntities: StateEntity[] = [];
      const regEntityIds = new Set(
        this._entities.map((entity) => entity.entity_id)
      );
      for (const entityId of Object.keys(this.hass.states)) {
        if (regEntityIds.has(entityId)) {
          continue;
        }
        if (
          !oldHass ||
          this.hass.states[entityId] !== oldHass.states[entityId]
        ) {
          changed = true;
        }
        stateEntities.push({
          name: computeStateName(this.hass.states[entityId]),
          entity_id: entityId,
          platform: computeDomain(entityId),
          disabled_by: null,
          readonly: true,
          selectable: false,
        });
      }
      if (changed) {
        this._stateEntities = stateEntities;
      }
    }
  }

  private _showDisabledChanged() {
    this._showDisabled = !this._showDisabled;
  }

  private _showRestoredChanged() {
    this._showUnavailable = !this._showUnavailable;
  }

  private _showReadOnlyChanged() {
    this._showReadOnly = !this._showReadOnly;
  }

  private _handleSearchChange(ev: CustomEvent) {
    this._filter = ev.detail.value;
  }

  private _handleSelectionChanged(
    ev: HASSDomEvent<SelectionChangedEvent>
  ): void {
    this._selectedEntities = ev.detail.value;
  }

  private _enableSelected() {
    showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.entities.picker.enable_selected.confirm_title",
        "number",
        this._selectedEntities.length
      ),
      text: this.hass.localize(
        "ui.panel.config.entities.picker.enable_selected.confirm_text"
      ),
      confirmText: this.hass.localize("ui.common.yes"),
      dismissText: this.hass.localize("ui.common.no"),
      confirm: () => {
        this._selectedEntities.forEach((entity) =>
          updateEntityRegistryEntry(this.hass, entity, {
            disabled_by: null,
          })
        );
        this._clearSelection();
      },
    });
  }

  private _disableSelected() {
    showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.entities.picker.disable_selected.confirm_title",
        "number",
        this._selectedEntities.length
      ),
      text: this.hass.localize(
        "ui.panel.config.entities.picker.disable_selected.confirm_text"
      ),
      confirmText: this.hass.localize("ui.common.yes"),
      dismissText: this.hass.localize("ui.common.no"),
      confirm: () => {
        this._selectedEntities.forEach((entity) =>
          updateEntityRegistryEntry(this.hass, entity, {
            disabled_by: "user",
          })
        );
        this._clearSelection();
      },
    });
  }

  private _removeSelected() {
    const removeableEntities = this._selectedEntities.filter((entity) => {
      const stateObj = this.hass.states[entity];
      return stateObj?.attributes.restored;
    });
    showConfirmationDialog(this, {
      title: this.hass.localize(
        `ui.panel.config.entities.picker.remove_selected.confirm_${
          removeableEntities.length !== this._selectedEntities.length
            ? "partly_"
            : ""
        }title`,
        "number",
        removeableEntities.length
      ),
      text:
        removeableEntities.length === this._selectedEntities.length
          ? this.hass.localize(
              "ui.panel.config.entities.picker.remove_selected.confirm_text"
            )
          : this.hass.localize(
              "ui.panel.config.entities.picker.remove_selected.confirm_partly_text",
              "removable",
              removeableEntities.length,
              "selected",
              this._selectedEntities.length
            ),
      confirmText: this.hass.localize("ui.common.yes"),
      dismissText: this.hass.localize("ui.common.no"),
      confirm: () => {
        removeableEntities.forEach((entity) =>
          removeEntityRegistryEntry(this.hass, entity)
        );
        this._clearSelection();
      },
    });
  }

  private _clearSelection() {
    this._dataTable.clearSelection();
  }

  private _openEditEntry(ev: CustomEvent): void {
    const entityId = (ev.detail as RowClickedEvent).id;
    const entry = this._entities!.find(
      (entity) => entity.entity_id === entityId
    );
    this.getDialog = showEntityEditorDialog(this, {
      entry,
      entity_id: entityId,
    });
  }

  static get styles(): CSSResult {
    return css`
      hass-loading-screen {
        --app-header-background-color: var(--sidebar-background-color);
        --app-header-text-color: var(--sidebar-text-color);
      }
      a {
        color: var(--primary-color);
      }
      h2 {
        margin-top: 0;
        font-family: var(--paper-font-headline_-_font-family);
        -webkit-font-smoothing: var(
          --paper-font-headline_-_-webkit-font-smoothing
        );
        font-size: var(--paper-font-headline_-_font-size);
        font-weight: var(--paper-font-headline_-_font-weight);
        letter-spacing: var(--paper-font-headline_-_letter-spacing);
        line-height: var(--paper-font-headline_-_line-height);
        opacity: var(--dark-primary-opacity);
      }
      p {
        font-family: var(--paper-font-subhead_-_font-family);
        -webkit-font-smoothing: var(
          --paper-font-subhead_-_-webkit-font-smoothing
        );
        font-weight: var(--paper-font-subhead_-_font-weight);
        line-height: var(--paper-font-subhead_-_line-height);
      }
      ha-data-table {
        width: 100%;
        --data-table-border-width: 0;
      }
      :host(:not([narrow])) ha-data-table {
        height: calc(100vh - 65px);
        display: block;
      }
      ha-switch {
        margin-top: 16px;
      }
      .table-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        border-bottom: 1px solid rgba(var(--rgb-primary-text-color), 0.12);
      }
      search-input {
        flex-grow: 1;
        position: relative;
        top: 2px;
      }
      .search-toolbar {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        margin-left: -24px;
        color: var(--secondary-text-color);
      }
      .selected-txt {
        font-weight: bold;
        padding-left: 16px;
      }
      .table-header .selected-txt {
        margin-top: 20px;
      }
      .search-toolbar .selected-txt {
        font-size: 16px;
      }
      .header-btns > mwc-button,
      .header-btns > paper-icon-button {
        margin: 8px;
      }
    `;
  }
}

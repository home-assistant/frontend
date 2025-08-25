import { mdiDelete, mdiPlus } from "@mdi/js";
import type { PropertyValues } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import type { HASSDomEvent } from "../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../common/translations/localize";
import type {
  DataTableColumnContainer,
  SelectionChangedEvent,
  SortingChangedEvent,
} from "../../../components/data-table/ha-data-table";
import "../../../components/ha-fab";
import "../../../components/ha-button";
import "../../../components/ha-help-tooltip";
import "../../../components/ha-svg-icon";
import "../../../components/ha-icon-overflow-menu";
import type { ApplicationCredential } from "../../../data/application_credential";
import {
  deleteApplicationCredential,
  fetchApplicationCredentials,
} from "../../../data/application_credential";
import { domainToName } from "../../../data/integration";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-tabs-subpage-data-table";
import type { HaTabsSubpageDataTable } from "../../../layouts/hass-tabs-subpage-data-table";
import type { HomeAssistant, Route } from "../../../types";
import { configSections } from "../ha-panel-config";
import { showAddApplicationCredentialDialog } from "./show-dialog-add-application-credential";
import { storage } from "../../../common/decorators/storage";

@customElement("ha-config-application-credentials")
export class HaConfigApplicationCredentials extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() public _applicationCredentials: ApplicationCredential[] = [];

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  @state() private _selected: string[] = [];

  @query("hass-tabs-subpage-data-table", true)
  private _dataTable!: HaTabsSubpageDataTable;

  @storage({
    key: "application-credentials-table-sort",
    state: false,
    subscribe: false,
  })
  private _activeSorting?: SortingChangedEvent;

  @storage({
    key: "application-credentials-table-column-order",
    state: false,
    subscribe: false,
  })
  private _activeColumnOrder?: string[];

  @storage({
    key: "application-credentials-table-hidden-columns",
    state: false,
    subscribe: false,
  })
  private _activeHiddenColumns?: string[];

  @state()
  @storage({
    storage: "sessionStorage",
    key: "application-credentials-table-search",
    state: true,
    subscribe: false,
  })
  private _filter = "";

  private _columns = memoizeOne(
    (localize: LocalizeFunc): DataTableColumnContainer => {
      const columns: DataTableColumnContainer<ApplicationCredential> = {
        name: {
          title: localize(
            "ui.panel.config.application_credentials.picker.headers.name"
          ),
          main: true,
          sortable: true,
          filterable: true,
          direction: "asc",
          flex: 2,
        },
        client_id: {
          title: localize(
            "ui.panel.config.application_credentials.picker.headers.client_id"
          ),
          filterable: true,
        },
        localizedDomain: {
          title: localize(
            "ui.panel.config.application_credentials.picker.headers.application"
          ),
          sortable: true,
          filterable: true,
          direction: "asc",
        },
        actions: {
          title: "",
          label: localize("ui.panel.config.generic.headers.actions"),
          type: "overflow-menu",
          showNarrow: true,
          hideable: false,
          moveable: false,
          template: (credential) => html`
            <ha-icon-overflow-menu
              .hass=${this.hass}
              narrow
              .items=${[
                {
                  path: mdiDelete,
                  warning: true,
                  label: this.hass.localize("ui.common.delete"),
                  action: () => this._deleteCredential(credential),
                },
              ]}
            >
            </ha-icon-overflow-menu>
          `,
        },
      };

      return columns;
    }
  );

  private _getApplicationCredentials = memoizeOne(
    (applicationCredentials: ApplicationCredential[], localize: LocalizeFunc) =>
      applicationCredentials.map((credential) => ({
        ...credential,
        localizedDomain: domainToName(localize, credential.domain),
      }))
  );

  protected firstUpdated(changedProperties: PropertyValues) {
    super.firstUpdated(changedProperties);
    this._loadTranslations();
    this._fetchApplicationCredentials();
  }

  protected render() {
    return html`
      <hass-tabs-subpage-data-table
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        back-path="/config"
        .tabs=${configSections.devices}
        .columns=${this._columns(this.hass.localize)}
        .data=${this._getApplicationCredentials(
          this._applicationCredentials,
          this.hass.localize
        )}
        has-fab
        selectable
        .selected=${this._selected.length}
        @selection-changed=${this._handleSelectionChanged}
        .initialSorting=${this._activeSorting}
        .columnOrder=${this._activeColumnOrder}
        .hiddenColumns=${this._activeHiddenColumns}
        @columns-changed=${this._handleColumnsChanged}
        @sorting-changed=${this._handleSortingChanged}
        .filter=${this._filter}
        @search-changed=${this._handleSearchChange}
      >
        <div class="header-btns" slot="selection-bar">
          ${!this.narrow
            ? html`
                <ha-button
                  appearance="plain"
                  size="small"
                  @click=${this._deleteSelected}
                  variant="danger"
                  >${this.hass.localize(
                    "ui.panel.config.application_credentials.picker.remove_selected.button"
                  )}</ha-button
                >
              `
            : html`
                <ha-icon-button
                  class="warning"
                  id="remove-btn"
                  @click=${this._deleteSelected}
                  .path=${mdiDelete}
                  .label=${this.hass.localize("ui.common.remove")}
                ></ha-icon-button>
                <ha-help-tooltip
                  .label=${this.hass.localize(
                    "ui.panel.config.application_credentials.picker.remove_selected.button"
                  )}
                >
                </ha-help-tooltip>
              `}
        </div>
        <ha-fab
          slot="fab"
          .label=${this.hass.localize(
            "ui.panel.config.application_credentials.picker.add_application_credential"
          )}
          extended
          @click=${this._addApplicationCredential}
        >
          <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
        </ha-fab>
      </hass-tabs-subpage-data-table>
    `;
  }

  private _handleSelectionChanged(
    ev: HASSDomEvent<SelectionChangedEvent>
  ): void {
    this._selected = ev.detail.value;
  }

  private _deleteCredential = async (credential) => {
    const confirm = await showConfirmationDialog(this, {
      title: this.hass.localize(
        `ui.panel.config.application_credentials.picker.remove.confirm_title`
      ),
      text: this.hass.localize(
        "ui.panel.config.application_credentials.picker.remove_selected.confirm_text"
      ),
      confirmText: this.hass.localize("ui.common.delete"),
      dismissText: this.hass.localize("ui.common.cancel"),
      destructive: true,
    });
    if (!confirm) {
      return;
    }
    await deleteApplicationCredential(this.hass, credential.id);
    await this._fetchApplicationCredentials();
  };

  private _deleteSelected() {
    showConfirmationDialog(this, {
      title: this.hass.localize(
        `ui.panel.config.application_credentials.picker.remove_selected.confirm_title`,
        { number: this._selected.length }
      ),
      text: this.hass.localize(
        "ui.panel.config.application_credentials.picker.remove_selected.confirm_text"
      ),
      confirmText: this.hass.localize("ui.common.delete"),
      dismissText: this.hass.localize("ui.common.cancel"),
      destructive: true,
      confirm: async () => {
        try {
          await Promise.all(
            this._selected.map(async (applicationCredential) => {
              await deleteApplicationCredential(
                this.hass,
                applicationCredential
              );
            })
          );
        } catch (err: any) {
          showAlertDialog(this, {
            title: this.hass.localize(
              "ui.panel.config.application_credentials.picker.remove_selected.error_title"
            ),
            text: err.message,
          });
          return;
        }
        this._dataTable.clearSelection();
        await this._fetchApplicationCredentials();
      },
    });
  }

  private async _loadTranslations() {
    await this.hass.loadBackendTranslation("title", undefined, true);
  }

  private async _fetchApplicationCredentials() {
    this._applicationCredentials = await fetchApplicationCredentials(this.hass);
  }

  private _addApplicationCredential() {
    showAddApplicationCredentialDialog(this, {
      applicationCredentialAddedCallback: async (
        applicationCredential: ApplicationCredential
      ) => {
        if (applicationCredential) {
          this._applicationCredentials = [
            ...this._applicationCredentials,
            applicationCredential,
          ];
        }
      },
    });
  }

  private _handleSortingChanged(ev: CustomEvent) {
    this._activeSorting = ev.detail;
  }

  private _handleColumnsChanged(ev: CustomEvent) {
    this._activeColumnOrder = ev.detail.columnOrder;
    this._activeHiddenColumns = ev.detail.hiddenColumns;
  }

  private _handleSearchChange(ev: CustomEvent) {
    this._filter = ev.detail.value;
  }

  static styles = css`
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
      margin-inline-start: initial;
    }
    .header-btns {
      display: flex;
    }
    .header-btns > ha-button,
    .header-btns > ha-icon-button {
      margin: 8px;
    }
    ha-button-menu {
      margin-left: 8px;
      margin-inline-start: 8px;
      margin-inline-end: initial;
    }
    .warning {
      --mdc-theme-primary: var(--error-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-application-credentials": HaConfigApplicationCredentials;
  }
}

import { mdiDelete, mdiPlus } from "@mdi/js";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  nothing,
} from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import type { HASSDomEvent } from "../../../common/dom/fire_event";
import { LocalizeFunc } from "../../../common/translations/localize";
import {
  DataTableColumnContainer,
  SelectionChangedEvent,
} from "../../../components/data-table/ha-data-table";
import "../../../components/data-table/ha-data-table-icon";
import "../../../components/ha-fab";
import "../../../components/ha-help-tooltip";
import "../../../components/ha-svg-icon";
import {
  ApplicationCredential,
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
import { HomeAssistant, Route } from "../../../types";
import { configSections } from "../ha-panel-config";
import { showAddApplicationCredentialDialog } from "./show-dialog-add-application-credential";

@customElement("ha-config-application-credentials")
export class HaConfigApplicationCredentials extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() public _applicationCredentials: ApplicationCredential[] = [];

  @property() public isWide!: boolean;

  @property() public narrow!: boolean;

  @property() public route!: Route;

  @state() private _selected: string[] = [];

  @query("hass-tabs-subpage-data-table", true)
  private _dataTable!: HaTabsSubpageDataTable;

  private _columns = memoizeOne(
    (narrow: boolean, localize: LocalizeFunc): DataTableColumnContainer => {
      const columns: DataTableColumnContainer<ApplicationCredential> = {
        name: {
          title: localize(
            "ui.panel.config.application_credentials.picker.headers.name"
          ),
          direction: "asc",
          grows: true,
          template: (entry) => html`${entry.name}`,
        },
        client_id: {
          title: localize(
            "ui.panel.config.application_credentials.picker.headers.client_id"
          ),
          width: "30%",
          direction: "asc",
          hidden: narrow,
          template: (entry) => html`${entry.client_id}`,
        },
        application: {
          title: localize(
            "ui.panel.config.application_credentials.picker.headers.application"
          ),
          sortable: true,
          width: "30%",
          direction: "asc",
          template: (entry) => html`${domainToName(localize, entry.domain)}`,
        },
      };

      return columns;
    }
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
        backPath="/config"
        .tabs=${configSections.devices}
        .columns=${this._columns(this.narrow, this.hass.localize)}
        .data=${this._applicationCredentials}
        hasFab
        selectable
        @selection-changed=${this._handleSelectionChanged}
      >
        ${this._selected.length
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
                    "ui.panel.config.application_credentials.picker.selected",
                    "number",
                    this._selected.length
                  )}
                </p>
                <div class="header-btns">
                  ${!this.narrow
                    ? html`
                        <mwc-button
                          @click=${this._removeSelected}
                          class="warning"
                          >${this.hass.localize(
                            "ui.panel.config.application_credentials.picker.remove_selected.button"
                          )}</mwc-button
                        >
                      `
                    : html`
                        <ha-icon-button
                          class="warning"
                          id="remove-btn"
                          @click=${this._removeSelected}
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
              </div>
            `
          : nothing}
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

  private _removeSelected() {
    showConfirmationDialog(this, {
      title: this.hass.localize(
        `ui.panel.config.application_credentials.picker.remove_selected.confirm_title`,
        "number",
        this._selected.length
      ),
      text: this.hass.localize(
        "ui.panel.config.application_credentials.picker.remove_selected.confirm_text"
      ),
      confirmText: this.hass.localize("ui.common.remove"),
      dismissText: this.hass.localize("ui.common.cancel"),
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
        this._fetchApplicationCredentials();
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

  static get styles(): CSSResultGroup {
    return css`
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
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-application-credentials": HaConfigApplicationCredentials;
  }
}

import {
  LitElement,
  TemplateResult,
  html,
  css,
  CSSResult,
  property,
  query,
  customElement,
} from "lit-element";
import { styleMap } from "lit-html/directives/style-map";

import "@polymer/paper-checkbox/paper-checkbox";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-item/paper-icon-item";
import "@polymer/paper-listbox/paper-listbox";
import "@polymer/paper-tooltip/paper-tooltip";

import { HomeAssistant } from "../../../types";
import {
  EntityRegistryEntry,
  computeEntityRegistryName,
  subscribeEntityRegistry,
  removeEntityRegistryEntry,
  updateEntityRegistryEntry,
} from "../../../data/entity_registry";
import "../../../layouts/hass-subpage";
import "../../../layouts/hass-loading-screen";
import "../../../components/data-table/ha-data-table";
import "../../../components/ha-icon";
import { domainIcon } from "../../../common/entity/domain_icon";
import { stateIcon } from "../../../common/entity/state_icon";
import { computeDomain } from "../../../common/entity/compute_domain";
import {
  showEntityRegistryDetailDialog,
  loadEntityRegistryDetailDialog,
} from "./show-dialog-entity-registry-detail";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import memoize from "memoize-one";
// tslint:disable-next-line
import {
  DataTableColumnContainer,
  RowClickedEvent,
  SelectionChangedEvent,
  HaDataTable,
  DataTableColumnData,
} from "../../../components/data-table/ha-data-table";
import { showConfirmationDialog } from "../../../dialogs/confirmation/show-dialog-confirmation";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import { DialogEntityRegistryDetail } from "./dialog-entity-registry-detail";

@customElement("ha-config-entities")
export class HaConfigEntities extends SubscribeMixin(LitElement) {
  @property() public hass!: HomeAssistant;
  @property() public isWide!: boolean;
  @property() public narrow!: boolean;
  @property() private _entities?: EntityRegistryEntry[];
  @property() private _showDisabled = false;
  @property() private _showUnavailable = true;
  @property() private _filter = "";
  @property() private _selectedEntities: string[] = [];
  @query("ha-data-table") private _dataTable!: HaDataTable;
  private getDialog?: () => DialogEntityRegistryDetail | undefined;

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
          entity.unavailable || entity.disabled_by
            ? html`
                <div
                  tabindex="0"
                  style="display:inline-block; position: relative;"
                >
                  <ha-icon
                    style=${styleMap({
                      color: entity.unavailable ? "var(--google-red-500)" : "",
                    })}
                    .icon=${entity.unavailable
                      ? "hass:alert-circle"
                      : "hass:cancel"}
                  ></ha-icon>
                  <paper-tooltip position="left">
                    ${entity.unavailable
                      ? this.hass.localize(
                          "ui.panel.config.entities.picker.status.unavailable"
                        )
                      : this.hass.localize(
                          "ui.panel.config.entities.picker.status.disabled"
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
      };
      columns.platform = {
        title: this.hass.localize(
          "ui.panel.config.entities.picker.headers.integration"
        ),
        sortable: true,
        filterable: true,
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
      showDisabled: boolean,
      showUnavailable: boolean
    ) => {
      if (!showDisabled) {
        entities = entities.filter((entity) => !Boolean(entity.disabled_by));
      }

      return entities.reduce((result, entry) => {
        const state = this.hass!.states[entry.entity_id];

        const unavailable =
          state && (state.state === "unavailable" || state.attributes.restored); // if there is not state it is disabled

        if (!showUnavailable && unavailable) {
          return result;
        }

        result.push({
          ...entry,
          icon: state
            ? stateIcon(state)
            : domainIcon(computeDomain(entry.entity_id)),
          name:
            computeEntityRegistryName(this.hass!, entry) ||
            this.hass.localize("state.default.unavailable"),
          unavailable,
          status: unavailable
            ? this.hass.localize(
                "ui.panel.config.entities.picker.status.unavailable"
              )
            : entry.disabled_by
            ? this.hass.localize(
                "ui.panel.config.entities.picker.status.disabled"
              )
            : this.hass.localize("ui.panel.config.entities.picker.status.ok"),
        });
        return result;
      }, [] as any);
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

  protected render(): TemplateResult | void {
    if (!this.hass || this._entities === undefined) {
      return html`
        <hass-loading-screen></hass-loading-screen>
      `;
    }
    return html`
      <hass-subpage
        .header="${this.hass.localize("ui.panel.config.entities.caption")}"
        .showBackButton=${!this.isWide}
      >
        <div class="content">
          <div class="intro">
            <h2>
              ${this.hass.localize("ui.panel.config.entities.picker.header")}
            </h2>
            <p>
              ${this.hass.localize(
                "ui.panel.config.entities.picker.introduction"
              )}
            </p>

            <p>
              ${this.hass.localize(
                "ui.panel.config.entities.picker.introduction2"
              )}
            </p>
            <a href="/config/integrations">
              ${this.hass.localize(
                "ui.panel.config.entities.picker.integrations_page"
              )}
            </a>
          </div>
          <ha-data-table
            .columns=${this._columns(this.narrow, this.hass.language)}
            .data=${this._filteredEntities(
              this._entities,
              this._showDisabled,
              this._showUnavailable
            )}
            .filter=${this._filter}
            selectable
            @selection-changed=${this._handleSelectionChanged}
            @row-click=${this._openEditEntry}
            id="entity_id"
          >
            <div class="table-header" slot="header">
              ${this._selectedEntities.length
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
                      </paper-listbox>
                    </paper-menu-button>
                  `}
            </div>
          </ha-data-table>
        </div>
      </hass-subpage>
    `;
  }

  protected firstUpdated(changedProps): void {
    super.firstUpdated(changedProps);
    loadEntityRegistryDetailDialog();
  }

  private _showDisabledChanged() {
    this._showDisabled = !this._showDisabled;
  }

  private _showRestoredChanged() {
    this._showUnavailable = !this._showUnavailable;
  }

  private _handleSearchChange(ev: CustomEvent) {
    this._filter = ev.detail.value;
  }

  private _handleSelectionChanged(ev: CustomEvent): void {
    const changedSelection = ev.detail as SelectionChangedEvent;
    const entity = changedSelection.id;
    if (changedSelection.selected) {
      this._selectedEntities = [...this._selectedEntities, entity];
    } else {
      this._selectedEntities = this._selectedEntities.filter(
        (entityId) => entityId !== entity
      );
    }
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
      confirmBtnText: this.hass.localize("ui.common.yes"),
      cancelBtnText: this.hass.localize("ui.common.no"),
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
      confirmBtnText: this.hass.localize("ui.common.yes"),
      cancelBtnText: this.hass.localize("ui.common.no"),
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
        "ui.panel.config.entities.picker.remove_selected.confirm_title",
        "number",
        removeableEntities.length
      ),
      text: this.hass.localize(
        "ui.panel.config.entities.picker.remove_selected.confirm_text"
      ),
      confirmBtnText: this.hass.localize("ui.common.yes"),
      cancelBtnText: this.hass.localize("ui.common.no"),
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
    const entryId = (ev.detail as RowClickedEvent).id;
    const entry = this._entities!.find(
      (entity) => entity.entity_id === entryId
    );
    if (!entry) {
      return;
    }
    this.getDialog = showEntityRegistryDetailDialog(this, {
      entry,
    });
  }

  static get styles(): CSSResult {
    return css`
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
      .intro {
        padding: 24px 16px;
      }
      .content {
        padding: 4px;
      }
      ha-data-table {
        width: 100%;
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
      }
      .selected-txt {
        font-weight: bold;
        margin-top: 38px;
        padding-left: 16px;
      }
      .header-btns > mwc-button,
      .header-btns > paper-icon-button {
        margin: 8px;
      }
    `;
  }
}

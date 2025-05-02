import { mdiDelete, mdiPlus } from "@mdi/js";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoize from "memoize-one";
import { stringCompare } from "../../../../common/string/compare";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import type {
  DataTableColumnContainer,
  RowClickedEvent,
  SortingChangedEvent,
} from "../../../../components/data-table/ha-data-table";
import "../../../../components/ha-card";
import "../../../../components/ha-fab";
import "../../../../components/ha-svg-icon";
import type { LovelaceResource } from "../../../../data/lovelace/resource";
import {
  createResource,
  deleteResource,
  fetchResources,
  updateResource,
} from "../../../../data/lovelace/resource";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../../dialogs/generic/show-dialog-box";
import "../../../../layouts/hass-loading-screen";
import "../../../../layouts/hass-subpage";
import "../../../../layouts/hass-tabs-subpage-data-table";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../types";
import { loadLovelaceResources } from "../../../lovelace/common/load-resources";
import { lovelaceResourcesTabs } from "../ha-config-lovelace";
import { showResourceDetailDialog } from "./show-dialog-lovelace-resource-detail";
import { storage } from "../../../../common/decorators/storage";

@customElement("ha-config-lovelace-resources")
export class HaConfigLovelaceRescources extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  @state() private _resources: LovelaceResource[] = [];

  @state()
  @storage({
    storage: "sessionStorage",
    key: "lovelace-resources-table-search",
    state: true,
    subscribe: false,
  })
  private _filter = "";

  @storage({
    key: "lovelace-resources-table-sort",
    state: false,
    subscribe: false,
  })
  private _activeSorting?: SortingChangedEvent;

  @storage({
    key: "lovelace-resources-table-column-order",
    state: false,
    subscribe: false,
  })
  private _activeColumnOrder?: string[];

  @storage({
    key: "lovelace-resources-table-hidden-columns",
    state: false,
    subscribe: false,
  })
  private _activeHiddenColumns?: string[];

  private _columns = memoize(
    (
      _language,
      localize: LocalizeFunc
    ): DataTableColumnContainer<LovelaceResource> => ({
      url: {
        main: true,
        title: localize(
          "ui.panel.config.lovelace.resources.picker.headers.url"
        ),
        sortable: true,
        filterable: true,
        direction: "asc",
        flex: 2,
        forceLTR: true,
      },
      type: {
        title: localize(
          "ui.panel.config.lovelace.resources.picker.headers.type"
        ),
        sortable: true,
        filterable: true,
        template: (resource) => html`
          ${this.hass.localize(
            `ui.panel.config.lovelace.resources.types.${resource.type}`
          ) || resource.type}
        `,
      },
      delete: {
        title: "",
        label: localize(
          "ui.panel.config.lovelace.resources.picker.headers.delete"
        ),
        type: "icon-button",
        minWidth: "48px",
        maxWidth: "48px",
        showNarrow: true,
        template: (resource) =>
          html`<ha-icon-button
            @click=${this._removeResource}
            .label=${this.hass.localize("ui.common.delete")}
            .path=${mdiDelete}
            .resource=${resource}
          ></ha-icon-button>`,
      },
    })
  );

  protected render(): TemplateResult {
    if (!this.hass || this._resources === undefined) {
      return html` <hass-loading-screen></hass-loading-screen> `;
    }

    if (this.hass.config.safe_mode) {
      return html`
        <hass-subpage
          .hass=${this.hass}
          .narrow=${this.narrow}
          back-path="/config"
          .header=${this.hass.localize(
            "ui.panel.config.lovelace.resources.caption"
          )}
        >
          <div class="content">
            <ha-card outlined>
              <div class="card-content">
                <h2>
                  ${this.hass.localize(
                    "ui.panel.config.lovelace.resources.unavailable"
                  )}
                </h2>
                <p>
                  ${this.hass.localize(
                    "ui.panel.config.lovelace.resources.unavailable_safe_mode"
                  )}
                </p>
              </div>
            </ha-card>
          </div>
        </hass-subpage>
      `;
    }

    return html`
      <hass-tabs-subpage-data-table
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .tabs=${lovelaceResourcesTabs}
        .columns=${this._columns(this.hass.language, this.hass.localize)}
        .data=${this._resources}
        .noDataText=${this.hass.localize(
          "ui.panel.config.lovelace.resources.picker.no_resources"
        )}
        .initialSorting=${this._activeSorting}
        .columnOrder=${this._activeColumnOrder}
        .hiddenColumns=${this._activeHiddenColumns}
        @columns-changed=${this._handleColumnsChanged}
        @sorting-changed=${this._handleSortingChanged}
        .filter=${this._filter}
        @search-changed=${this._handleSearchChange}
        @row-click=${this._editResource}
        has-fab
        clickable
      >
        <ha-fab
          slot="fab"
          .label=${this.hass.localize(
            "ui.panel.config.lovelace.resources.picker.add_resource"
          )}
          extended
          @click=${this._addResource}
        >
          <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
        </ha-fab>
      </hass-tabs-subpage-data-table>
    `;
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this._getResources();
  }

  private async _getResources() {
    this._resources = await fetchResources(this.hass.connection);
  }

  private _editResource(ev: CustomEvent) {
    if ((this.hass.panels.lovelace?.config as any)?.mode !== "storage") {
      showAlertDialog(this, {
        text: this.hass!.localize(
          "ui.panel.config.lovelace.resources.cant_edit_yaml"
        ),
      });
      return;
    }
    const id = (ev.detail as RowClickedEvent).id;
    const resource = this._resources.find((res) => res.id === id);
    this._openDialog(resource);
  }

  private _addResource() {
    if ((this.hass.panels.lovelace?.config as any)?.mode !== "storage") {
      showAlertDialog(this, {
        text: this.hass!.localize(
          "ui.panel.config.lovelace.resources.cant_edit_yaml"
        ),
      });
      return;
    }
    this._openDialog();
  }

  private async _openDialog(resource?: LovelaceResource): Promise<void> {
    showResourceDetailDialog(this, {
      resource,
      createResource: async (values) => {
        const created = await createResource(this.hass!, values);
        this._resources = this._resources!.concat(created).sort((res1, res2) =>
          stringCompare(res1.url, res2.url, this.hass!.locale.language)
        );
        loadLovelaceResources([created], this.hass!);
      },
      updateResource: async (values) => {
        const updated = await updateResource(this.hass!, resource!.id, values);
        this._resources = this._resources!.map((res) =>
          res === resource ? updated : res
        );
        loadLovelaceResources([updated], this.hass!);
      },
    });
  }

  private _removeResource = async (event: any) => {
    const resource = event.currentTarget.resource as LovelaceResource;

    if (
      !(await showConfirmationDialog(this, {
        title: this.hass!.localize(
          "ui.panel.config.lovelace.resources.confirm_delete_title"
        ),
        text: this.hass!.localize(
          "ui.panel.config.lovelace.resources.confirm_delete_text",
          { url: resource.url }
        ),
        dismissText: this.hass!.localize("ui.common.cancel"),
        confirmText: this.hass!.localize("ui.common.delete"),
        destructive: true,
      }))
    ) {
      return false;
    }

    try {
      await deleteResource(this.hass!, resource.id);
      this._resources = this._resources!.filter(({ id }) => id !== resource.id);
      showConfirmationDialog(this, {
        title: this.hass!.localize(
          "ui.panel.config.lovelace.resources.refresh_header"
        ),
        text: this.hass!.localize(
          "ui.panel.config.lovelace.resources.refresh_body"
        ),
        confirmText: this.hass.localize("ui.common.refresh"),
        dismissText: this.hass.localize("ui.common.not_now"),
        confirm: () => location.reload(),
      });
      return true;
    } catch (_err: any) {
      return false;
    }
  };

  private _handleSortingChanged(ev: CustomEvent) {
    this._activeSorting = ev.detail;
  }

  private _handleSearchChange(ev: CustomEvent) {
    this._filter = ev.detail.value;
  }

  private _handleColumnsChanged(ev: CustomEvent) {
    this._activeColumnOrder = ev.detail.columnOrder;
    this._activeHiddenColumns = ev.detail.hiddenColumns;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .content {
          padding: 28px 20px 0;
          max-width: 1040px;
          margin: 0 auto;
        }
        h2 {
          margin-top: 0;
          margin-bottom: 12px;
        }
        p {
          margin: 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-lovelace-resources": HaConfigLovelaceRescources;
  }
}

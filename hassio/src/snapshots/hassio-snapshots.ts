import "@material/mwc-button";
import { ActionDetail } from "@material/mwc-list";
import "@material/mwc-list/mwc-list-item";
import { mdiDelete, mdiDotsVertical, mdiPlus } from "@mdi/js";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import { atLeastVersion } from "../../../src/common/config/version";
import relativeTime from "../../../src/common/datetime/relative_time";
import { HASSDomEvent } from "../../../src/common/dom/fire_event";
import {
  DataTableColumnContainer,
  RowClickedEvent,
  SelectionChangedEvent,
} from "../../../src/components/data-table/ha-data-table";
import "../../../src/components/ha-button-menu";
import "../../../src/components/ha-fab";
import { extractApiErrorMessage } from "../../../src/data/hassio/common";
import {
  fetchHassioSnapshots,
  friendlyFolderName,
  HassioSnapshot,
  reloadHassioSnapshots,
  removeSnapshot,
} from "../../../src/data/hassio/snapshot";
import { Supervisor } from "../../../src/data/supervisor/supervisor";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../src/dialogs/generic/show-dialog-box";
import "../../../src/layouts/hass-tabs-subpage-data-table";
import type { HaTabsSubpageDataTable } from "../../../src/layouts/hass-tabs-subpage-data-table";
import { haStyle } from "../../../src/resources/styles";
import { HomeAssistant, Route } from "../../../src/types";
import { showHassioCreateSnapshotDialog } from "../dialogs/snapshot/show-dialog-hassio-create-snapshot";
import { showHassioSnapshotDialog } from "../dialogs/snapshot/show-dialog-hassio-snapshot";
import { showSnapshotUploadDialog } from "../dialogs/snapshot/show-dialog-snapshot-upload";
import { supervisorTabs } from "../hassio-tabs";
import { hassioStyle } from "../resources/hassio-style";

@customElement("hassio-snapshots")
export class HassioSnapshots extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public supervisor!: Supervisor;

  @property({ type: Object }) public route!: Route;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ type: Boolean }) public isWide!: boolean;

  @state() private _selectedSnapshots: string[] = [];

  @state() private _snapshots?: HassioSnapshot[] = [];

  @query("hass-tabs-subpage-data-table", true)
  private _dataTable!: HaTabsSubpageDataTable;

  private _firstUpdatedCalled = false;

  public connectedCallback(): void {
    super.connectedCallback();
    if (this.hass && this._firstUpdatedCalled) {
      this.refreshData();
    }
  }

  public async refreshData() {
    await reloadHassioSnapshots(this.hass);
    await this.fetchSnapshots();
  }

  private _computeSnapshotContent = (snapshot: HassioSnapshot): string => {
    if (snapshot.type === "full") {
      return this.supervisor.localize("snapshot.full_snapshot");
    }
    const content: string[] = [];
    if (snapshot.content.homeassistant) {
      content.push("Home Assistant");
    }
    if (snapshot.content.folders.length !== 0) {
      for (const folder of snapshot.content.folders) {
        content.push(friendlyFolderName[folder] || folder);
      }
    }

    if (snapshot.content.addons.length !== 0) {
      for (const addon of snapshot.content.addons) {
        content.push(
          this.supervisor.supervisor.addons.find(
            (entry) => entry.slug === addon
          )?.name || addon
        );
      }
    }

    return content.join(", ");
  };

  protected firstUpdated(changedProperties: PropertyValues): void {
    super.firstUpdated(changedProperties);
    if (this.hass && this.isConnected) {
      this.refreshData();
    }
    this._firstUpdatedCalled = true;
  }

  private _columns = memoizeOne(
    (narrow: boolean): DataTableColumnContainer => ({
      name: {
        title: this.supervisor?.localize("snapshot.name") || "",
        sortable: true,
        filterable: true,
        grows: true,
        template: (entry: string, snapshot: any) =>
          html`${entry || snapshot.slug}
            <div class="secondary">${snapshot.secondary}</div>`,
      },
      date: {
        title: this.supervisor?.localize("snapshot.created") || "",
        width: "15%",
        direction: "desc",
        hidden: narrow,
        filterable: true,
        sortable: true,
        template: (entry: string) =>
          relativeTime(new Date(entry), this.hass.localize),
      },
      secondary: {
        title: "",
        hidden: true,
        filterable: true,
      },
    })
  );

  private _snapshotData = memoizeOne((snapshots: HassioSnapshot[]) =>
    snapshots.map((snapshot) => ({
      ...snapshot,
      secondary: this._computeSnapshotContent(snapshot),
    }))
  );

  protected render(): TemplateResult {
    if (!this.supervisor) {
      return html``;
    }
    return html`
      <hass-tabs-subpage-data-table
        .tabs=${supervisorTabs}
        .hass=${this.hass}
        .localizeFunc=${this.supervisor.localize}
        .searchLabel=${this.supervisor.localize("search")}
        .noDataText=${this.supervisor.localize("snapshot.no_snapshots")}
        .narrow=${this.narrow}
        .route=${this.route}
        .columns=${this._columns(this.narrow)}
        .data=${this._snapshotData(this._snapshots || [])}
        id="slug"
        @row-click=${this._handleRowClicked}
        @selection-changed=${this._handleSelectionChanged}
        clickable
        selectable
        hasFab
        main-page
        supervisor
      >
        <ha-button-menu
          corner="BOTTOM_START"
          slot="toolbar-icon"
          @action=${this._handleAction}
        >
          <ha-icon-button
            .label=${this.hass.localize("common.menu")}
            .path=${mdiDotsVertical}
            slot="trigger"
          ></ha-icon-button>
          <mwc-list-item>
            ${this.supervisor?.localize("common.reload")}
          </mwc-list-item>
          ${atLeastVersion(this.hass.config.version, 0, 116)
            ? html`<mwc-list-item>
                ${this.supervisor?.localize("snapshot.upload_snapshot")}
              </mwc-list-item>`
            : ""}
        </ha-button-menu>

        ${this._selectedSnapshots.length
          ? html`<div
              class=${classMap({
                "header-toolbar": this.narrow,
                "table-header": !this.narrow,
              })}
              slot="header"
            >
              <p class="selected-txt">
                ${this.supervisor.localize("snapshot.selected", {
                  number: this._selectedSnapshots.length,
                })}
              </p>
              <div class="header-btns">
                ${!this.narrow
                  ? html`
                      <mwc-button
                        @click=${this._deleteSelected}
                        class="warning"
                      >
                        ${this.supervisor.localize("snapshot.delete_selected")}
                      </mwc-button>
                    `
                  : html`
                      <ha-icon-button
                        .label=${this.supervisor.localize(
                          "snapshot.delete_selected"
                        )}
                        .path=${mdiDelete}
                        id="delete-btn"
                        class="warning"
                        @click=${this._deleteSelected}
                      ></ha-icon-button>
                      <paper-tooltip animation-delay="0" for="delete-btn">
                        ${this.supervisor.localize("snapshot.delete_selected")}
                      </paper-tooltip>
                    `}
              </div>
            </div> `
          : ""}

        <ha-fab
          slot="fab"
          @click=${this._createSnapshot}
          .label=${this.supervisor.localize("snapshot.create_snapshot")}
          extended
        >
          <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
        </ha-fab>
      </hass-tabs-subpage-data-table>
    `;
  }

  private _handleAction(ev: CustomEvent<ActionDetail>) {
    switch (ev.detail.index) {
      case 0:
        this.refreshData();
        break;
      case 1:
        this._showUploadSnapshotDialog();
        break;
    }
  }

  private _handleSelectionChanged(
    ev: HASSDomEvent<SelectionChangedEvent>
  ): void {
    this._selectedSnapshots = ev.detail.value;
  }

  private _showUploadSnapshotDialog() {
    showSnapshotUploadDialog(this, {
      showSnapshot: (slug: string) =>
        showHassioSnapshotDialog(this, {
          slug,
          supervisor: this.supervisor,
          onDelete: () => this.fetchSnapshots(),
        }),
      reloadSnapshot: () => this.refreshData(),
    });
  }

  private async fetchSnapshots() {
    await reloadHassioSnapshots(this.hass);
    this._snapshots = await fetchHassioSnapshots(this.hass);
  }

  private async _deleteSelected() {
    const confirm = await showConfirmationDialog(this, {
      title: this.supervisor.localize("snapshot.delete_snapshot_title"),
      text: this.supervisor.localize("snapshot.delete_snapshot_text", {
        number: this._selectedSnapshots.length,
      }),
      confirmText: this.supervisor.localize("snapshot.delete_snapshot_confirm"),
    });

    if (!confirm) {
      return;
    }

    try {
      await Promise.all(
        this._selectedSnapshots.map((slug) => removeSnapshot(this.hass, slug))
      );
    } catch (err) {
      showAlertDialog(this, {
        title: this.supervisor.localize("snapshot.failed_to_delete"),
        text: extractApiErrorMessage(err),
      });
      return;
    }
    await reloadHassioSnapshots(this.hass);
    this._snapshots = await fetchHassioSnapshots(this.hass);
    this._dataTable.clearSelection();
  }

  private _handleRowClicked(ev: HASSDomEvent<RowClickedEvent>) {
    const slug = ev.detail.id;
    showHassioSnapshotDialog(this, {
      slug,
      supervisor: this.supervisor,
      onDelete: () => this.fetchSnapshots(),
    });
  }

  private _createSnapshot() {
    if (this.supervisor!.info.state !== "running") {
      showAlertDialog(this, {
        title: this.supervisor!.localize("snapshot.could_not_create"),
        text: this.supervisor!.localize(
          "snapshot.create_blocked_not_running",
          "state",
          this.supervisor!.info.state
        ),
      });
      return;
    }
    showHassioCreateSnapshotDialog(this, {
      supervisor: this.supervisor!,
      onCreate: () => this.fetchSnapshots(),
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      hassioStyle,
      css`
        .table-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          height: 58px;
          border-bottom: 1px solid rgba(var(--rgb-primary-text-color), 0.12);
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
          color: var(--primary-text-color);
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
        .header-btns > mwc-button,
        .header-btns > mwc-icon-button {
          margin: 8px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-snapshots": HassioSnapshots;
  }
}

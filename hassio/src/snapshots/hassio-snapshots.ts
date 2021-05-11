import "@material/mwc-button";
import { ActionDetail } from "@material/mwc-list";
import "@material/mwc-list/mwc-list-item";
import { mdiDotsVertical, mdiPlus } from "@mdi/js";
import {
  CSSResultGroup,
  customElement,
  html,
  LitElement,
  property,
  PropertyValues,
  state,
  TemplateResult,
} from "lit-element";
import memoizeOne from "memoize-one";
import { atLeastVersion } from "../../../src/common/config/version";
import relativeTime from "../../../src/common/datetime/relative_time";
import { HASSDomEvent } from "../../../src/common/dom/fire_event";
import {
  DataTableColumnContainer,
  RowClickedEvent,
} from "../../../src/components/data-table/ha-data-table";
import "../../../src/components/ha-button-menu";
import "../../../src/components/ha-fab";
import {
  fetchHassioSnapshots,
  friendlyFolderName,
  HassioSnapshot,
  reloadHassioSnapshots,
} from "../../../src/data/hassio/snapshot";
import { Supervisor } from "../../../src/data/supervisor/supervisor";
import { showAlertDialog } from "../../../src/dialogs/generic/show-dialog-box";
import "../../../src/layouts/hass-tabs-subpage-data-table";
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

  private _firstUpdatedCalled = false;

  @state() private _snapshots?: HassioSnapshot[] = [];

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
        clickable
        hasFab
      >
        <ha-button-menu
          corner="BOTTOM_START"
          slot="toolbar-icon"
          @action=${this._handleAction}
        >
          <mwc-icon-button slot="trigger" alt="menu">
            <ha-svg-icon .path=${mdiDotsVertical}></ha-svg-icon>
          </mwc-icon-button>
          <mwc-list-item>
            ${this.supervisor?.localize("common.reload")}
          </mwc-list-item>
          ${atLeastVersion(this.hass.config.version, 0, 116)
            ? html`<mwc-list-item>
                ${this.supervisor?.localize("snapshot.upload_snapshot")}
              </mwc-list-item>`
            : ""}
        </ha-button-menu>

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
    return [haStyle, hassioStyle];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-snapshots": HassioSnapshots;
  }
}

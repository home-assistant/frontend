import { ActionDetail } from "@material/mwc-list";
import "@material/mwc-list/mwc-list-item";
import { mdiClose, mdiDotsVertical } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../../../../src/common/dom/fire_event";
import { slugify } from "../../../../src/common/string/slugify";
import "../../../../src/components/buttons/ha-progress-button";
import "../../../../src/components/ha-button-menu";
import "../../../../src/components/ha-header-bar";
import "../../../../src/components/ha-svg-icon";
import { getSignedPath } from "../../../../src/data/auth";
import { extractApiErrorMessage } from "../../../../src/data/hassio/common";
import {
  fetchHassioSnapshotInfo,
  HassioSnapshotDetail,
} from "../../../../src/data/hassio/snapshot";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../../src/dialogs/generic/show-dialog-box";
import { HassDialog } from "../../../../src/dialogs/make-dialog-manager";
import { haStyle, haStyleDialog } from "../../../../src/resources/styles";
import { HomeAssistant } from "../../../../src/types";
import { fileDownload } from "../../../../src/util/file_download";
import "../../components/supervisor-snapshot-content";
import type { SupervisorSnapshotContent } from "../../components/supervisor-snapshot-content";
import { HassioSnapshotDialogParams } from "./show-dialog-hassio-snapshot";

@customElement("dialog-hassio-snapshot")
class HassioSnapshotDialog
  extends LitElement
  implements HassDialog<HassioSnapshotDialogParams> {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _error?: string;

  @state() private _snapshot?: HassioSnapshotDetail;

  @state() private _dialogParams?: HassioSnapshotDialogParams;

  @state() private _restoringSnapshot = false;

  @query("supervisor-snapshot-content")
  private _snapshotContent!: SupervisorSnapshotContent;

  public async showDialog(params: HassioSnapshotDialogParams) {
    this._snapshot = await fetchHassioSnapshotInfo(this.hass, params.slug);
    this._dialogParams = params;
    this._restoringSnapshot = false;
  }

  public closeDialog() {
    this._snapshot = undefined;
    this._dialogParams = undefined;
    this._restoringSnapshot = false;
    this._error = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render(): TemplateResult {
    if (!this._dialogParams || !this._snapshot) {
      return html``;
    }
    return html`
      <ha-dialog
        open
        scrimClickAction
        @closed=${this.closeDialog}
        .heading=${true}
      >
        <div slot="heading">
          <ha-header-bar>
            <span slot="title">${this._snapshot.name}</span>
            <ha-icon-button
              .label=${this.hass.localize("common.close")}
              .path=${mdiClose}
              slot="actionItems"
              dialogAction="cancel"
            ></ha-icon-button>
          </ha-header-bar>
        </div>
        ${this._restoringSnapshot
          ? html` <ha-circular-progress active></ha-circular-progress>`
          : html`<supervisor-snapshot-content
              .hass=${this.hass}
              .supervisor=${this._dialogParams.supervisor}
              .snapshot=${this._snapshot}
              .onboarding=${this._dialogParams.onboarding || false}
              .localize=${this._dialogParams.localize}
            >
            </supervisor-snapshot-content>`}
        ${this._error ? html`<p class="error">Error: ${this._error}</p>` : ""}

        <mwc-button
          .disabled=${this._restoringSnapshot}
          slot="secondaryAction"
          @click=${this._restoreClicked}
        >
          Restore
        </mwc-button>

        ${!this._dialogParams.onboarding
          ? html`<ha-button-menu
              fixed
              slot="primaryAction"
              @action=${this._handleMenuAction}
              @closed=${(ev: Event) => ev.stopPropagation()}
            >
              <ha-icon-button
                .label=${this.hass.localize("common.menu")}
                .path=${mdiDotsVertical}
                slot="trigger"
              ></ha-icon-button>
              <mwc-list-item>Download Snapshot</mwc-list-item>
              <mwc-list-item class="error">Delete Snapshot</mwc-list-item>
            </ha-button-menu>`
          : ""}
      </ha-dialog>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        ha-svg-icon {
          color: var(--primary-text-color);
        }
        ha-circular-progress {
          display: block;
          text-align: center;
        }
        ha-header-bar {
          --mdc-theme-on-primary: var(--primary-text-color);
          --mdc-theme-primary: var(--mdc-theme-surface);
          flex-shrink: 0;
          display: block;
        }
      `,
    ];
  }

  private _handleMenuAction(ev: CustomEvent<ActionDetail>) {
    switch (ev.detail.index) {
      case 0:
        this._downloadClicked();
        break;
      case 1:
        this._deleteClicked();
        break;
    }
  }

  private async _restoreClicked() {
    const snapshotDetails = this._snapshotContent.snapshotDetails();
    this._restoringSnapshot = true;
    if (this._snapshotContent.snapshotType === "full") {
      await this._fullRestoreClicked(snapshotDetails);
    } else {
      await this._partialRestoreClicked(snapshotDetails);
    }
    this._restoringSnapshot = false;
  }

  private async _partialRestoreClicked(snapshotDetails) {
    if (
      this._dialogParams?.supervisor !== undefined &&
      this._dialogParams?.supervisor.info.state !== "running"
    ) {
      await showAlertDialog(this, {
        title: "Could not restore snapshot",
        text: `Restoring a snapshot is not possible right now because the system is in ${this._dialogParams?.supervisor.info.state} state.`,
      });
      return;
    }
    if (
      !(await showConfirmationDialog(this, {
        title: "Are you sure you want partially to restore this snapshot?",
        confirmText: "restore",
        dismissText: "cancel",
      }))
    ) {
      return;
    }

    if (!this._dialogParams?.onboarding) {
      this.hass
        .callApi(
          "POST",

          `hassio/snapshots/${this._snapshot!.slug}/restore/partial`,
          snapshotDetails
        )
        .then(
          () => {
            this.closeDialog();
          },
          (error) => {
            this._error = error.body.message;
          }
        );
    } else {
      fireEvent(this, "restoring");
      fetch(`/api/hassio/snapshots/${this._snapshot!.slug}/restore/partial`, {
        method: "POST",
        body: JSON.stringify(snapshotDetails),
      });
      this.closeDialog();
    }
  }

  private async _fullRestoreClicked(snapshotDetails) {
    if (
      this._dialogParams?.supervisor !== undefined &&
      this._dialogParams?.supervisor.info.state !== "running"
    ) {
      await showAlertDialog(this, {
        title: "Could not restore snapshot",
        text: `Restoring a snapshot is not possible right now because the system is in ${this._dialogParams?.supervisor.info.state} state.`,
      });
      return;
    }
    if (
      !(await showConfirmationDialog(this, {
        title:
          "Are you sure you want to wipe your system and restore this snapshot?",
        confirmText: "restore",
        dismissText: "cancel",
      }))
    ) {
      return;
    }

    if (!this._dialogParams?.onboarding) {
      this.hass
        .callApi(
          "POST",
          `hassio/snapshots/${this._snapshot!.slug}/restore/full`,
          snapshotDetails
        )
        .then(
          () => {
            this.closeDialog();
          },
          (error) => {
            this._error = error.body.message;
          }
        );
    } else {
      fireEvent(this, "restoring");
      fetch(`/api/hassio/snapshots/${this._snapshot!.slug}/restore/full`, {
        method: "POST",
        body: JSON.stringify(snapshotDetails),
      });
      this.closeDialog();
    }
  }

  private async _deleteClicked() {
    if (
      !(await showConfirmationDialog(this, {
        title: "Are you sure you want to delete this snapshot?",
        confirmText: "delete",
        dismissText: "cancel",
      }))
    ) {
      return;
    }

    this.hass

      .callApi("POST", `hassio/snapshots/${this._snapshot!.slug}/remove`)
      .then(
        () => {
          if (this._dialogParams!.onDelete) {
            this._dialogParams!.onDelete();
          }
          this.closeDialog();
        },
        (error) => {
          this._error = error.body.message;
        }
      );
  }

  private async _downloadClicked() {
    let signedPath: { path: string };
    try {
      signedPath = await getSignedPath(
        this.hass,
        `/api/hassio/snapshots/${this._snapshot!.slug}/download`
      );
    } catch (err) {
      await showAlertDialog(this, {
        text: extractApiErrorMessage(err),
      });
      return;
    }

    if (window.location.href.includes("ui.nabu.casa")) {
      const confirm = await showConfirmationDialog(this, {
        title: "Potential slow download",
        text:
          "Downloading snapshots over the Nabu Casa URL will take some time, it is recomended to use your local URL instead, do you want to continue?",
        confirmText: "continue",
        dismissText: "cancel",
      });
      if (!confirm) {
        return;
      }
    }

    fileDownload(
      this,
      signedPath.path,
      `home_assistant_snapshot_${slugify(this._computeName)}.tar`
    );
  }

  private get _computeName() {
    return this._snapshot
      ? this._snapshot.name || this._snapshot.slug
      : "Unnamed snapshot";
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-hassio-snapshot": HassioSnapshotDialog;
  }
}

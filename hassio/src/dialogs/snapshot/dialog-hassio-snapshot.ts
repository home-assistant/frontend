import { ActionDetail } from "@material/mwc-list";
import "@material/mwc-list/mwc-list-item";
import { mdiDotsVertical } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../../../../src/common/dom/fire_event";
import "../../../../src/components/buttons/ha-progress-button";
import "../../../../src/components/ha-button-menu";
import { createCloseHeading } from "../../../../src/components/ha-dialog";
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

  @query("supervisor-snapshot-content", true)
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
        @closing=${this.closeDialog}
        .heading=${createCloseHeading(this.hass, this._computeName)}
      >
        ${this._restoringSnapshot
          ? html` <ha-circular-progress active></ha-circular-progress>`
          : html`<supervisor-snapshot-content
              .hass=${this.hass}
              .supervisor=${this._dialogParams.supervisor}
              .snapshot=${this._snapshot}
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

        <ha-button-menu
          fixed
          slot="primaryAction"
          @action=${this._handleMenuAction}
        >
          <mwc-icon-button slot="trigger" alt="menu">
            <ha-svg-icon .path=${mdiDotsVertical}></ha-svg-icon>
          </mwc-icon-button>
          <mwc-list-item>Download Snapshot</mwc-list-item>
          <mwc-list-item class="error">Delete Snapshot</mwc-list-item>
        </ha-button-menu>
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
    this._restoringSnapshot = true;
    if (this._snapshotContent.snapshotType === "full") {
      await this._fullRestoreClicked();
    } else {
      await this._partialRestoreClicked();
    }
    this._restoringSnapshot = false;
  }

  private async _partialRestoreClicked() {
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

    const addons = this._snapshotContent
      .addons!.filter((addon) => addon.checked)
      .map((addon) => addon.slug);

    const folders = this._snapshotContent
      .folders!.filter((folder) => folder.checked)
      .map((folder) => folder.slug);

    const data: {
      homeassistant: boolean;
      addons: any;
      folders: any;
      password?: string;
    } = {
      homeassistant: this._snapshotContent.homeAssistant,
      addons,
      folders,
    };

    if (this._snapshot!.protected) {
      data.password = this._snapshotContent.snapshotPassword;
    }

    if (!this._dialogParams?.onboarding) {
      this.hass
        .callApi(
          "POST",

          `hassio/snapshots/${this._snapshot!.slug}/restore/partial`,
          data
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
        body: JSON.stringify(data),
      });
      this.closeDialog();
    }
  }

  private async _fullRestoreClicked() {
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

    const data = this._snapshot!.protected
      ? { password: this._snapshotContent.snapshotPassword }
      : undefined;
    if (!this._dialogParams?.onboarding) {
      this.hass
        .callApi(
          "POST",
          `hassio/snapshots/${this._snapshot!.slug}/restore/full`,
          data
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
        body: JSON.stringify(data),
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

    const name = this._computeName.replace(/[^a-z0-9]+/gi, "_");
    const a = document.createElement("a");
    a.href = signedPath.path;
    a.download = `Hass_io_${name}.tar`;
    this.shadowRoot!.appendChild(a);
    a.click();
    this.shadowRoot!.removeChild(a);
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

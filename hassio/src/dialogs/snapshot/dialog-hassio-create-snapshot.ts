import "@material/mwc-button";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../../../../src/common/dom/fire_event";
import "../../../../src/components/buttons/ha-progress-button";
import { createCloseHeading } from "../../../../src/components/ha-dialog";
import { extractApiErrorMessage } from "../../../../src/data/hassio/common";
import {
  createHassioFullSnapshot,
  createHassioPartialSnapshot,
} from "../../../../src/data/hassio/snapshot";
import { showAlertDialog } from "../../../../src/dialogs/generic/show-dialog-box";
import { haStyle, haStyleDialog } from "../../../../src/resources/styles";
import { HomeAssistant } from "../../../../src/types";
import "../../components/supervisor-snapshot-content";
import type { SupervisorSnapshotContent } from "../../components/supervisor-snapshot-content";
import { HassioCreateSnapshotDialogParams } from "./show-dialog-hassio-create-snapshot";

@customElement("dialog-hassio-create-snapshot")
class HassioCreateSnapshotDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _dialogParams?: HassioCreateSnapshotDialogParams;

  @state() private _error?: string;

  @state() private _creatingSnapshot = false;

  @query("supervisor-snapshot-content")
  private _snapshotContent!: SupervisorSnapshotContent;

  public showDialog(params: HassioCreateSnapshotDialogParams) {
    this._dialogParams = params;
    this._creatingSnapshot = false;
  }

  public closeDialog() {
    this._dialogParams = undefined;
    this._creatingSnapshot = false;
    this._error = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render(): TemplateResult {
    if (!this._dialogParams) {
      return html``;
    }
    return html`
      <ha-dialog
        open
        scrimClickAction
        @closed=${this.closeDialog}
        .heading=${createCloseHeading(
          this.hass,
          this._dialogParams.supervisor.localize("snapshot.create_snapshot")
        )}
      >
        ${this._creatingSnapshot
          ? html` <ha-circular-progress active></ha-circular-progress>`
          : html`<supervisor-snapshot-content
              .hass=${this.hass}
              .supervisor=${this._dialogParams.supervisor}
            >
            </supervisor-snapshot-content>`}
        ${this._error ? html`<p class="error">Error: ${this._error}</p>` : ""}
        <mwc-button slot="secondaryAction" @click=${this.closeDialog}>
          ${this._dialogParams.supervisor.localize("common.close")}
        </mwc-button>
        <mwc-button
          .disabled=${this._creatingSnapshot}
          slot="primaryAction"
          @click=${this._createSnapshot}
        >
          ${this._dialogParams.supervisor.localize("snapshot.create")}
        </mwc-button>
      </ha-dialog>
    `;
  }

  private async _createSnapshot(): Promise<void> {
    if (this._dialogParams!.supervisor.info.state !== "running") {
      showAlertDialog(this, {
        title: this._dialogParams!.supervisor.localize(
          "snapshot.could_not_create"
        ),
        text: this._dialogParams!.supervisor.localize(
          "snapshot.create_blocked_not_running",
          "state",
          this._dialogParams!.supervisor.info.state
        ),
      });
      return;
    }
    const snapshotDetails = this._snapshotContent.snapshotDetails();
    this._creatingSnapshot = true;

    this._error = "";
    if (
      this._snapshotContent.snapshotHasPassword &&
      !this._snapshotContent.snapshotPassword.length
    ) {
      this._error = this._dialogParams!.supervisor.localize(
        "snapshot.enter_password"
      );
      this._creatingSnapshot = false;
      return;
    }

    try {
      if (this._snapshotContent.snapshotType === "full") {
        await createHassioFullSnapshot(this.hass, snapshotDetails);
      } else {
        await createHassioPartialSnapshot(this.hass, snapshotDetails);
      }

      this._dialogParams!.onCreate();
      this.closeDialog();
    } catch (err) {
      this._error = extractApiErrorMessage(err);
    }
    this._creatingSnapshot = false;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        ha-circular-progress {
          display: block;
          text-align: center;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-hassio-create-snapshot": HassioCreateSnapshotDialog;
  }
}

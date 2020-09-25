import {
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { fireEvent } from "../../../../src/common/dom/fire_event";
import { createCloseHeading } from "../../../../src/components/ha-dialog";
import { HassDialog } from "../../../../src/dialogs/make-dialog-manager";
import { haStyleDialog } from "../../../../src/resources/styles";
import type { HomeAssistant } from "../../../../src/types";
import "../../components/hassio-upload-snapshot";
import { HassioSnapshotUploadDialogParams } from "./show-dialog-snapshot-upload";

@customElement("dialog-hassio-snapshot-upload")
export class DialogHassioSnapshotUpload extends LitElement
  implements HassDialog {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @internalProperty() private _params?: HassioSnapshotUploadDialogParams;

  public async showDialog(
    params: HassioSnapshotUploadDialogParams
  ): Promise<void> {
    this._params = params;
    await this.updateComplete;
  }

  public closeDialog(): void {
    this._params?.reloadSnapshot();
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render(): TemplateResult {
    if (!this._params) {
      return html``;
    }

    return html`
      <ha-dialog
        open
        scrimClickAction
        escapeKeyAction
        hideActions
        @closed=${this.closeDialog}
        .heading=${createCloseHeading(this.hass, "Upload snapshot")}
      >
        <hassio-upload-snapshot
          @snapshot-uploaded=${this._snapshotUploaded}
          .hass=${this.hass}
        ></hassio-upload-snapshot>
      </ha-dialog>
    `;
  }

  private _snapshotUploaded(ev) {
    const snapshot = ev.detail.snapshot;
    this._params?.showSnapshot(snapshot.slug);
    this.closeDialog();
  }

  static get styles(): CSSResult {
    return haStyleDialog;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-hassio-snapshot-upload": DialogHassioSnapshotUpload;
  }
}

import "@material/mwc-button/mwc-button";
import "@material/mwc-icon-button";
import "@material/mwc-tab";
import "@material/mwc-tab-bar";
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
import "../../../../src/components/ha-circular-progress";
import { createCloseHeading } from "../../../../src/components/ha-dialog";
import "../../../../src/components/ha-formfield";
import "../../../../src/components/ha-header-bar";
import "../../../../src/components/ha-radio";
import "../../../../src/components/ha-related-items";
import "../../../../src/components/ha-svg-icon";
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
    this._params!.loadData();
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
          @snapshot-uploaded=${this.closeDialog}
          .hass=${this.hass}
        ></hassio-upload-snapshot>
      </ha-dialog>
    `;
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

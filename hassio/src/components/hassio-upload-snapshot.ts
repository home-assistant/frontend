import "../../../src/components/ha-file-upload";
import "@material/mwc-icon-button/mwc-icon-button";
import { mdiFolderUpload } from "@mdi/js";
import "@polymer/iron-input/iron-input";
import "@polymer/paper-input/paper-input-container";
import {
  customElement,
  html,
  internalProperty,
  LitElement,
  TemplateResult,
} from "lit-element";
import { fireEvent } from "../../../src/common/dom/fire_event";
import "../../../src/components/ha-circular-progress";
import "../../../src/components/ha-svg-icon";
import {
  HassioSnapshot,
  uploadSnapshot,
} from "../../../src/data/hassio/snapshot";
import { HomeAssistant } from "../../../src/types";
import { showAlertDialog } from "../../../src/dialogs/generic/show-dialog-box";

declare global {
  interface HASSDomEvents {
    "snapshot-uploaded": { snapshot: HassioSnapshot };
  }
}

@customElement("hassio-upload-snapshot")
export class HassioUploadSnapshot extends LitElement {
  public hass!: HomeAssistant;

  @internalProperty() public value: string | null = null;

  @internalProperty() private _uploading = false;

  public render(): TemplateResult {
    return html`
      <ha-file-upload
        .uploading=${this._uploading}
        .icon=${mdiFolderUpload}
        accept="application/x-tar"
        label="Upload snapshot"
        @file-picked=${this._uploadFile}
        auto-open-file-dialog
      ></ha-file-upload>
    `;
  }

  private async _uploadFile(ev) {
    const file = ev.detail.files[0];

    if (!["application/x-tar"].includes(file.type)) {
      showAlertDialog(this, {
        title: "Unsupported file format",
        text: "Please choose a Home Assistant snapshot file (.tar)",
        confirmText: "ok",
      });
      return;
    }
    this._uploading = true;
    try {
      const snapshot = await uploadSnapshot(this.hass, file);
      fireEvent(this, "snapshot-uploaded", { snapshot: snapshot.data });
    } catch (err) {
      showAlertDialog(this, {
        title: "Upload failed",
        text: err.toString(),
        confirmText: "ok",
      });
    } finally {
      this._uploading = false;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-upload-snapshot": HassioUploadSnapshot;
  }
}

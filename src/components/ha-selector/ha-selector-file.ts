import { mdiFile } from "@mdi/js";
import { html, LitElement, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import { removeFile, uploadFile } from "../../data/file_upload";
import { FileSelector } from "../../data/selector";
import { showAlertDialog } from "../../dialogs/generic/show-dialog-box";
import { HomeAssistant } from "../../types";
import "../ha-file-upload";

@customElement("ha-selector-file")
export class HaFileSelector extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public selector!: FileSelector;

  @property() public value?: string;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  @state() private _filename?: { fileId: string; name: string };

  @state() private _busy = false;

  protected render() {
    return html`
      <ha-file-upload
        .hass=${this.hass}
        .accept=${this.selector.file?.accept}
        .icon=${mdiFile}
        .label=${this.label}
        .required=${this.required}
        .disabled=${this.disabled}
        .supports=${this.helper}
        .uploading=${this._busy}
        .value=${this.value
          ? this._filename?.name ||
            this.hass.localize("ui.components.selectors.file.unknown_file")
          : undefined}
        @file-picked=${this._uploadFile}
        @change=${this._removeFile}
      ></ha-file-upload>
    `;
  }

  protected willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);
    if (
      changedProps.has("value") &&
      this._filename &&
      this.value !== this._filename.fileId
    ) {
      this._filename = undefined;
    }
  }

  private async _uploadFile(ev) {
    this._busy = true;

    const file = ev.detail.files![0];

    try {
      const fileId = await uploadFile(this.hass, file);
      this._filename = { fileId, name: file.name };
      fireEvent(this, "value-changed", { value: fileId });
    } catch (err: any) {
      showAlertDialog(this, {
        text: this.hass.localize("ui.components.selectors.file.upload_failed", {
          reason: err.message || err,
        }),
      });
    } finally {
      this._busy = false;
    }
  }

  private _removeFile = async () => {
    this._busy = true;
    try {
      await removeFile(this.hass, this.value!);
    } catch (err) {
      // Not ideal if removal fails, but will be cleaned up later
    } finally {
      this._busy = false;
    }
    this._filename = undefined;
    fireEvent(this, "value-changed", { value: "" });
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-file": HaFileSelector;
  }
}

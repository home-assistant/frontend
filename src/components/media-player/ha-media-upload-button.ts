import { mdiUpload } from "@mdi/js";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import type { MediaPlayerItem } from "../../data/media-player";
import {
  isLocalMediaSourceContentId,
  uploadLocalMedia,
} from "../../data/media_source";
import { showAlertDialog } from "../../dialogs/generic/show-dialog-box";
import type { HomeAssistant } from "../../types";
import "../ha-button";
import "../ha-svg-icon";

declare global {
  interface HASSDomEvents {
    uploading: unknown;
    "media-refresh": unknown;
  }
}

@customElement("ha-media-upload-button")
class MediaUploadButton extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) currentItem?: MediaPlayerItem;

  @state() _uploading = 0;

  protected render() {
    if (
      !this.currentItem ||
      !isLocalMediaSourceContentId(this.currentItem.media_content_id || "")
    ) {
      return nothing;
    }
    return html`
      <ha-button
        .disabled=${this._uploading > 0}
        @click=${this._startUpload}
        .loading=${this._uploading > 0}
      >
        <ha-svg-icon .path=${mdiUpload} slot="start"></ha-svg-icon>
        ${this._uploading > 0
          ? this.hass.localize(
              "ui.components.media-browser.file_management.uploading",
              {
                count: this._uploading,
              }
            )
          : this.hass.localize(
              "ui.components.media-browser.file_management.add_media"
            )}
      </ha-button>
    `;
  }

  private async _startUpload() {
    if (this._uploading > 0) {
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "audio/*,video/*,image/*";
    input.multiple = true;
    input.addEventListener(
      "change",
      async () => {
        fireEvent(this, "uploading");
        const files = input.files!;
        document.body.removeChild(input);
        const target = this.currentItem!.media_content_id!;

        for (let i = 0; i < files.length; i++) {
          this._uploading = files.length - i;

          try {
            // eslint-disable-next-line no-await-in-loop
            await uploadLocalMedia(this.hass, target, files[i]);
          } catch (err: any) {
            showAlertDialog(this, {
              text: this.hass.localize(
                "ui.components.media-browser.file_management.upload_failed",
                {
                  reason: err.message || err,
                }
              ),
            });
            break;
          }
        }
        this._uploading = 0;
        fireEvent(this, "media-refresh");
      },
      { once: true }
    );
    // https://stackoverflow.com/questions/47664777/javascript-file-input-onchange-not-working-ios-safari-only
    input.style.display = "none";
    document.body.append(input);
    input.click();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-media-upload-button": MediaUploadButton;
  }
}

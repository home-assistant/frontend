import { mdiUpload } from "@mdi/js";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import type { MediaPlayerItem } from "../../data/media-player";
import {
  isLocalMediaSourceContentId,
  uploadLocalMedia,
} from "../../data/media_source";
import { showToast } from "../../util/toast";
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

        // Validate filename before upload
        const invalidFiles: string[] = [];
        const validFiles: File[] = [];

        for (const file of Array.from(files)) {
          if (file.name.includes("..")) {
            invalidFiles.push(file.name);
          } else {
            validFiles.push(file);
          }
        }

        document.body.removeChild(input);

        // Show error for invalid filenames
        if (invalidFiles.length > 0) {
          showToast(this, {
            message: this.hass.localize(
              "ui.components.media-browser.file_management.consecutive_dots_error",
              {
                count: invalidFiles.length,
                files: invalidFiles.join(", "),
              }
            ),
            duration: 6000,
          });
          // If no valid files, return early
          if (validFiles.length === 0) {
            return;
          }
        }

        const target = this.currentItem!.media_content_id!;

        for (let i = 0; i < validFiles.length; i++) {
          this._uploading = validFiles.length - i;

          try {
            // eslint-disable-next-line no-await-in-loop
            await uploadLocalMedia(this.hass, target, validFiles[i]);
          } catch (err: any) {
            showToast(this, {
              message: this.hass.localize(
                "ui.components.media-browser.file_management.upload_failed",
                {
                  reason: err.message || err,
                }
              ),
              duration: 6000,
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

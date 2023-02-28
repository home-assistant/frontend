import "@material/mwc-button";
import { mdiUpload } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import { MediaPlayerItem } from "../../data/media-player";
import {
  isLocalMediaSourceContentId,
  uploadLocalMedia,
} from "../../data/media_source";
import { showAlertDialog } from "../../dialogs/generic/show-dialog-box";
import type { HomeAssistant } from "../../types";
import "../ha-circular-progress";
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

  @property() currentItem?: MediaPlayerItem;

  @state() _uploading = 0;

  protected render() {
    if (
      !this.currentItem ||
      !isLocalMediaSourceContentId(this.currentItem.media_content_id || "")
    ) {
      return nothing;
    }
    return html`
      <mwc-button
        .label=${this._uploading > 0
          ? this.hass.localize(
              "ui.components.media-browser.file_management.uploading",
              {
                count: this._uploading,
              }
            )
          : this.hass.localize(
              "ui.components.media-browser.file_management.add_media"
            )}
        .disabled=${this._uploading > 0}
        @click=${this._startUpload}
      >
        ${this._uploading > 0
          ? html`
              <ha-circular-progress
                size="tiny"
                active
                alt=""
                slot="icon"
              ></ha-circular-progress>
            `
          : html` <ha-svg-icon .path=${mdiUpload} slot="icon"></ha-svg-icon> `}
      </mwc-button>
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

  static styles = css`
    mwc-button {
      /* We use icon + text to show disabled state */
      --mdc-button-disabled-ink-color: --mdc-theme-primary;
    }

    ha-svg-icon[slot="icon"],
    ha-circular-progress[slot="icon"] {
      vertical-align: middle;
    }

    ha-svg-icon[slot="icon"] {
      margin-inline-start: 0px;
      margin-inline-end: 8px;
      direction: var(--direction);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-media-upload-button": MediaUploadButton;
  }
}

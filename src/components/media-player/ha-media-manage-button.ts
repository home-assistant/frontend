import { mdiFolderEdit } from "@mdi/js";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import type { MediaPlayerItem } from "../../data/media-player";
import {
  isLocalMediaSourceContentId,
  isImageUploadMediaSourceContentId,
} from "../../data/media_source";
import type { HomeAssistant } from "../../types";
import "../ha-svg-icon";
import "../ha-button";
import { showMediaManageDialog } from "./show-media-manage-dialog";

declare global {
  interface HASSDomEvents {
    "media-refresh": unknown;
  }
}

@customElement("ha-media-manage-button")
class MediaManageButton extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) currentItem?: MediaPlayerItem;

  @state() _uploading = 0;

  protected render() {
    if (
      !this.currentItem ||
      !(
        isLocalMediaSourceContentId(this.currentItem.media_content_id || "") ||
        (this.hass!.user?.is_admin &&
          isImageUploadMediaSourceContentId(this.currentItem.media_content_id))
      )
    ) {
      return nothing;
    }
    return html`
      <ha-button appearance="filled" size="small" @click=${this._manage}>
        <ha-svg-icon .path=${mdiFolderEdit} slot="start"></ha-svg-icon>
        ${this.hass.localize(
          "ui.components.media-browser.file_management.manage"
        )}
      </ha-button>
    `;
  }

  private _manage() {
    showMediaManageDialog(this, {
      currentItem: this.currentItem!,
      onClose: () => fireEvent(this, "media-refresh"),
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-media-manage-button": MediaManageButton;
  }
}

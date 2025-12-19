import { animate } from "@lit-labs/motion";

import {
  mdiClose,
  mdiDelete,
  mdiCheckboxBlankOutline,
  mdiCheckboxMarkedOutline,
} from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import { fireEvent } from "../../common/dom/fire_event";
import { deleteImage, getIdFromUrl } from "../../data/image_upload";
import type { MediaPlayerItem } from "../../data/media-player";
import { MediaClassBrowserSettings } from "../../data/media-player";
import {
  browseLocalMediaPlayer,
  isImageUploadMediaSourceContentId,
  isLocalMediaSourceContentId,
  removeLocalMedia,
} from "../../data/media_source";
import { showConfirmationDialog } from "../../dialogs/generic/show-dialog-box";
import type { HomeAssistant } from "../../types";
import "../ha-button";
import "../ha-check-list-item";
import "../ha-wa-dialog";
import "../ha-dialog-header";
import "../ha-dialog-footer";
import "../ha-icon-button";
import "../ha-list";
import "../ha-spinner";
import "../ha-svg-icon";
import "../ha-tip";
import "./ha-media-player-browse";
import "./ha-media-upload-button";
import type { MediaManageDialogParams } from "./show-media-manage-dialog";

@customElement("dialog-media-manage")
class DialogMediaManage extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _currentItem?: MediaPlayerItem;

  @state() private _params?: MediaManageDialogParams;

  @state() private _uploading = false;

  @state() private _deleting = false;

  @state() private _selected = new Set<number>();

  @state() private _open = false;

  @state() private _filteredChildren: MediaPlayerItem[] = [];

  private _filesChanged = false;

  public showDialog(params: MediaManageDialogParams): void {
    this._params = params;
    this._refreshMedia();
    this._open = true;
  }

  public closeDialog() {
    this._open = false;
    return true;
  }

  private _dialogClosed(): void {
    if (this._filesChanged && this._params!.onClose) {
      this._params!.onClose();
    }
    this._params = undefined;
    this._currentItem = undefined;
    this._uploading = false;
    this._deleting = false;
    this._filesChanged = false;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected willUpdate() {
    this._filteredChildren =
      this._currentItem?.children?.filter((child) => !child.can_expand) || [];
    if (this._filteredChildren.length === 0 && this._selected.size !== 0) {
      // When running delete all, sometimes the list can throw off a spurious
      // select event that makes it think that 1 item is still selected. Clear selected
      // if nothing can be selected.
      this._selected = new Set();
    }
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    let fileIndex = 0;

    return html`
      <ha-wa-dialog
        .hass=${this.hass}
        .open=${this._open}
        ?prevent-scrim-close=${this._uploading || this._deleting}
        @closed=${this._dialogClosed}
      >
        <ha-dialog-header slot="header">
          ${!(this._uploading || this._deleting)
            ? html`<slot name="headerNavigationIcon" slot="navigationIcon">
                <ha-icon-button
                  data-dialog="close"
                  .label=${this.hass?.localize("ui.common.close") ?? "Close"}
                  .path=${mdiClose}
                ></ha-icon-button
              ></slot>`
            : nothing}
          <span class="title" slot="title" id="dialog-box-title">
            ${this.hass.localize(
              "ui.components.media-browser.file_management.title"
            )}
          </span>
          ${this._selected.size === 0
            ? html`<ha-media-upload-button
                .hass=${this.hass}
                .currentItem=${this._params.currentItem}
                @uploading=${this._startUploading}
                @media-refresh=${this._doneUploading}
                slot="actionItems"
              ></ha-media-upload-button>`
            : html`<ha-button
                variant="danger"
                slot="actionItems"
                .disabled=${this._deleting}
                @click=${this._handleDelete}
              >
                <ha-svg-icon .path=${mdiDelete} slot="start"></ha-svg-icon>
                ${this.hass.localize(
                  `ui.components.media-browser.file_management.${
                    this._deleting ? "deleting" : "delete"
                  }`,
                  { count: this._selected.size }
                )}
              </ha-button>`}
        </ha-dialog-header>
        ${!this._currentItem
          ? html`
              <div class="refresh">
                <ha-spinner></ha-spinner>
              </div>
            `
          : !this._filteredChildren.length
            ? html`<div class="no-items">
                <p>
                  ${this.hass.localize(
                    "ui.components.media-browser.file_management.no_items"
                  )}
                </p>
                ${this._currentItem?.children?.length
                  ? html`<span class="folders"
                      >${this.hass.localize(
                        "ui.components.media-browser.file_management.folders_not_supported"
                      )}</span
                    >`
                  : ""}
              </div>`
            : html`
                <div class="buttons" slot="footer">
                  <ha-button
                    appearance="filled"
                    @click=${this._handleDeselectAll}
                    .disabled=${this._selected.size === 0}
                  >
                    <ha-svg-icon
                      .path=${mdiCheckboxBlankOutline}
                      slot="start"
                    ></ha-svg-icon>
                    ${this.hass.localize(
                      `ui.components.media-browser.file_management.deselect_all`
                    )}
                  </ha-button>
                  <ha-button
                    appearance="filled"
                    @click=${this._handleSelectAll}
                    .disabled=${this._selected.size ===
                    this._filteredChildren.length}
                  >
                    <ha-svg-icon
                      .path=${mdiCheckboxMarkedOutline}
                      slot="start"
                    ></ha-svg-icon>
                    ${this.hass.localize(
                      `ui.components.media-browser.file_management.select_all`
                    )}
                  </ha-button>
                </div>
                <ha-list multi @selected=${this._handleSelected}>
                  ${repeat(
                    this._filteredChildren,
                    (item) => item.media_content_id,
                    (item) => {
                      const icon = html`
                        <ha-svg-icon
                          slot="graphic"
                          .path=${MediaClassBrowserSettings[
                            item.media_class === "directory"
                              ? item.children_media_class || item.media_class
                              : item.media_class
                          ].icon}
                        ></ha-svg-icon>
                      `;
                      return html`
                        <ha-check-list-item
                          ${animate({
                            id: item.media_content_id,
                            skipInitial: true,
                          })}
                          graphic="icon"
                          .disabled=${this._uploading || this._deleting}
                          .selected=${this._selected.has(fileIndex++)}
                          .item=${item}
                        >
                          ${icon} ${item.title}
                        </ha-check-list-item>
                      `;
                    }
                  )}
                </ha-list>
              `}
        ${isComponentLoaded(this.hass, "hassio")
          ? html`<ha-tip .hass=${this.hass}>
              ${this.hass.localize(
                "ui.components.media-browser.file_management.tip_media_storage",
                {
                  storage: html`<a
                    href="/config/storage"
                    @click=${this.closeDialog}
                  >
                    ${this.hass.localize(
                      "ui.components.media-browser.file_management.tip_storage_panel"
                    )}</a
                  >`,
                }
              )}
            </ha-tip>`
          : nothing}
      </ha-wa-dialog>
    `;
  }

  private _handleSelected(ev) {
    this._selected = ev.detail.index;
  }

  private _startUploading() {
    this._uploading = true;
    this._filesChanged = true;
  }

  private _doneUploading() {
    this._uploading = false;
    this._refreshMedia();
  }

  private _handleDeselectAll() {
    if (this._selected.size) {
      this._selected = new Set();
    }
  }

  private _handleSelectAll() {
    this._selected = new Set([...Array(this._filteredChildren.length).keys()]);
  }

  private async _handleDelete() {
    if (
      !(await showConfirmationDialog(this, {
        text: this.hass.localize(
          "ui.components.media-browser.file_management.confirm_delete",
          { count: this._selected.size }
        ),
        warning: true,
      }))
    ) {
      return;
    }
    this._filesChanged = true;
    this._deleting = true;

    const toDelete: MediaPlayerItem[] = [];
    let fileIndex = 0;
    this._currentItem!.children!.forEach((item) => {
      if (item.can_expand) {
        return;
      }
      if (this._selected.has(fileIndex++)) {
        toDelete.push(item);
      }
    });

    try {
      await Promise.all(
        toDelete.map(async (item) => {
          if (isLocalMediaSourceContentId(item.media_content_id)) {
            await removeLocalMedia(this.hass, item.media_content_id);
          } else if (isImageUploadMediaSourceContentId(item.media_content_id)) {
            const media_id = getIdFromUrl(item.media_content_id);
            if (media_id) {
              await deleteImage(this.hass, media_id);
            }
          }
          this._currentItem = {
            ...this._currentItem!,
            children: this._currentItem!.children!.filter((i) => i !== item),
          };
        })
      );
    } finally {
      this._deleting = false;
      this._selected = new Set();
    }
  }

  private async _refreshMedia() {
    this._selected = new Set();
    this._currentItem = undefined;
    this._currentItem = await browseLocalMediaPlayer(
      this.hass,
      this._params!.currentItem.media_content_id
    );
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        ha-wa-dialog {
          --dialog-content-padding: 0;
        }
        ha-dialog-header ha-media-upload-button,
        ha-dialog-header ha-button {
          --mdc-theme-primary: var(--primary-text-color);
          margin: 6px;
          display: block;
        }

        ha-tip {
          margin: 16px;
        }

        .refresh {
          display: flex;
          height: 200px;
          justify-content: center;
          align-items: center;
        }
        .buttons {
          display: flex;
          justify-content: center;
          width: 100%;
        }
        .no-items {
          text-align: center;
          padding: 16px;
        }
        .folders {
          color: var(--secondary-text-color);
          font-style: italic;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-media-manage": DialogMediaManage;
  }
}

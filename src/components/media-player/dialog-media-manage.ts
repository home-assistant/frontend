import { animate } from "@lit-labs/motion";
import "@material/mwc-list/mwc-list";
import "@material/mwc-list/mwc-list-item";
import { mdiClose, mdiDelete } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import { fireEvent } from "../../common/dom/fire_event";
import { computeRTLDirection } from "../../common/util/compute_rtl";
import {
  MediaClassBrowserSettings,
  MediaPlayerItem,
} from "../../data/media-player";
import {
  browseLocalMediaPlayer,
  removeLocalMedia,
} from "../../data/media_source";
import { showConfirmationDialog } from "../../dialogs/generic/show-dialog-box";
import { haStyleDialog } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import "../ha-button";
import "../ha-check-list-item";
import "../ha-circular-progress";
import "../ha-dialog";
import "../ha-dialog-header";
import "../ha-svg-icon";
import "../ha-tip";
import "./ha-media-player-browse";
import "./ha-media-upload-button";
import type { MediaManageDialogParams } from "./show-media-manage-dialog";
import { isComponentLoaded } from "../../common/config/is_component_loaded";

@customElement("dialog-media-manage")
class DialogMediaManage extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _currentItem?: MediaPlayerItem;

  @state() private _params?: MediaManageDialogParams;

  @state() private _uploading = false;

  @state() private _deleting = false;

  @state() private _selected = new Set<number>();

  private _filesChanged = false;

  public showDialog(params: MediaManageDialogParams): void {
    this._params = params;
    this._refreshMedia();
  }

  public closeDialog() {
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

  protected render() {
    if (!this._params) {
      return nothing;
    }

    const children =
      this._currentItem?.children?.filter((child) => !child.can_expand) || [];

    let fileIndex = 0;

    return html`
      <ha-dialog
        open
        scrimClickAction
        escapeKeyAction
        hideActions
        flexContent
        .heading=${this._params.currentItem.title}
        @closed=${this.closeDialog}
      >
        <ha-dialog-header slot="heading">
          ${this._selected.size === 0
            ? html`
                <span slot="title">
                  ${this.hass.localize(
                    "ui.components.media-browser.file_management.title"
                  )}
                </span>

                <ha-media-upload-button
                  .disabled=${this._deleting}
                  .hass=${this.hass}
                  .currentItem=${this._params.currentItem}
                  @uploading=${this._startUploading}
                  @media-refresh=${this._doneUploading}
                  slot="actionItems"
                ></ha-media-upload-button>
                ${this._uploading
                  ? ""
                  : html`
                      <ha-icon-button
                        .label=${this.hass.localize("ui.dialogs.generic.close")}
                        .path=${mdiClose}
                        dialogAction="close"
                        slot="navigationIcon"
                        dir=${computeRTLDirection(this.hass)}
                      ></ha-icon-button>
                    `}
              `
            : html`
                <ha-button
                  class="danger"
                  slot="title"
                  .disabled=${this._deleting}
                  .label=${this.hass.localize(
                    `ui.components.media-browser.file_management.${
                      this._deleting ? "deleting" : "delete"
                    }`,
                    { count: this._selected.size }
                  )}
                  @click=${this._handleDelete}
                >
                  <ha-svg-icon .path=${mdiDelete} slot="icon"></ha-svg-icon>
                </ha-button>

                ${this._deleting
                  ? ""
                  : html`
                      <ha-button
                        slot="actionItems"
                        .label=${`Deselect all`}
                        @click=${this._handleDeselectAll}
                      >
                        <ha-svg-icon
                          .path=${mdiClose}
                          slot="icon"
                        ></ha-svg-icon>
                      </ha-button>
                    `}
              `}
        </ha-dialog-header>
        ${!this._currentItem
          ? html`
              <div class="refresh">
                <ha-circular-progress active></ha-circular-progress>
              </div>
            `
          : !children.length
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
              <mwc-list multi @selected=${this._handleSelected}>
                ${repeat(
                  children,
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
              </mwc-list>
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
                    ${this.hass
                      .localize(
                        "ui.components.media-browser.file_management.tip_storage_panel"
                      )
                      .toLowerCase()}
                  </a>`,
                }
              )}
            </ha-tip>`
          : nothing}
      </ha-dialog>
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
          await removeLocalMedia(this.hass, item.media_content_id);
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
      haStyleDialog,
      css`
        ha-dialog {
          --dialog-z-index: 9;
          --dialog-content-padding: 0;
        }

        @media (min-width: 800px) {
          ha-dialog {
            --mdc-dialog-max-width: 800px;
            --dialog-surface-position: fixed;
            --dialog-surface-top: 40px;
            --mdc-dialog-max-height: calc(100vh - 72px);
          }
        }

        ha-dialog-header ha-media-upload-button,
        ha-dialog-header ha-button {
          --mdc-theme-primary: var(--primary-text-color);
          margin: 6px;
          display: block;
        }

        mwc-list {
          direction: ltr;
        }

        .danger {
          --mdc-theme-primary: var(--error-color);
        }

        ha-svg-icon[slot="icon"] {
          vertical-align: middle;
        }

        ha-tip {
          margin: 16px;
        }

        ha-svg-icon[slot="icon"] {
          margin-inline-start: 0px !important;
          margin-inline-end: 8px !important;
          direction: var(--direction);
        }

        .refresh {
          display: flex;
          height: 200px;
          justify-content: center;
          align-items: center;
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

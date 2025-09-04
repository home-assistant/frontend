import {
  mdiAlphaABoxOutline,
  mdiArrowLeft,
  mdiClose,
  mdiDotsVertical,
  mdiGrid,
  mdiListBoxOutline,
} from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import type { HASSDomEvent } from "../../common/dom/fire_event";
import { fireEvent } from "../../common/dom/fire_event";
import { stopPropagation } from "../../common/dom/stop_propagation";
import type {
  MediaPickedEvent,
  MediaPlayerBrowseAction,
  MediaPlayerItem,
  MediaPlayerLayoutType,
} from "../../data/media-player";
import { haStyleDialog } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import "../ha-dialog";
import "../ha-dialog-header";
import "../ha-md-button-menu";
import "../ha-md-menu-item";
import "./ha-media-manage-button";
import "./ha-media-player-browse";
import type {
  HaMediaPlayerBrowse,
  MediaPlayerItemId,
} from "./ha-media-player-browse";
import type { MediaPlayerBrowseDialogParams } from "./show-media-browser-dialog";

@customElement("dialog-media-player-browse")
class DialogMediaPlayerBrowse extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _currentItem?: MediaPlayerItem;

  @state() private _navigateIds?: MediaPlayerItemId[];

  @state() private _params?: MediaPlayerBrowseDialogParams;

  @state() _preferredLayout: MediaPlayerLayoutType = "auto";

  @query("ha-media-player-browse") private _browser!: HaMediaPlayerBrowse;

  public showDialog(params: MediaPlayerBrowseDialogParams): void {
    this._params = params;
    this._navigateIds = params.navigateIds || [
      {
        media_content_id: undefined,
        media_content_type: undefined,
      },
    ];
  }

  public closeDialog() {
    this._params = undefined;
    this._navigateIds = undefined;
    this._currentItem = undefined;
    this._preferredLayout = "auto";
    this.classList.remove("opened");
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params || !this._navigateIds) {
      return nothing;
    }

    return html`
      <ha-dialog
        open
        scrimClickAction
        escapeKeyAction
        hideActions
        flexContent
        .heading=${!this._currentItem
          ? this.hass.localize(
              "ui.components.media-browser.media-player-browser"
            )
          : this._currentItem.title}
        @closed=${this.closeDialog}
        @opened=${this._dialogOpened}
      >
        <ha-dialog-header show-border slot="heading">
          ${this._navigateIds.length > (this._params.minimumNavigateLevel ?? 1)
            ? html`
                <ha-icon-button
                  slot="navigationIcon"
                  .path=${mdiArrowLeft}
                  @click=${this._goBack}
                ></ha-icon-button>
              `
            : nothing}
          <span slot="title">
            ${!this._currentItem
              ? this.hass.localize(
                  "ui.components.media-browser.media-player-browser"
                )
              : this._currentItem.title}
          </span>
          <ha-media-manage-button
            slot="actionItems"
            .hass=${this.hass}
            .currentItem=${this._currentItem}
            @media-refresh=${this._refreshMedia}
          ></ha-media-manage-button>
          <ha-md-button-menu
            slot="actionItems"
            @closed=${stopPropagation}
            positioning="fixed"
          >
            <ha-icon-button
              slot="trigger"
              .label=${this.hass.localize("ui.common.menu")}
              .path=${mdiDotsVertical}
            ></ha-icon-button>
            <ha-md-menu-item @click=${this._setAutoLayout}>
              ${this.hass.localize("ui.components.media-browser.auto")}
              <ha-svg-icon
                class=${this._preferredLayout === "auto"
                  ? "selected_menu_item"
                  : ""}
                slot="start"
                .path=${mdiAlphaABoxOutline}
              ></ha-svg-icon>
            </ha-md-menu-item>
            <ha-md-menu-item @click=${this._setGridLayout}>
              ${this.hass.localize("ui.components.media-browser.grid")}
              <ha-svg-icon
                class=${this._preferredLayout === "grid"
                  ? "selected_menu_item"
                  : ""}
                slot="start"
                .path=${mdiGrid}
              ></ha-svg-icon>
            </ha-md-menu-item>
            <ha-md-menu-item @click=${this._setListLayout}>
              ${this.hass.localize("ui.components.media-browser.list")}
              <ha-svg-icon
                slot="start"
                class=${this._preferredLayout === "list"
                  ? "selected_menu_item"
                  : ""}
                .path=${mdiListBoxOutline}
              ></ha-svg-icon>
            </ha-md-menu-item>
          </ha-md-button-menu>
          <ha-icon-button
            .label=${this.hass.localize("ui.common.close")}
            .path=${mdiClose}
            dialogAction="close"
            slot="actionItems"
          ></ha-icon-button>
        </ha-dialog-header>
        <ha-media-player-browse
          dialog
          .hass=${this.hass}
          .entityId=${this._params.entityId}
          .navigateIds=${this._navigateIds}
          .action=${this._action}
          .preferredLayout=${this._preferredLayout}
          .accept=${this._params.accept}
          @close-dialog=${this.closeDialog}
          @media-picked=${this._mediaPicked}
          @media-browsed=${this._mediaBrowsed}
        ></ha-media-player-browse>
      </ha-dialog>
    `;
  }

  private _dialogOpened() {
    this.classList.add("opened");
  }

  private _setAutoLayout() {
    this._preferredLayout = "auto";
  }

  private _setGridLayout() {
    this._preferredLayout = "grid";
  }

  private _setListLayout() {
    this._preferredLayout = "list";
  }

  private _goBack() {
    this._navigateIds = this._navigateIds?.slice(0, -1);
    this._currentItem = undefined;
  }

  private _mediaBrowsed(ev: { detail: HASSDomEvents["media-browsed"] }) {
    this._navigateIds = ev.detail.ids;
    this._currentItem = ev.detail.current;
  }

  private _mediaPicked(ev: HASSDomEvent<MediaPickedEvent>): void {
    this._params!.mediaPickedCallback(ev.detail);
    if (this._action !== "play") {
      this.closeDialog();
    }
  }

  private get _action(): MediaPlayerBrowseAction {
    return this._params!.action || "play";
  }

  private _refreshMedia() {
    this._browser.refresh();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-dialog {
          --dialog-z-index: 9;
          --dialog-content-padding: 0;
        }

        ha-media-player-browse {
          --media-browser-max-height: calc(100vh - 65px);
        }

        :host(.opened) ha-media-player-browse {
          height: calc(100vh - 65px);
        }

        @media (min-width: 800px) {
          ha-dialog {
            --mdc-dialog-max-width: 800px;
            --dialog-surface-position: fixed;
            --dialog-surface-top: 40px;
            --mdc-dialog-max-height: calc(100vh - 72px);
          }
          ha-media-player-browse {
            position: initial;
            --media-browser-max-height: calc(100vh - 145px);
            width: 700px;
          }
        }

        ha-dialog-header ha-media-manage-button {
          --mdc-theme-primary: var(--primary-text-color);
          margin: 6px;
          display: block;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-media-player-browse": DialogMediaPlayerBrowse;
  }
}

import "../ha-header-bar";
import { mdiArrowLeft, mdiClose } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent, HASSDomEvent } from "../../common/dom/fire_event";
import { computeRTLDirection } from "../../common/util/compute_rtl";
import type {
  MediaPickedEvent,
  MediaPlayerBrowseAction,
  MediaPlayerItem,
} from "../../data/media-player";
import { haStyleDialog } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import "../ha-dialog";
import "./ha-media-player-browse";
import "./ha-media-manage-button";
import type {
  HaMediaPlayerBrowse,
  MediaPlayerItemId,
} from "./ha-media-player-browse";
import { MediaPlayerBrowseDialogParams } from "./show-media-browser-dialog";

@customElement("dialog-media-player-browse")
class DialogMediaPlayerBrowse extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _currentItem?: MediaPlayerItem;

  @state() private _navigateIds?: MediaPlayerItemId[];

  @state() private _params?: MediaPlayerBrowseDialogParams;

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
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render(): TemplateResult {
    if (!this._params || !this._navigateIds) {
      return html``;
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
      >
        <ha-header-bar slot="heading">
          ${this._navigateIds.length > 1
            ? html`
                <ha-icon-button
                  slot="navigationIcon"
                  .path=${mdiArrowLeft}
                  @click=${this._goBack}
                ></ha-icon-button>
              `
            : ""}
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
          <ha-icon-button
            .label=${this.hass.localize("ui.dialogs.generic.close")}
            .path=${mdiClose}
            dialogAction="close"
            slot="actionItems"
            class="header_button"
            dir=${computeRTLDirection(this.hass)}
          ></ha-icon-button>
        </ha-header-bar>
        <ha-media-player-browse
          dialog
          .hass=${this.hass}
          .entityId=${this._params.entityId}
          .navigateIds=${this._navigateIds}
          .action=${this._action}
          @close-dialog=${this.closeDialog}
          @media-picked=${this._mediaPicked}
          @media-browsed=${this._mediaBrowsed}
        ></ha-media-player-browse>
      </ha-dialog>
    `;
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
          --dialog-z-index: 8;
          --dialog-content-padding: 0;
        }

        ha-media-player-browse {
          --media-browser-max-height: calc(100vh - 65px);
          height: calc(100vh - 65px);
          direction: ltr;
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
            --media-browser-max-height: 100vh - 137px;
            height: 100vh - 137px;
            width: 700px;
          }
        }

        ha-header-bar {
          --mdc-theme-on-primary: var(--primary-text-color);
          --mdc-theme-primary: var(--mdc-theme-surface);
          flex-shrink: 0;
          border-bottom: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
        }

        ha-media-manage-button {
          --mdc-theme-primary: var(--mdc-theme-on-primary);
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

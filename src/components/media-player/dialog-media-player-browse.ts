import { mdiArrowLeft, mdiClose } from "@mdi/js";
import {
  css,
  CSSResultArray,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  query,
  TemplateResult,
} from "lit-element";
import { HASSDomEvent } from "../../common/dom/fire_event";
import type {
  MediaPickedEvent,
  MediaPlayerBrowseAction,
} from "../../data/media-player";
import { haStyleDialog } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import { HaDialog } from "../ha-dialog";
import "../ha-header-bar";
import "./ha-media-player-browse";
import type {
  HaMediaPlayerBrowse,
  MediaBrowserNavigatedEvent,
} from "./ha-media-player-browse";
import { MediaPlayerBrowseDialogParams } from "./show-media-browser-dialog";

@customElement("dialog-media-player-browse")
class DialogMediaPlayerBrowse extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @internalProperty() private _entityId!: string;

  @internalProperty() private _mediaContentId?: string;

  @internalProperty() private _mediaContentType?: string;

  @internalProperty() private _action?: MediaPlayerBrowseAction;

  @internalProperty() private _params?: MediaPlayerBrowseDialogParams;

  @internalProperty() private _root = true;

  @internalProperty() private _title?: string;

  @query("ha-dialog") private _dialog?: HaDialog;

  @query("ha-media-player-browse") private _mediaBrowser?: HaMediaPlayerBrowse;

  public async showDialog(
    params: MediaPlayerBrowseDialogParams
  ): Promise<void> {
    this._params = params;
    this._entityId = this._params.entityId;
    this._mediaContentId = this._params.mediaContentId;
    this._mediaContentType = this._params.mediaContentType;
    this._action = this._params.action || "play";

    await this.updateComplete;
  }

  protected render(): TemplateResult {
    if (!this._params) {
      return html``;
    }

    return html`
      <ha-dialog
        open
        scrimClickAction
        escapeKeyAction
        hideActions
        .heading=${true}
        @closed=${this._closeDialog}
      >
        <ha-header-bar slot="heading">
          ${!this._root
            ? html`<mwc-icon-button
                slot="navigationIcon"
                label="Back"
                @click=${this._navigateBack}
              >
                <ha-svg-icon .path=${mdiArrowLeft}></ha-svg-icon>
              </mwc-icon-button>`
            : ""}
          <div slot="title" class="main-title">
            ${this._title ||
            this.hass.localize(
              "ui.components.media-browser.media-player-browser"
            )}
          </div>
          <mwc-icon-button
            slot="actionItems"
            .label=${this.hass.localize("ui.dialogs.more_info_control.dismiss")}
            dialogAction="cancel"
          >
            <ha-svg-icon .path=${mdiClose}></ha-svg-icon>
          </mwc-icon-button>
        </ha-header-bar>
        <ha-media-player-browse
          .hass=${this.hass}
          .entityId=${this._entityId}
          .action=${this._action!}
          .mediaContentId=${this._mediaContentId}
          .mediaContentType=${this._mediaContentType}
          hideBack
          hideTitle
          @media-picked=${this._mediaPicked}
          @media-browser-navigated=${this._navigated}
        ></ha-media-player-browse>
      </ha-dialog>
    `;
  }

  private _closeDialog() {
    this._params = undefined;
  }

  private _mediaPicked(ev: HASSDomEvent<MediaPickedEvent>): void {
    this._params!.mediaPickedCallback(ev.detail);
    if (this._action !== "play") {
      this._closeDialog();
    }
  }

  private _navigateBack() {
    this._mediaBrowser?.navigateBack();
  }

  private _navigated(ev: HASSDomEvent<MediaBrowserNavigatedEvent>) {
    this._root = ev.detail.root;
    this._title = ev.detail.title;
    this._dialog!.scrollToPos(0, 0);
  }

  static get styles(): CSSResultArray {
    return [
      haStyleDialog,
      css`
        ha-dialog {
          --dialog-z-index: 8;
          --dialog-content-padding: 0;
        }

        ha-header-bar {
          --mdc-theme-on-primary: var(--primary-text-color);
          --mdc-theme-primary: var(--mdc-theme-surface);
          flex-shrink: 0;
          border-bottom: 1px solid
            var(--mdc-dialog-scroll-divider-color, rgba(0, 0, 0, 0.12));
        }

        @media (min-width: 800px) {
          ha-dialog {
            --mdc-dialog-max-width: 800px;
          }
          ha-media-player-browse {
            width: 700px;
            padding: 20px 24px;
          }
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

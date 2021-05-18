import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent, HASSDomEvent } from "../../common/dom/fire_event";
import type {
  MediaPickedEvent,
  MediaPlayerBrowseAction,
} from "../../data/media-player";
import { haStyleDialog } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import "../ha-dialog";
import "./ha-media-player-browse";
import { MediaPlayerBrowseDialogParams } from "./show-media-browser-dialog";

@customElement("dialog-media-player-browse")
class DialogMediaPlayerBrowse extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _entityId!: string;

  @state() private _mediaContentId?: string;

  @state() private _mediaContentType?: string;

  @state() private _action?: MediaPlayerBrowseAction;

  @state() private _params?: MediaPlayerBrowseDialogParams;

  public showDialog(params: MediaPlayerBrowseDialogParams): void {
    this._params = params;
    this._entityId = this._params.entityId;
    this._mediaContentId = this._params.mediaContentId;
    this._mediaContentType = this._params.mediaContentType;
    this._action = this._params.action || "play";
  }

  public closeDialog() {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
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
        flexContent
        @closed=${this.closeDialog}
      >
        <ha-media-player-browse
          dialog
          .hass=${this.hass}
          .entityId=${this._entityId}
          .action=${this._action!}
          .mediaContentId=${this._mediaContentId}
          .mediaContentType=${this._mediaContentType}
          @close-dialog=${this.closeDialog}
          @media-picked=${this._mediaPicked}
        ></ha-media-player-browse>
      </ha-dialog>
    `;
  }

  private _mediaPicked(ev: HASSDomEvent<MediaPickedEvent>): void {
    this._params!.mediaPickedCallback(ev.detail);
    if (this._action !== "play") {
      this.closeDialog();
    }
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
          --media-browser-max-height: 100vh;
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
            --media-browser-max-height: 100vh - 72px;
            width: 700px;
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

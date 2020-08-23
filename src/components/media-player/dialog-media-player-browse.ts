import {
  LitElement,
  property,
  internalProperty,
  html,
  TemplateResult,
  CSSResultArray,
  css,
  customElement,
} from "lit-element";
import type { HomeAssistant } from "../../types";
import type {
  MediaPlayerBrowseAction,
  MediaPickedEvent,
} from "../../data/media-player";
import { createCloseHeading } from "../ha-dialog";
import "./ha-media-player-browse";
import { HASSDomEvent, fireEvent } from "../../common/dom/fire_event";
import { haStyleDialog } from "../../resources/styles";

interface MediaPlayerBrowseDialogParams {
  action: MediaPlayerBrowseAction;
  entityId: string;
  mediaContentId?: string;
  mediaContentType?: string;
}

@customElement("dialog-media-player-browse")
class DialogMediaPlayerBrowse extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @internalProperty() private _entityId!: string;

  @internalProperty() private _mediaContentId?: string;

  @internalProperty() private _mediaContentType?: string;

  @internalProperty() private _action?: MediaPlayerBrowseAction;

  @internalProperty() private _params?: MediaPlayerBrowseDialogParams;

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
        .heading=${createCloseHeading(
          this.hass,
          this.hass.localize(`ui.components.media-browser.media-player-browser`)
        )}
        @closed=${this._closeDialog}
      >
        <ha-media-player-browse
          .hass=${this.hass}
          .entityId=${this._entityId}
          .action=${this._action}
          .mediaContentId=${this._mediaContentId}
          .mediaContentType=${this._mediaContentType}
          @media-picked=${this._mediaPicked}
        ></ha-media-player-browse>
      </ha-dialog>
    `;
  }

  private _closeDialog() {
    this._params = undefined;
  }

  private _mediaPicked(ev: HASSDomEvent<MediaPickedEvent>): void {
    const mediaPicked = ev.detail;

    fireEvent(this, "media-picked", mediaPicked);
    this._closeDialog();
  }

  static get styles(): CSSResultArray {
    return [haStyleDialog, css``];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-media-player-browse": DialogMediaPlayerBrowse;
  }
}

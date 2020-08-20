import {
  LitElement,
  html,
  customElement,
  property,
  PropertyValues,
  internalProperty,
  css,
} from "lit-element";
import { mdiPlay, mdiFolder } from "@mdi/js";

import { haStyle } from "../../resources/styles";
import { MediaPlayerItem, browseMediaPlayer } from "../../data/media-player";
import type { HomeAssistant } from "../../types";

import "../ha-circular-progress";
import "../ha-svg-icon";

@customElement("ha-media-player-browse")
export class HaMediaPlayerBrowse extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public entityId!: string;

  @property() public mediaContentId?: string;

  @property() public mediaContentType?: string;

  @internalProperty() private _loading = false;

  @internalProperty() private _mediaPlayerItems: MediaPlayerItem[] = [];

  public render() {
    if (!this._mediaPlayerItems.length) {
      return html``;
    }

    if (this._loading) {
      return html`<ha-circular-progress active></ha-circular-progress>`;
    }

    const mostRecentItem = this._mediaPlayerItems[
      this._mediaPlayerItems.length - 1
    ];
    const previousItem =
      this._mediaPlayerItems.length > 1
        ? this._mediaPlayerItems[this._mediaPlayerItems.length - 2]
        : undefined;

    return html`
      <div class="breadcrumb">
        <h2>${mostRecentItem.title}</h2>
        ${previousItem // navigating back to root doesn't work as the root id is a UUID and overload int(10), JJ is aware
          ? html`
              <div
                .previous=${true}
                .item=${previousItem}
                @click=${this._navigate}
              >
                ${previousItem.title}
              </div>
            `
          : ""}
      </div>
      ${mostRecentItem.children?.length
        ? html`
            ${mostRecentItem.children.map(
              (child) => html`
                <div class="child" @click=${this._navigate} .item=${child}>
                  <div class="image-icon">
                    ${child.thumbnail
                      ? html`<img .src=${child.thumbnail} />` // If no thumbnail, display icon of media type
                      : child.can_expand
                      ? html`<ha-svg-icon .path=${mdiFolder}></ha-svg-icon>`
                      : ""}
                  </div>
                  <div class="title-type">
                    <div class="title">${child.title}</div>
                    <div class="type">${child.media_content_type}</div>
                  </div>
                  ${child.can_play
                    ? html`
                        <ha-svg-icon
                          title="Play Media"
                          .path=${mdiPlay}
                          @click=${this._playMedia}
                        ></ha-svg-icon>
                      `
                    : ""}
                </div>
              `
            )}
          `
        : ""}
    `;
  }

  public updated(changedProps: PropertyValues) {
    super.updated(changedProps);

    if (
      !changedProps.has("entityId") &&
      !changedProps.has("mediaContentId") &&
      !changedProps.has("mediaContentType")
    ) {
      return;
    }

    this._fetchData(this.mediaContentId, this.mediaContentType);
  }

  private async _fetchData(mediaContentId?: string, mediaContentType?: string) {
    const itemData = await browseMediaPlayer(
      this.hass,
      this.entityId,
      !mediaContentId ? undefined : mediaContentId.toString(), // Change after JJ fixes response to alway be a string (would rather keep it consistent than patch frontend)
      mediaContentType
    );
    this._mediaPlayerItems = [...this._mediaPlayerItems, itemData];
  }

  private _navigate(ev: MouseEvent) {
    const target = ev.currentTarget as any;

    if (target.previous) {
      this._mediaPlayerItems!.pop();
      this._mediaPlayerItems = [...this._mediaPlayerItems];
      return; // Probably should re-request this incase it changed?
    }

    const item = target.item;
    this._fetchData(item.media_content_id, item.media_content_type);
  }

  private _playMedia(ev: MouseEvent) {
    ev.stopPropagation();
    const item: MediaPlayerItem = ((ev.currentTarget as HTMLElement)!
      .parentElement as any).item;
    this.hass.callService("media_player", "play_media", {
      entity_id: this.entityId,
      media_content_id: item.media_content_id,
      media_content_type: item.media_content_type,
    });
  }

  static get styles() {
    return [
      haStyle,
      css`
        .breadcrumb {
          display: flex;
          flex-direction: column;
          padding: 8px 4px;
        }

        .breadcrumb h2 {
          margin-bottom: 0;
        }

        .breadcrumb div {
          color: var(--secondary-text-color);
          cursor: pointer;
        }

        .child {
          display: flex;
          padding: 8px 4px;
          align-items: center;
          cursor: pointer;
        }

        .child > div {
          padding: 0 4px;
        }

        .child .image-icon {
          width: 45px;
          height: 45px;
          --mdc-icon-size: 45px;
        }

        .child .image-icon img {
          width: 100%;
        }

        .child .title-type {
          max-width: 250px;
          width: 100%;
        }

        .child .title {
          font-size: 18px;
        }

        .child .type {
          font-size: 12px;
          color: var(--secondary-text-color);
          text-transform: capitalize;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-media-player-browse": HaMediaPlayerBrowse;
  }
}

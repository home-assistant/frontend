import "@material/mwc-button/mwc-button";
import "@material/mwc-fab/mwc-fab";
import "@polymer/paper-listbox/paper-listbox";
import "@polymer/paper-item/paper-item";
import {
  LitElement,
  html,
  customElement,
  property,
  PropertyValues,
  internalProperty,
  css,
} from "lit-element";
import { mdiPlay, mdiFolder, mdiArrowLeft } from "@mdi/js";

import { haStyle } from "../../resources/styles";
import { browseMediaPlayer } from "../../data/media-player";
import { debounce } from "../../common/util/debounce";
import { installResizeObserver } from "../../panels/lovelace/common/install-resize-observer";
import type { MediaPlayerItem } from "../../data/media-player";
import type { HomeAssistant } from "../../types";

import "../ha-circular-progress";
import "../ha-svg-icon";
import "../ha-card";
import "../ha-paper-dropdown-menu";

@customElement("ha-media-player-browse")
export class HaMediaPlayerBrowse extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public entityId!: string;

  @property() public mediaContentId?: string;

  @property() public mediaContentType?: string;

  @property({ type: Boolean, attribute: "narrow", reflect: true })
  private _narrow = false;

  @internalProperty() private _loading = false;

  @internalProperty() private _mediaPlayerItems: MediaPlayerItem[] = [];

  private _resizeObserver?: ResizeObserver;

  public connectedCallback(): void {
    super.connectedCallback();
    this.updateComplete.then(() => this._attachObserver());
  }

  public disconnectedCallback(): void {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }
  }

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
      <div class="header">
        <div class="header-content">
          ${mostRecentItem.thumbnail
            ? html`
                <div
                  class="img"
                  style="background-image: url(${mostRecentItem.thumbnail})"
                >
                  ${this._narrow && mostRecentItem?.can_play
                    ? html`
                        <mwc-fab
                          mini
                          .item=${mostRecentItem}
                          @click=${this._playMedia}
                        >
                          <ha-svg-icon
                            slot="icon"
                            path=${mdiPlay}
                          ></ha-svg-icon>
                          <!-- Lokalize -->
                          Play
                        </mwc-fab>
                      `
                    : ""}
                </div>
              `
            : ""}
          <div class="header-info">
            <div class="breadcrumb">
              ${previousItem
                ? html`
                    <div
                      class="previous-title"
                      .previous=${true}
                      .item=${previousItem}
                      @click=${this._navigate}
                    >
                      <ha-svg-icon .path=${mdiArrowLeft}></ha-svg-icon>
                      ${previousItem.title}
                    </div>
                  `
                : ""}
              <div class="title">${mostRecentItem.title}</div>
              <div class="subtitle">
                <!-- Lokalize -->${mostRecentItem.media_content_type}
              </div>
            </div>
            ${!this._narrow && mostRecentItem?.can_play
              ? html`
                  <div class="actions">
                    <mwc-button
                      raised
                      .item=${mostRecentItem}
                      @click=${this._playMedia}
                    >
                      <ha-svg-icon slot="icon" path=${mdiPlay}></ha-svg-icon>
                      <!-- Lokalize -->
                      Play
                    </mwc-button>
                  </div>
                `
              : ""}
          </div>
        </div>
        <div class="media-source">
          <ha-paper-dropdown-menu .label=${"Media Source"}>
            <paper-listbox
              slot="dropdown-content"
              .selected=${this.entityId}
              @iron-select=${() => console.log()}
              attr-for-selected="item-name"
            >
              <paper-item .itemName=${this.entityId}
                >${this.hass.states[this.entityId].attributes
                  .friendly_name}</paper-item
              >
            </paper-listbox>
          </ha-paper-dropdown-menu>
        </div>
      </div>
      <div class="divider"></div>
      <div class="children">
        ${mostRecentItem.children?.length
          ? html`
              ${mostRecentItem.children.map(
                (child) => html`
                  <div class="child" @click=${this._navigate} .item=${child}>
                    <div class="ha-card-parent">
                      <ha-card
                        style="background-image: url(${child.thumbnail})"
                      >
                        ${child.can_expand && !child.thumbnail
                          ? html`
                              <ha-svg-icon
                                class="folder"
                                .path=${mdiFolder}
                              ></ha-svg-icon>
                            `
                          : ""}
                      </ha-card>
                      <div class="ha-card-copy">
                        ${child.can_play
                          ? html`
                              <ha-svg-icon
                                title="Play Media"
                                class="play"
                                .item=${child}
                                .path=${mdiPlay}
                                @click=${this._playMedia}
                              ></ha-svg-icon>
                            `
                          : ""}
                      </div>
                    </div>
                    <div class="title-type">
                      <div class="title">${child.title}</div>
                      <div class="type">
                        <!-- Lokalize -->${child.media_content_type}
                      </div>
                    </div>
                  </div>
                `
              )}
            `
          : ""}
      </div>
    `;
  }

  protected firstUpdated(): void {
    this._measureCard();
    this._attachObserver();
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

  private _measureCard() {
    this._narrow = this.offsetWidth < 600;
  }

  private async _attachObserver(): Promise<void> {
    if (!this._resizeObserver) {
      await installResizeObserver();
      this._resizeObserver = new ResizeObserver(
        debounce(() => this._measureCard(), 250, false)
      );
    }

    this._resizeObserver.observe(this);
  }

  private async _fetchData(mediaContentId?: string, mediaContentType?: string) {
    const itemData = await browseMediaPlayer(
      this.hass,
      this.entityId,
      !mediaContentId ? undefined : mediaContentId,
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
    const item = (ev.currentTarget as any).item;
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
        :host {
          display: block;
          padding: 16px;
        }

        .header {
          display: flex;
          justify-content: space-between;
        }

        .media-source {
          display: flex;
          justify-content: flex-end;
          flex-direction: column;
        }

        .header-content {
          display: flex;
          flex-wrap: wrap;
          flex-grow: 1;
          align-items: flex-start;
        }

        .header-content .img {
          height: 200px;
          width: 200px;
          margin-right: 16px;
          background-size: cover;
        }

        .header-info {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-self: stretch;
        }

        .header-info .actions {
          padding-top: 24px;
          --mdc-theme-primary: var(--accent-color);
        }

        .breadcrumb {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .breadcrumb .title {
          font-size: 48px;
          line-height: 1.2;
          font-weight: bold;
          margin: 0;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .breadcrumb .previous-title {
          font-size: 14px;
          padding-bottom: 8px;
          color: var(--secondary-text-color);
          overflow: hidden;
          text-overflow: ellipsis;
          cursor: pointer;
          --mdc-icon-size: 14px;
        }

        .breadcrumb .subtitle {
          font-size: 16px;
          overflow: hidden;
          text-overflow: ellipsis;
          text-transform: capitalize;
        }

        .divider {
          padding: 10px 0;
        }

        .divider::before {
          height: 1px;
          display: block;
          background-color: var(--divider-color);
          content: " ";
        }

        /* ============= Narrow Header ============= */

        :host([narrow]) .header,
        :host([narrow]) .header-content {
          flex-direction: column;
        }

        :host([narrow]) .header-content .img {
          height: auto;
          width: 100%;
          margin-right: 0;
          padding-bottom: 100%;
          margin-bottom: 8px;
          position: relative;
        }

        :host([narrow]) .header-content .img mwc-fab {
          position: absolute;
          bottom: -20px;
          right: 20px;
        }

        /* ============= CHILDREN ============= */

        .children {
          display: grid;
          grid-template-columns: repeat(
            auto-fit,
            var(--media-browse-item-size, 125px)
          );
          grid-gap: 16px;
          margin: 8px 0px;
        }

        .child {
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
        }

        .ha-card-parent {
          position: relative;
        }

        ha-card,
        .ha-card-copy {
          position: relative;
          width: var(--media-browse-item-size, 125px);
          height: var(--media-browse-item-size, 125px);
          background-size: cover;
          background-position: center;
        }

        .ha-card-copy {
          position: absolute;
          top: 0;
        }

        .child .folder,
        .child .play {
          position: absolute;
          top: calc(50% - (var(--mdc-icon-size) / 2));
          left: calc(50% - (var(--mdc-icon-size) / 2));
          --mdc-icon-size: calc(var(--media-browse-item-size, 125px) * 0.4);
        }

        .child .folder {
          color: var(--sidebar-icon-color);
        }

        .child .play {
          opacity: 0;
          transition: all 0.5s;
        }

        .child .play:hover {
          color: var(--accent-color);
        }

        .ha-card-parent:hover > ha-card {
          opacity: 0.5;
        }

        .ha-card-parent:hover > .ha-card-copy > .play {
          opacity: 1;
        }

        .child .title-type {
          width: 100%;
        }

        .child .title {
          font-size: 16px;
          padding-top: 8px;
          overflow: hidden;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
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

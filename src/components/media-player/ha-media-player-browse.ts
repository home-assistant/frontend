import "@material/mwc-button/mwc-button";
import "@material/mwc-fab/mwc-fab";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import "@material/mwc-list/mwc-list-item";
import { ActionDetail } from "@material/mwc-list/mwc-list-foundation";
// eslint-disable-next-line import/no-duplicates
import memoize from "memoize-one";
// eslint-disable-next-line import/no-duplicates
import memoizeOne from "memoize-one";
import {
  css,
  CSSResultArray,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import {
  mdiArrowLeft,
  mdiFolder,
  mdiPlay,
  mdiPlus,
  mdiDotsVertical,
} from "@mdi/js";
import { fireEvent } from "../../common/dom/fire_event";
import { debounce } from "../../common/util/debounce";
import {
  browseMediaPlayer,
  MediaPickedEvent,
  SUPPORT_BROWSE_MEDIA,
} from "../../data/media-player";
import { installResizeObserver } from "../../panels/lovelace/common/install-resize-observer";
import { showSelectMediaSourceDialog } from "./show-select-media-source-dialog";
import { haStyle } from "../../resources/styles";
import { computeDomain } from "../../common/entity/compute_domain";
import { supportsFeature } from "../../common/entity/supports-feature";
import type { HomeAssistant } from "../../types";
import type { MediaPlayerItem } from "../../data/media-player";
import type {
  DataTableRowData,
  DataTableColumnContainer,
} from "../data-table/ha-data-table";

import "../data-table/ha-data-table";
import "../entity/ha-entity-picker";
import "../ha-card";
import "../ha-circular-progress";
import "../ha-paper-dropdown-menu";
import "../ha-svg-icon";
import "../ha-button-menu";

declare global {
  interface HASSDomEvents {
    "media-picked": MediaPickedEvent;
  }
}

@customElement("ha-media-player-browse")
export class HaMediaPlayerBrowse extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public entityId!: string;

  @property() public mediaContentId?: string;

  @property() public mediaContentType?: string;

  @property() public action: "pick" | "play" = "play";

  @property({ type: Boolean }) public allowChangeSource = true;

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

  protected render(): TemplateResult {
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

    const hasExpandableChildren:
      | MediaPlayerItem
      | undefined = this._hasExpandableChildren(mostRecentItem.children);

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
                          @click=${this._actionClicked}
                        >
                          <ha-svg-icon
                            slot="icon"
                            .label=${this.hass.localize(
                              `ui.components.media-browser.${this.action}-media`
                            )}
                            .path=${this.action === "play" ? mdiPlay : mdiPlus}
                          ></ha-svg-icon>
                          ${this.hass.localize(
                            `ui.components.media-browser.${this.action}`
                          )}
                        </mwc-fab>
                      `
                    : ""}
                </div>
              `
            : ""}
          <div class="header-info">
            <div class="breadcrumb-overflow">
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
                  ${this.hass.localize(
                    `ui.components.media-browser.content-type.${mostRecentItem.media_content_type}`
                  )}
                </div>
              </div>
              <ha-button-menu
                corner="BOTTOM_START"
                @action=${this._handleOverFlowAction}
              >
                <mwc-icon-button
                  slot="trigger"
                  .title=${this.hass!.localize("ui.common.overflow_menu")}
                  .label=${this.hass!.localize("ui.common.overflow_menu")}
                >
                  <ha-svg-icon path=${mdiDotsVertical}></ha-svg-icon>
                </mwc-icon-button>
                <mwc-list-item>
                  ${this.hass!.localize("ui.common.refresh")}
                </mwc-list-item>
                ${this.allowChangeSource
                  ? html`
                      <mwc-list-item>
                        ${this.hass!.localize(
                          "ui.components.media-browser.choose-source"
                        )}
                      </mwc-list-item>
                    `
                  : ""}
              </ha-button-menu>
            </div>
            ${!this._narrow && mostRecentItem?.can_play
              ? html`
                  <div class="actions">
                    <mwc-button
                      raised
                      .item=${mostRecentItem}
                      @click=${this._actionClicked}
                    >
                      <ha-svg-icon
                        slot="icon"
                        .label=${this.hass.localize(
                          `ui.components.media-browser.${this.action}-media`
                        )}
                        .path=${this.action === "play" ? mdiPlay : mdiPlus}
                      ></ha-svg-icon>
                      ${this.hass.localize(
                        `ui.components.media-browser.${this.action}`
                      )}
                    </mwc-button>
                  </div>
                `
              : ""}
          </div>
        </div>
      </div>
      <div class="divider"></div>
      ${hasExpandableChildren
        ? html`
            <div class="children">
              ${mostRecentItem.children?.length
                ? html`
                    ${mostRecentItem.children.map(
                      (child) => html`
                        <div
                          class="child"
                          .item=${child}
                          @click=${this._navigate}
                        >
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
                            ${child.can_play && !this._narrow
                              ? html`
                                  <div class="ha-card-copy">
                                    <ha-svg-icon
                                      class="play"
                                      .item=${child}
                                      .label=${this.hass.localize(
                                        `ui.components.media-browser.${this.action}-media`
                                      )}
                                      .path=${this.action === "play"
                                        ? mdiPlay
                                        : mdiPlus}
                                      @click=${this._actionClicked}
                                    ></ha-svg-icon>
                                  </div>
                                `
                              : ""}
                          </div>
                          <div class="title">${child.title}</div>
                          <div class="type">
                            ${this.hass.localize(
                              `ui.components.media-browser.content-type.${child.media_content_type}`
                            )}
                          </div>
                        </div>
                      `
                    )}
                  `
                : ""}
            </div>
          `
        : mostRecentItem.children
        ? html`
            <ha-data-table
              .columns=${this._columns}
              .data=${mostRecentItem.children.map((child) => {
                return { icon: this.action, ...child };
              }) as DataTableRowData[]}
              .autoHeight=${true}
              .showHeader=${false}
              .id=${"media_content_id"}
              @row-click=${this._rowClicked}
            ></ha-data-table>
          `
        : ""}
    `;
  }

  protected firstUpdated(): void {
    this._measureCard();
    this._attachObserver();
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);

    if (
      !changedProps.has("entityId") &&
      !changedProps.has("mediaContentId") &&
      !changedProps.has("mediaContentType") &&
      !changedProps.has("action")
    ) {
      return;
    }

    this._fetchData(this.mediaContentId, this.mediaContentType).then(
      (itemData) => {
        this._mediaPlayerItems = [itemData];
      }
    );
  }

  private _actionClicked(ev: MouseEvent): void {
    ev.stopPropagation();
    const item = (ev.currentTarget as any).item;

    this._runAction(item);
  }

  private _runAction(item: MediaPlayerItem): void {
    if (this.action === "pick") {
      fireEvent(this, "media-picked", {
        media_content_id: item.media_content_id,
        media_content_type: item.media_content_type,
      });
      return;
    }

    this.hass.callService("media_player", "play_media", {
      entity_id: this.entityId,
      media_content_id: item.media_content_id,
      media_content_type: item.media_content_type,
    });
  }

  private _showMediaSouceDialog(): void {
    showSelectMediaSourceDialog(this, {
      mediaSources: this._browseMediaSources(this.hass),
      sourceSelectedCallback: (entityId) => {
        this.entityId = entityId;
        this.mediaContentId = undefined;
        this.mediaContentType = undefined;
      },
    });
  }

  private async _navigate(ev: MouseEvent): Promise<void> {
    const target = ev.currentTarget as any;

    if (target.previous) {
      this._mediaPlayerItems!.pop();
      this._mediaPlayerItems = [...this._mediaPlayerItems];
      return; // Probably should re-request this incase it changed?
    }

    const item = target.item;
    const itemData = await this._fetchData(
      item.media_content_id,
      item.media_content_type
    );
    this._mediaPlayerItems = [...this._mediaPlayerItems, itemData];
  }

  private _rowClicked(ev: CustomEvent): void {
    const item = this._mediaPlayerItems[
      this._mediaPlayerItems.length - 1
    ].children?.find((i) => i.media_content_id === ev.detail.id);

    if (!item) {
      return;
    }

    this._runAction(item);
  }

  private _handleOverFlowAction(ev: CustomEvent<ActionDetail>) {
    switch (ev.detail.index) {
      case 0:
        this._refresh();
        break;
      case 1:
        this._showMediaSouceDialog();
        break;
    }
  }

  private async _fetchData(
    mediaContentId?: string,
    mediaContentType?: string
  ): Promise<MediaPlayerItem> {
    const itemData = await browseMediaPlayer(
      this.hass,
      this.entityId,
      !mediaContentId ? undefined : mediaContentId,
      mediaContentType
    );

    return itemData;
  }

  private _measureCard(): void {
    this._narrow = this.offsetWidth < 500;
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

  private _columns: DataTableColumnContainer = {
    icon: {
      title: "",
      type: "icon",
      template: <MediaPlayerItem>(icon: string, item: MediaPlayerItem) =>
        html`
          <ha-svg-icon
            style="cursor: pointer;"
            .item=${item}
            .label=${this.hass.localize(
              `ui.components.media-browser.${icon}-media`
            )}
            .path=${icon === "play" ? mdiPlay : mdiPlus}
            @click=${this._actionClicked.bind(this)}
          ></ha-svg-icon>
        `,
    },
    title: {
      title: "Title",
      template: (title: string) =>
        html`<div style="cursor: pointer;">${title}</div>`,
    },
  };

  private _browseMediaSources = memoize((hass: HomeAssistant) => {
    if (!hass) {
      return [];
    }

    let entityIds = Object.keys(hass.states);

    entityIds = entityIds.filter((eid) =>
      ["media_player"].includes(computeDomain(eid))
    );

    entityIds = entityIds.filter((eid) =>
      supportsFeature(hass.states[eid], SUPPORT_BROWSE_MEDIA)
    );

    return entityIds.map((key) => hass.states[key]);
  });

  private _hasExpandableChildren = memoizeOne((children) =>
    children.find((item: MediaPlayerItem) => item.can_expand)
  );

  private async _refresh(): Promise<void> {
    for await (const [idx, item] of this._mediaPlayerItems.entries()) {
      const itemData = await this._fetchData(
        item.media_content_id,
        item.media_content_type
      );

      this._mediaPlayerItems[idx] = itemData;
    }

    this._mediaPlayerItems = [...this._mediaPlayerItems];
  }

  static get styles(): CSSResultArray {
    return [
      haStyle,
      css`
        :host {
          display: block;
          padding: 0 16px;
        }

        .header {
          display: flex;
          justify-content: space-between;
        }

        .breadcrumb-overflow {
          display: flex;
          justify-content: space-between;
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
          min-width: 0;
          flex: 1;
        }

        .header-info .actions {
          padding-top: 24px;
          --mdc-theme-primary: var(--accent-color);
        }

        .breadcrumb {
          display: flex;
          flex-direction: column;
          overflow: hidden;
          flex-grow: 1;
        }

        .breadcrumb .title {
          font-size: 48px;
          line-height: 1.2;
          font-weight: bold;
          margin: 0;
          overflow: hidden;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
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

        /* ============= CHILDREN ============= */

        .children {
          display: grid;
          grid-template-columns: repeat(
            auto-fit,
            var(--media-browse-item-size, 175px)
          );
          grid-gap: 16px;
          margin: 8px 0px;
        }

        .child {
          display: flex;
          flex-direction: column;
          cursor: pointer;
        }

        .ha-card-parent {
          position: relative;
          width: 100%;
        }

        ha-card,
        .ha-card-copy {
          width: 100%;
          padding-bottom: 100%;
          position: relative;
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
          --mdc-icon-size: calc(var(--media-browse-item-size, 175px) * 0.4);
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
        }

        /* ============= Narrow ============= */

        :host([narrow]) {
          padding: 0;
        }

        :host([narrow]) .breadcrumb .title {
          font-size: 38px;
        }

        :host([narrow]) .breadcrumb-overflow {
          align-items: center;
        }

        :host([narrow]) .header-content {
          flex-direction: column;
          flex-wrap: nowrap;
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

        :host([narrow]) .header-info,
        :host([narrow]) .media-source,
        :host([narrow]) .children {
          padding: 0 8px;
        }

        :host([narrow]) .children {
          grid-template-columns: 1fr 1fr !important;
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

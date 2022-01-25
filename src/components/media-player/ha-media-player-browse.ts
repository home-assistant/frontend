import "../ha-card";
import "@material/mwc-button/mwc-button";
import "@material/mwc-list/mwc-list";
import "@material/mwc-list/mwc-list-item";
import { mdiPlay, mdiPlus } from "@mdi/js";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import "@polymer/paper-tooltip/paper-tooltip";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import {
  customElement,
  property,
  query,
  queryAll,
  state,
} from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import { fireEvent } from "../../common/dom/fire_event";
import { computeRTLDirection } from "../../common/util/compute_rtl";
import { debounce } from "../../common/util/debounce";
import type { MediaPlayerItem } from "../../data/media-player";
import {
  browseLocalMediaPlayer,
  browseMediaPlayer,
  BROWSER_PLAYER,
  MediaClassBrowserSettings,
  MediaPickedEvent,
  MediaPlayerBrowseAction,
} from "../../data/media-player";
import { showAlertDialog } from "../../dialogs/generic/show-dialog-box";
import { installResizeObserver } from "../../panels/lovelace/common/install-resize-observer";
import { haStyle } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import { documentationUrl } from "../../util/documentation-url";
import "../entity/ha-entity-picker";
import "../ha-button-menu";
import "../ha-circular-progress";
import "../ha-icon-button";
import "../ha-svg-icon";
import type { HaCard } from "../ha-card";
import { getSignedPath } from "../../data/auth";

declare global {
  interface HASSDomEvents {
    "media-picked": MediaPickedEvent;
    "media-browsed": { ids: MediaPlayerItemId[]; back?: boolean };
  }
}

export interface MediaPlayerItemId {
  media_content_id: string | undefined;
  media_content_type: string | undefined;
  title?: string;
  can_play?: boolean;
}

@customElement("ha-media-player-browse")
export class HaMediaPlayerBrowse extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public entityId!: string;

  @property() public action: MediaPlayerBrowseAction = "play";

  @property({ type: Boolean }) public dialog = false;

  @property({ type: Boolean, attribute: "narrow", reflect: true })
  private _narrow = false;

  @property() public navigateIds!: MediaPlayerItemId[];

  @state() private _error?: { message: string; code: string };

  @state() private _parentItem?: MediaPlayerItem;

  @state() private _currentItem?: MediaPlayerItem;

  @query(".content") private _content?: HTMLDivElement;

  @queryAll(".lazythumbnail") private _thumbnails?: HaCard[];

  private _resizeObserver?: ResizeObserver;

  // @ts-ignore
  private _intersectionObserver?: IntersectionObserver;

  public connectedCallback(): void {
    super.connectedCallback();
    this.updateComplete.then(() => this._attachResizeObserver());
  }

  public disconnectedCallback(): void {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }
    if (this._intersectionObserver) {
      this._intersectionObserver.disconnect();
    }
  }

  public play(): void {
    if (this._currentItem?.can_play) {
      this._runAction(this._currentItem);
    }
  }

  protected render(): TemplateResult {
    if (this._error) {
      return html`
        <div class="container">${this._renderError(this._error)}</div>
      `;
    }

    if (!this._currentItem) {
      return html`<ha-circular-progress active></ha-circular-progress>`;
    }

    const currentItem = this._currentItem;

    const mediaClass = MediaClassBrowserSettings[currentItem.media_class];
    const childrenMediaClass =
      MediaClassBrowserSettings[currentItem.children_media_class];

    return html`
      <div class="content">
        ${this._error
          ? html`
              <div class="container">${this._renderError(this._error)}</div>
            `
          : currentItem.children?.length
          ? childrenMediaClass.layout === "grid"
            ? html`
                <div
                  class="children ${classMap({
                    portrait: childrenMediaClass.thumbnail_ratio === "portrait",
                  })}"
                >
                  ${currentItem.children.map(
                    (child) => html`
                      <div
                        class="child"
                        .item=${child}
                        @click=${this._childClicked}
                      >
                        <ha-card>
                          ${!child.thumbnail
                            ? html`
                                <div class="icon-holder">
                                  <ha-svg-icon
                                    class="folder"
                                    .path=${MediaClassBrowserSettings[
                                      child.media_class === "directory"
                                        ? child.children_media_class ||
                                          child.media_class
                                        : child.media_class
                                    ].icon}
                                  ></ha-svg-icon>
                                </div>
                              `
                            : html`
                                <div
                                  class=${child.thumbnail
                                    ? "lazythumbnail"
                                    : ""}
                                  data-src=${ifDefined(child.thumbnail)}
                                ></div>
                              `}
                          ${child.can_play
                            ? html`
                                <ha-icon-button
                                  class="play ${classMap({
                                    can_expand: child.can_expand,
                                  })}"
                                  .item=${child}
                                  .label=${this.hass.localize(
                                    `ui.components.media-browser.${this.action}-media`
                                  )}
                                  .path=${this.action === "play"
                                    ? mdiPlay
                                    : mdiPlus}
                                  @click=${this._actionClicked}
                                ></ha-icon-button>
                              `
                            : ""}
                          <div class="title">
                            ${child.title}
                            <paper-tooltip
                              fitToVisibleBounds
                              position="top"
                              offset="4"
                              >${child.title}</paper-tooltip
                            >
                          </div>
                          <div class="type">
                            ${this.hass.localize(
                              `ui.components.media-browser.content-type.${child.media_content_type}`
                            )}
                          </div>
                        </ha-card>
                      </div>
                    `
                  )}
                </div>
              `
            : html`
                <mwc-list>
                  ${currentItem.children.map(
                    (child) => html`
                      <mwc-list-item
                        @click=${this._childClicked}
                        .item=${child}
                        graphic="avatar"
                        hasMeta
                        dir=${computeRTLDirection(this.hass)}
                      >
                        <div
                          class="graphic"
                          style=${ifDefined(
                            mediaClass.show_list_images && child.thumbnail
                              ? `background-image: url(${child.thumbnail})`
                              : undefined
                          )}
                          slot="graphic"
                        >
                          <ha-icon-button
                            class="play ${classMap({
                              show:
                                !mediaClass.show_list_images ||
                                !child.thumbnail,
                            })}"
                            .item=${child}
                            .label=${this.hass.localize(
                              `ui.components.media-browser.${this.action}-media`
                            )}
                            .path=${this.action === "play" ? mdiPlay : mdiPlus}
                            @click=${this._actionClicked}
                          ></ha-icon-button>
                        </div>
                        <span class="title">${child.title}</span>
                      </mwc-list-item>
                      <li divider role="separator"></li>
                    `
                  )}
                </mwc-list>
              `
          : html`
              <div class="container no-items">
                ${this.hass.localize("ui.components.media-browser.no_items")}
                <br />
                ${currentItem.media_content_id ===
                "media-source://media_source/local/."
                  ? html`<br />${this.hass.localize(
                        "ui.components.media-browser.learn_adding_local_media",
                        "documentation",
                        html`<a
                          href=${documentationUrl(
                            this.hass,
                            "/more-info/local-media/add-media"
                          )}
                          target="_blank"
                          rel="noreferrer"
                          >${this.hass.localize(
                            "ui.components.media-browser.documentation"
                          )}</a
                        >`
                      )}
                      <br />
                      ${this.hass.localize(
                        "ui.components.media-browser.local_media_files"
                      )}`
                  : ""}
              </div>
            `}
      </div>
    `;
  }

  protected firstUpdated(): void {
    this._measureCard();
    this._attachResizeObserver();
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (changedProps.size > 1 || !changedProps.has("hass")) {
      return true;
    }
    const oldHass = changedProps.get("hass") as this["hass"];
    return oldHass === undefined || oldHass.localize !== this.hass.localize;
  }

  public willUpdate(changedProps: PropertyValues<this>): void {
    super.willUpdate(changedProps);

    if (changedProps.has("entityId")) {
      this._setError(undefined);
    }
    if (!changedProps.has("navigateIds")) {
      return;
    }
    const oldNavigateIds = changedProps.get("navigateIds") as
      | this["navigateIds"]
      | undefined;

    // We're navigating. Reset the shizzle.
    this._content?.scrollTo(0, 0);
    const oldCurrentItem = this._currentItem;
    const oldParentItem = this._parentItem;
    this._currentItem = undefined;
    this._parentItem = undefined;
    const currentId = this.navigateIds[this.navigateIds.length - 1];
    const parentId =
      this.navigateIds.length > 1
        ? this.navigateIds[this.navigateIds.length - 2]
        : undefined;
    let currentProm: Promise<MediaPlayerItem> | undefined;
    let parentProm: Promise<MediaPlayerItem> | undefined;

    // See if we can take loading shortcuts if navigating to parent or child
    if (!changedProps.has("entityId")) {
      if (
        // Check if we navigated to a child
        oldNavigateIds &&
        this.navigateIds.length > oldNavigateIds.length &&
        oldNavigateIds.every((oldVal, idx) => {
          const curVal = this.navigateIds[idx];
          return (
            curVal.media_content_id === oldVal.media_content_id &&
            curVal.media_content_type === oldVal.media_content_type
          );
        })
      ) {
        parentProm = Promise.resolve(oldCurrentItem!);
      } else if (
        // Check if we navigated to a parent
        oldNavigateIds &&
        this.navigateIds.length < oldNavigateIds.length &&
        this.navigateIds.every((curVal, idx) => {
          const oldVal = oldNavigateIds[idx];
          return (
            curVal.media_content_id === oldVal.media_content_id &&
            curVal.media_content_type === oldVal.media_content_type
          );
        })
      ) {
        currentProm = Promise.resolve(oldParentItem!);
      }
    }
    // Fetch current
    if (!currentProm) {
      currentProm = this._fetchData(
        this.entityId,
        currentId.media_content_id,
        currentId.media_content_type
      );
    }
    currentProm.then(
      (item) => {
        this._currentItem = item;
      },
      (err) => this._setError(err)
    );
    // Fetch parent
    if (!parentProm && parentId !== undefined) {
      parentProm = this._fetchData(
        this.entityId,
        parentId.media_content_id,
        parentId.media_content_type
      );
    }
    if (parentProm) {
      parentProm.then((parent) => {
        this._parentItem = parent;
      });
    }
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);

    if (changedProps.has("_currentItem")) {
      this._attachIntersectionObserver();
    }
  }

  private _actionClicked(ev: MouseEvent): void {
    ev.stopPropagation();
    const item = (ev.currentTarget as any).item;

    this._runAction(item);
  }

  private _runAction(item: MediaPlayerItem): void {
    fireEvent(this, "media-picked", { item });
  }

  private async _childClicked(ev: MouseEvent): Promise<void> {
    const target = ev.currentTarget as any;
    const item: MediaPlayerItem = target.item;

    if (!item) {
      return;
    }

    if (!item.can_expand) {
      this._runAction(item);
      return;
    }

    fireEvent(this, "media-browsed", {
      ids: [...this.navigateIds, item],
    });
  }

  private async _fetchData(
    entityId: string,
    mediaContentId?: string,
    mediaContentType?: string
  ): Promise<MediaPlayerItem> {
    return entityId !== BROWSER_PLAYER
      ? browseMediaPlayer(this.hass, entityId, mediaContentId, mediaContentType)
      : browseLocalMediaPlayer(this.hass, mediaContentId);
  }

  private _measureCard(): void {
    this._narrow = (this.dialog ? window.innerWidth : this.offsetWidth) < 450;
  }

  private async _attachResizeObserver(): Promise<void> {
    if (!this._resizeObserver) {
      await installResizeObserver();
      this._resizeObserver = new ResizeObserver(
        debounce(() => this._measureCard(), 250, false)
      );
    }

    this._resizeObserver.observe(this);
  }

  /**
   * Load thumbnails for images on demand as they become visible.
   */
  private async _attachIntersectionObserver(): Promise<void> {
    if (!("IntersectionObserver" in window) || !this._thumbnails) {
      return;
    }
    if (!this._intersectionObserver) {
      this._intersectionObserver = new IntersectionObserver(
        async (entries, observer) => {
          await Promise.all(
            entries.map(async (entry) => {
              if (!entry.isIntersecting) {
                return;
              }
              const thumbnailCard = entry.target as HTMLElement;
              let thumbnailUrl = thumbnailCard.dataset.src;
              if (!thumbnailUrl) {
                return;
              }
              if (thumbnailUrl.startsWith("/")) {
                // Thumbnails served by local API require authentication
                const signedPath = await getSignedPath(this.hass, thumbnailUrl);
                thumbnailUrl = signedPath.path;
              }
              thumbnailCard.style.backgroundImage = `url(${thumbnailUrl})`;
              observer.unobserve(thumbnailCard); // loaded, so no need to observe anymore
            })
          );
        }
      );
    }
    const observer = this._intersectionObserver!;
    for (const thumbnailCard of this._thumbnails) {
      observer.observe(thumbnailCard);
    }
  }

  private _closeDialogAction(): void {
    fireEvent(this, "close-dialog");
  }

  private _setError(error: any) {
    if (!this.dialog) {
      this._error = error;
      return;
    }

    if (!error) {
      return;
    }

    this._closeDialogAction();
    showAlertDialog(this, {
      title: this.hass.localize(
        "ui.components.media-browser.media_browsing_error"
      ),
      text: this._renderError(error),
    });
  }

  private _renderError(err: { message: string; code: string }) {
    if (err.message === "Media directory does not exist.") {
      return html`
        <h2>
          ${this.hass.localize(
            "ui.components.media-browser.no_local_media_found"
          )}
        </h2>
        <p>
          ${this.hass.localize("ui.components.media-browser.no_media_folder")}
          <br />
          ${this.hass.localize(
            "ui.components.media-browser.setup_local_help",
            "documentation",
            html`<a
              href=${documentationUrl(
                this.hass,
                "/more-info/local-media/setup-media"
              )}
              target="_blank"
              rel="noreferrer"
              >${this.hass.localize(
                "ui.components.media-browser.documentation"
              )}</a
            >`
          )}
          <br />
          ${this.hass.localize("ui.components.media-browser.local_media_files")}
        </p>
      `;
    }
    return html`<span class="error">${err.message}</span>`;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          display: flex;
          flex-direction: column;
          position: relative;
        }

        ha-circular-progress {
          --mdc-theme-primary: var(--primary-color);
          display: flex;
          justify-content: center;
          margin: 40px;
        }

        .container {
          padding: 16px;
        }

        .no-items {
          padding-left: 32px;
        }

        .content {
          overflow-y: auto;
          padding-bottom: 20px;
          box-sizing: border-box;
        }

        /* ============= CHILDREN ============= */

        mwc-list {
          --mdc-list-vertical-padding: 0;
          --mdc-list-item-graphic-margin: 0;
          --mdc-theme-text-icon-on-background: var(--secondary-text-color);
          margin-top: 10px;
        }

        mwc-list li:last-child {
          display: none;
        }

        mwc-list li[divider] {
          border-bottom-color: var(--divider-color);
        }

        .children {
          display: grid;
          grid-template-columns: repeat(
            auto-fit,
            minmax(var(--media-browse-item-size, 175px), 0.1fr)
          );
          grid-gap: 16px;
          padding: 8px;
        }

        :host([dialog]) .children {
          grid-template-columns: repeat(
            auto-fit,
            minmax(var(--media-browse-item-size, 175px), 0.33fr)
          );
        }

        .child {
          display: flex;
          flex-direction: column;
          cursor: pointer;
        }

        ha-card {
          position: relative;
          width: 100%;
          padding: 16px;
          box-sizing: border-box;
        }

        .children ha-card .lazythumbnail {
          width: 100%;
          position: relative;
          box-sizing: border-box;
          background-size: cover;
          background-repeat: no-repeat;
          background-position: center;
          transition: padding-bottom 0.1s ease-out;
          padding-bottom: 100%;
          border-radius: 8px;
        }

        .portrait.children ha-card .lazythumbnail {
          padding-bottom: 150%;
        }

        .children ha-card .icon-holder {
          display: flex;
          justify-content: center;
          align-items: center;
          border-radius: 8px;
          padding: 16px 0;
        }

        .child .folder {
          color: var(--secondary-text-color);
          --mdc-icon-size: calc(var(--media-browse-item-size, 175px) * 0.4);
        }

        .child .play {
          position: absolute;
          transition: color 0.5s;
          border-radius: 50%;
          top: calc(50% - 50px);
          right: calc(50% - 35px);
          opacity: 0;
          transition: opacity 0.1s ease-out;
        }

        .child .play:not(.can_expand) {
          --mdc-icon-button-size: 70px;
          --mdc-icon-size: 48px;
        }

        ha-card:hover .play:not(.can_expand) {
          opacity: 1;
          color: var(--primary-color);
        }

        .child .play.can_expand {
          opacity: 1;
          background-color: rgba(var(--rgb-card-background-color), 0.5);
          top: 16px;
          right: 16px;
        }

        .child .play:hover {
          color: var(--primary-color);
        }

        ha-card:hover .lazythumbnail {
          opacity: 0.5;
        }

        .child .title {
          font-size: 16px;
          padding-top: 16px;
          padding-left: 2px;
          overflow: hidden;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 1;
          text-overflow: ellipsis;
        }

        .child .type {
          font-size: 12px;
          color: var(--secondary-text-color);
          padding-left: 2px;
        }

        mwc-list-item .graphic {
          background-size: cover;
        }

        mwc-list-item .graphic .play {
          opacity: 0;
          transition: all 0.5s;
          background-color: rgba(var(--rgb-card-background-color), 0.5);
          border-radius: 50%;
          --mdc-icon-button-size: 40px;
        }

        mwc-list-item:hover .graphic .play {
          opacity: 1;
          color: var(--primary-color);
        }

        mwc-list-item .graphic .play.show {
          opacity: 1;
          background-color: transparent;
        }

        mwc-list-item .title {
          margin-left: 16px;
        }
        mwc-list-item[dir="rtl"] .title {
          margin-right: 16px;
          margin-left: 0;
        }

        /* ============= Narrow ============= */

        :host([narrow]) {
          padding: 0;
        }

        :host([narrow]) .media-source {
          padding: 0 24px;
        }

        :host([narrow]) .children {
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
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

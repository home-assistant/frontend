import "@material/mwc-button/mwc-button";
import "@material/mwc-list/mwc-list";
import "@material/mwc-list/mwc-list-item";
import { mdiArrowLeft, mdiClose, mdiPlay, mdiPlus } from "@mdi/js";
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
  state,
  query,
  eventOptions,
} from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import { styleMap } from "lit/directives/style-map";
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
import "../ha-card";
import "../ha-circular-progress";
import "../ha-fab";
import "../ha-svg-icon";

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

  @property() public action: MediaPlayerBrowseAction = "play";

  @property({ type: Boolean }) public dialog = false;

  @property({ type: Boolean, attribute: "narrow", reflect: true })
  private _narrow = false;

  @property({ type: Boolean, attribute: "scroll", reflect: true })
  private _scrolled = false;

  @state() private _loading = false;

  @state() private _error?: { message: string; code: string };

  @state() private _mediaPlayerItems: MediaPlayerItem[] = [];

  @query(".header") private _header?: HTMLDivElement;

  @query(".content") private _content?: HTMLDivElement;

  private _headerOffsetHeight = 0;

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

  public navigateBack() {
    this._mediaPlayerItems!.pop();
    const item = this._mediaPlayerItems!.pop();
    if (!item) {
      return;
    }
    this._navigate(item);
  }

  protected render(): TemplateResult {
    if (this._loading) {
      return html`<ha-circular-progress active></ha-circular-progress>`;
    }

    if (this._error && !this._mediaPlayerItems.length) {
      if (this.dialog) {
        this._closeDialogAction();
        showAlertDialog(this, {
          title: this.hass.localize(
            "ui.components.media-browser.media_browsing_error"
          ),
          text: this._renderError(this._error),
        });
      } else {
        return html`
          <div class="container">${this._renderError(this._error)}</div>
        `;
      }
    }

    if (!this._mediaPlayerItems.length) {
      return html``;
    }

    const currentItem =
      this._mediaPlayerItems[this._mediaPlayerItems.length - 1];

    const previousItem: MediaPlayerItem | undefined =
      this._mediaPlayerItems.length > 1
        ? this._mediaPlayerItems[this._mediaPlayerItems.length - 2]
        : undefined;

    const subtitle = this.hass.localize(
      `ui.components.media-browser.class.${currentItem.media_class}`
    );
    const mediaClass = MediaClassBrowserSettings[currentItem.media_class];
    const childrenMediaClass =
      MediaClassBrowserSettings[currentItem.children_media_class];

    return html`
      <div
        class="header ${classMap({
          "no-img": !currentItem.thumbnail,
          "no-dialog": !this.dialog,
        })}"
        @transitionend=${this._setHeaderHeight}
      >
        <div class="header-content">
          ${currentItem.thumbnail
            ? html`
                <div
                  class="img"
                  style=${styleMap({
                    backgroundImage: currentItem.thumbnail
                      ? `url(${currentItem.thumbnail})`
                      : "none",
                  })}
                >
                  ${this._narrow && currentItem?.can_play
                    ? html`
                        <ha-fab
                          mini
                          .item=${currentItem}
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
                        </ha-fab>
                      `
                    : ""}
                </div>
              `
            : html``}
          <div class="header-info">
            <div class="breadcrumb">
              ${previousItem
                ? html`
                    <div class="previous-title" @click=${this.navigateBack}>
                      <ha-svg-icon .path=${mdiArrowLeft}></ha-svg-icon>
                      ${previousItem.title}
                    </div>
                  `
                : ""}
              <h1 class="title">${currentItem.title}</h1>
              ${subtitle ? html` <h2 class="subtitle">${subtitle}</h2> ` : ""}
            </div>
            ${currentItem.can_play && (!currentItem.thumbnail || !this._narrow)
              ? html`
                  <mwc-button
                    raised
                    .item=${currentItem}
                    @click=${this._actionClicked}
                  >
                    <ha-svg-icon
                      .label=${this.hass.localize(
                        `ui.components.media-browser.${this.action}-media`
                      )}
                      .path=${this.action === "play" ? mdiPlay : mdiPlus}
                    ></ha-svg-icon>
                    ${this.hass.localize(
                      `ui.components.media-browser.${this.action}`
                    )}
                  </mwc-button>
                `
              : ""}
          </div>
        </div>
        ${this.dialog
          ? html`
              <mwc-icon-button
                aria-label=${this.hass.localize("ui.dialogs.generic.close")}
                @click=${this._closeDialogAction}
                class="header_button"
                dir=${computeRTLDirection(this.hass)}
              >
                <ha-svg-icon .path=${mdiClose}></ha-svg-icon>
              </mwc-icon-button>
            `
          : ""}
      </div>
      <div class="content" @scroll=${this._scroll} @touchmove=${this._scroll}>
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
                        <div class="ha-card-parent">
                          <ha-card
                            outlined
                            style=${styleMap({
                              backgroundImage: child.thumbnail
                                ? `url(${child.thumbnail})`
                                : "none",
                            })}
                          >
                            ${!child.thumbnail
                              ? html`
                                  <ha-svg-icon
                                    class="folder"
                                    .path=${MediaClassBrowserSettings[
                                      child.media_class === "directory"
                                        ? child.children_media_class ||
                                          child.media_class
                                        : child.media_class
                                    ].icon}
                                  ></ha-svg-icon>
                                `
                              : ""}
                          </ha-card>
                          ${child.can_play
                            ? html`
                                <mwc-icon-button
                                  class="play ${classMap({
                                    can_expand: child.can_expand,
                                  })}"
                                  .item=${child}
                                  .label=${this.hass.localize(
                                    `ui.components.media-browser.${this.action}-media`
                                  )}
                                  @click=${this._actionClicked}
                                >
                                  <ha-svg-icon
                                    .path=${this.action === "play"
                                      ? mdiPlay
                                      : mdiPlus}
                                  ></ha-svg-icon>
                                </mwc-icon-button>
                              `
                            : ""}
                        </div>
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
                          <mwc-icon-button
                            class="play ${classMap({
                              show:
                                !mediaClass.show_list_images ||
                                !child.thumbnail,
                            })}"
                            .item=${child}
                            .label=${this.hass.localize(
                              `ui.components.media-browser.${this.action}-media`
                            )}
                            @click=${this._actionClicked}
                          >
                            <ha-svg-icon
                              .path=${this.action === "play"
                                ? mdiPlay
                                : mdiPlus}
                            ></ha-svg-icon>
                          </mwc-icon-button>
                        </div>
                        <span class="title">${child.title}</span>
                      </mwc-list-item>
                      <li divider role="separator"></li>
                    `
                  )}
                </mwc-list>
              `
          : html`
              <div class="container">
                ${this.hass.localize("ui.components.media-browser.no_items")}
                <br />
                ${currentItem.media_content_id ===
                "media-source://media_source/local/."
                  ? html`<br />${this.hass.localize(
                        "ui.components.media-browser.learn_adding_local_media",
                        "documentation",
                        html`<a
                          href="${documentationUrl(
                            this.hass,
                            "/more-info/local-media/add-media"
                          )}"
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
    this._attachObserver();
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);

    if (
      changedProps.has("_mediaPlayerItems") &&
      this._mediaPlayerItems.length
    ) {
      this._setHeaderHeight();
    }

    if (
      changedProps.get("_scrolled") !== undefined &&
      this._mediaPlayerItems.length
    ) {
      this._animateHeaderHeight();
    }

    if (
      !changedProps.has("entityId") &&
      !changedProps.has("mediaContentId") &&
      !changedProps.has("mediaContentType") &&
      !changedProps.has("action")
    ) {
      return;
    }

    if (changedProps.has("entityId")) {
      this._error = undefined;
      this._mediaPlayerItems = [];
    }

    this._fetchData(this.mediaContentId, this.mediaContentType)
      .then((itemData) => {
        if (!itemData) {
          return;
        }

        this._mediaPlayerItems = [itemData];
      })
      .catch((err) => {
        this._error = err;
      });
  }

  private async _setHeaderHeight() {
    await this.updateComplete;
    const header = this._header;
    const content = this._content;
    if (!header || !content) {
      return;
    }
    this._headerOffsetHeight = header.offsetHeight;
    content.style.marginTop = `${this._headerOffsetHeight}px`;
    content.style.maxHeight = `calc(var(--media-browser-max-height, 100%) - ${this._headerOffsetHeight}px)`;
  }

  private _animateHeaderHeight() {
    let start;
    const animate = (time) => {
      if (start === undefined) {
        start = time;
      }
      const elapsed = time - start;
      this._setHeaderHeight();
      if (elapsed < 400) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
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

    this._navigate(item);
  }

  private async _navigate(item: MediaPlayerItem) {
    this._error = undefined;

    let itemData: MediaPlayerItem;

    try {
      itemData = await this._fetchData(
        item.media_content_id,
        item.media_content_type
      );
    } catch (err) {
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.components.media-browser.media_browsing_error"
        ),
        text: this._renderError(err),
      });
      return;
    }

    this._content?.scrollTo(0, 0);
    this._scrolled = false;
    this._mediaPlayerItems = [...this._mediaPlayerItems, itemData];
  }

  private async _fetchData(
    mediaContentId?: string,
    mediaContentType?: string
  ): Promise<MediaPlayerItem> {
    this._loading = true;
    let itemData: any;
    try {
      itemData =
        this.entityId !== BROWSER_PLAYER
          ? await browseMediaPlayer(
              this.hass,
              this.entityId,
              mediaContentId,
              mediaContentType
            )
          : await browseLocalMediaPlayer(this.hass, mediaContentId);
    } finally {
      this._loading = false;
    }
    return itemData;
  }

  private _measureCard(): void {
    this._narrow = (this.dialog ? window.innerWidth : this.offsetWidth) < 450;
  }

  @eventOptions({ passive: true })
  private _scroll(ev: Event): void {
    const content = ev.currentTarget as HTMLDivElement;
    if (!this._scrolled && content.scrollTop > this._headerOffsetHeight) {
      this._scrolled = true;
    } else if (this._scrolled && content.scrollTop < this._headerOffsetHeight) {
      this._scrolled = false;
    }
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

  private _closeDialogAction(): void {
    fireEvent(this, "close-dialog");
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
              href="${documentationUrl(
                this.hass,
                "/more-info/local-media/setup-media"
              )}"
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

        .content {
          overflow-y: auto;
          padding-bottom: 20px;
          box-sizing: border-box;
        }

        .header {
          display: flex;
          justify-content: space-between;
          border-bottom: 1px solid var(--divider-color);
          background-color: var(--card-background-color);
          position: absolute;
          top: 0;
          right: 0;
          left: 0;
          z-index: 5;
          padding: 20px 24px 10px;
        }

        .header_button {
          position: relative;
          right: -8px;
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
          border-radius: 4px;
          transition: width 0.4s, height 0.4s;
        }

        .header-info {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-self: stretch;
          min-width: 0;
          flex: 1;
        }

        .header-info mwc-button {
          display: block;
          --mdc-theme-primary: var(--primary-color);
        }

        .breadcrumb {
          display: flex;
          flex-direction: column;
          overflow: hidden;
          flex-grow: 1;
        }

        .breadcrumb .title {
          font-size: 32px;
          line-height: 1.2;
          font-weight: bold;
          margin: 0;
          overflow: hidden;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
          padding-right: 8px;
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
          margin-bottom: 0;
          transition: height 0.5s, margin 0.5s;
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
          padding: 0px 24px;
          margin: 8px 0px;
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

        .ha-card-parent {
          position: relative;
          width: 100%;
        }

        .children ha-card {
          width: 100%;
          padding-bottom: 100%;
          position: relative;
          box-sizing: border-box;
          background-size: cover;
          background-repeat: no-repeat;
          background-position: center;
          transition: padding-bottom 0.1s ease-out;
        }

        .portrait.children ha-card {
          padding-bottom: 150%;
        }

        .child .folder,
        .child .play {
          position: absolute;
        }

        .child .folder {
          color: var(--secondary-text-color);
          top: calc(50% - (var(--mdc-icon-size) / 2));
          left: calc(50% - (var(--mdc-icon-size) / 2));
          --mdc-icon-size: calc(var(--media-browse-item-size, 175px) * 0.4);
        }

        .child .play {
          transition: color 0.5s;
          border-radius: 50%;
          bottom: calc(50% - 35px);
          right: calc(50% - 35px);
          opacity: 0;
          transition: opacity 0.1s ease-out;
        }

        .child .play:not(.can_expand) {
          --mdc-icon-button-size: 70px;
          --mdc-icon-size: 48px;
        }

        .ha-card-parent:hover .play:not(.can_expand) {
          opacity: 1;
          color: var(--primary-color);
        }

        .child .play.can_expand {
          opacity: 1;
          background-color: rgba(var(--rgb-card-background-color), 0.5);
          bottom: 4px;
          right: 4px;
        }

        .child .play:hover {
          color: var(--primary-color);
        }

        .ha-card-parent:hover ha-card {
          opacity: 0.5;
        }

        .child .title {
          font-size: 16px;
          padding-top: 8px;
          padding-left: 2px;
          overflow: hidden;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
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

        :host([narrow]) .breadcrumb .title {
          font-size: 24px;
        }

        :host([narrow]) .header {
          padding: 0;
        }

        :host([narrow]) .header.no-dialog {
          display: block;
        }

        :host([narrow]) .header_button {
          position: absolute;
          top: 14px;
          right: 8px;
        }

        :host([narrow]) .header-content {
          flex-direction: column;
          flex-wrap: nowrap;
        }

        :host([narrow]) .header-content .img {
          height: auto;
          width: 100%;
          margin-right: 0;
          padding-bottom: 50%;
          margin-bottom: 8px;
          position: relative;
          background-position: center;
          border-radius: 0;
          transition: width 0.4s, height 0.4s, padding-bottom 0.4s;
        }

        ha-fab {
          position: absolute;
          --mdc-theme-secondary: var(--primary-color);
          bottom: -20px;
          right: 20px;
        }

        :host([narrow]) .header-info mwc-button {
          margin-top: 16px;
          margin-bottom: 8px;
        }

        :host([narrow]) .header-info {
          padding: 20px 24px 10px;
        }

        :host([narrow]) .media-source {
          padding: 0 24px;
        }

        :host([narrow]) .children {
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
        }

        /* ============= Scroll ============= */

        :host([scroll]) .breadcrumb .subtitle {
          height: 0;
          margin: 0;
        }

        :host([scroll]) .breadcrumb .title {
          -webkit-line-clamp: 1;
        }

        :host(:not([narrow])[scroll]) .header:not(.no-img) mwc-icon-button {
          align-self: center;
        }

        :host([scroll]) .header-info mwc-button,
        .no-img .header-info mwc-button {
          padding-right: 4px;
        }

        :host([scroll][narrow]) .no-img .header-info mwc-button {
          padding-right: 16px;
        }

        :host([scroll]) .header-info {
          flex-direction: row;
        }

        :host([scroll]) .header-info mwc-button {
          align-self: center;
          margin-top: 0;
          margin-bottom: 0;
        }

        :host([scroll][narrow]) .no-img .header-info {
          flex-direction: row-reverse;
        }

        :host([scroll][narrow]) .header-info {
          padding: 20px 24px 10px 24px;
          align-items: center;
        }

        :host([scroll]) .header-content {
          align-items: flex-end;
          flex-direction: row;
        }

        :host([scroll]) .header-content .img {
          height: 75px;
          width: 75px;
        }

        :host([scroll][narrow]) .header-content .img {
          height: 100px;
          width: 100px;
          padding-bottom: initial;
          margin-bottom: 0;
        }

        :host([scroll]) ha-fab {
          bottom: 4px;
          right: 4px;
          --mdc-fab-box-shadow: none;
          --mdc-theme-secondary: rgba(var(--rgb-primary-color), 0.5);
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

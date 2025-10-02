import type { LitVirtualizer } from "@lit-labs/virtualizer";
import { grid } from "@lit-labs/virtualizer/layouts/grid";

import { mdiArrowUpRight, mdiPlay, mdiPlus, mdiKeyboard } from "@mdi/js";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import {
  customElement,
  eventOptions,
  property,
  query,
  state,
} from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { until } from "lit/directives/until";
import { fireEvent } from "../../common/dom/fire_event";
import { debounce } from "../../common/util/debounce";
import { isUnavailableState } from "../../data/entity";
import type {
  MediaPickedEvent,
  MediaPlayerBrowseAction,
  MediaPlayerItem,
  MediaPlayerLayoutType,
} from "../../data/media-player";
import {
  browseMediaPlayer,
  BROWSER_PLAYER,
  MediaClassBrowserSettings,
} from "../../data/media-player";
import {
  browseLocalMediaPlayer,
  isManualMediaSourceContentId,
  MANUAL_MEDIA_SOURCE_PREFIX,
} from "../../data/media_source";
import { isTTSMediaSource } from "../../data/tts";
import { showAlertDialog } from "../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../resources/styles";
import { loadVirtualizer } from "../../resources/virtualizer";
import type { HomeAssistant } from "../../types";
import {
  brandsUrl,
  extractDomainFromBrandUrl,
  isBrandUrl,
} from "../../util/brands-url";
import { documentationUrl } from "../../util/documentation-url";
import "../entity/ha-entity-picker";
import "../ha-alert";
import "../ha-button";
import "../ha-button-menu";
import "../ha-card";
import "../ha-fab";
import "../ha-icon-button";
import "../ha-list";
import "../ha-list-item";
import "../ha-spinner";
import "../ha-svg-icon";
import "../ha-tooltip";
import "./ha-browse-media-tts";
import "./ha-browse-media-manual";
import type { TtsMediaPickedEvent } from "./ha-browse-media-tts";
import type { ManualMediaPickedEvent } from "./ha-browse-media-manual";

declare global {
  interface HASSDomEvents {
    "media-picked": MediaPickedEvent;
    "media-browsed": {
      // Items of the new browse stack
      ids: MediaPlayerItemId[];
      // Current fetched item for this browse stack
      current?: MediaPlayerItem;
      // If the new stack should replace the old stack
      replace?: boolean;
    };
  }
}

export interface MediaPlayerItemId {
  media_content_id: string | undefined;
  media_content_type: string | undefined;
}

const MANUAL_ITEM: MediaPlayerItem = {
  can_expand: true,
  can_play: false,
  can_search: false,
  children_media_class: "",
  media_class: "app",
  media_content_id: MANUAL_MEDIA_SOURCE_PREFIX,
  media_content_type: "",
  iconPath: mdiKeyboard,
  title: "Manual entry",
};

@customElement("ha-media-player-browse")
export class HaMediaPlayerBrowse extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public entityId?: string;

  @property() public action: MediaPlayerBrowseAction = "play";

  @property({ attribute: false })
  public preferredLayout: MediaPlayerLayoutType = "auto";

  @property({ type: Boolean }) public dialog = false;

  @property({ attribute: false }) public navigateIds: MediaPlayerItemId[] = [];

  @property({ attribute: false }) public accept?: string[];

  @property({ attribute: false }) public defaultId?: string;

  @property({ attribute: false }) public defaultType?: string;

  // @todo Consider reworking to eliminate need for attribute since it is manipulated internally
  @property({ type: Boolean, reflect: true }) public narrow = false;

  // @todo Consider reworking to eliminate need for attribute since it is manipulated internally
  @property({ type: Boolean, reflect: true }) public scrolled = false;

  @state() private _error?: { message: string; code: string };

  @state() private _parentItem?: MediaPlayerItem;

  @state() private _currentItem?: MediaPlayerItem;

  @query(".header") private _header?: HTMLDivElement;

  @query(".content") private _content?: HTMLDivElement;

  @query("lit-virtualizer") private _virtualizer?: LitVirtualizer;

  private _observed = false;

  private _headerOffsetHeight = 0;

  private _resizeObserver?: ResizeObserver;

  public connectedCallback(): void {
    super.connectedCallback();
    this.updateComplete.then(() => this._attachResizeObserver());
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }
  }

  public async refresh() {
    const currentId = this.navigateIds[this.navigateIds.length - 1];
    try {
      this._currentItem = await this._fetchData(
        this.entityId,
        currentId.media_content_id,
        currentId.media_content_type
      );
      // Update the parent with latest item.
      fireEvent(this, "media-browsed", {
        ids: this.navigateIds,
        current: this._currentItem,
      });
    } catch (err) {
      this._setError(err);
    }
  }

  public play(): void {
    if (this._currentItem?.can_play) {
      this._runAction(this._currentItem);
    }
  }

  public willUpdate(changedProps: PropertyValues<this>): void {
    super.willUpdate(changedProps);

    if (!this.hasUpdated) {
      loadVirtualizer();
    }

    if (changedProps.has("entityId")) {
      this._setError(undefined);
    } else if (!changedProps.has("navigateIds")) {
      // Neither entity ID or navigateIDs changed, nothing to fetch
      return;
    }

    this._setError(undefined);

    const oldNavigateIds = changedProps.get("navigateIds") as
      | this["navigateIds"]
      | undefined;
    const navigateIds = this.navigateIds;

    // We're navigating. Reset the shizzle.
    this._content?.scrollTo(0, 0);
    this.scrolled = false;
    const oldCurrentItem = this._currentItem;
    const oldParentItem = this._parentItem;
    this._currentItem = undefined;
    this._parentItem = undefined;
    const currentId = navigateIds[navigateIds.length - 1];
    const parentId =
      navigateIds.length > 1 ? navigateIds[navigateIds.length - 2] : undefined;
    let currentProm: Promise<MediaPlayerItem> | undefined;
    let parentProm: Promise<MediaPlayerItem> | undefined;

    // See if we can take loading shortcuts if navigating to parent or child
    if (!changedProps.has("entityId")) {
      if (
        // Check if we navigated to a child
        oldNavigateIds &&
        navigateIds.length === oldNavigateIds.length + 1 &&
        oldNavigateIds.every((oldVal, idx) => {
          const curVal = navigateIds[idx];
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
        navigateIds.length === oldNavigateIds.length - 1 &&
        navigateIds.every((curVal, idx) => {
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
    if (
      currentId.media_content_id &&
      isManualMediaSourceContentId(currentId.media_content_id)
    ) {
      this._currentItem = MANUAL_ITEM;
      fireEvent(this, "media-browsed", {
        ids: navigateIds,
        current: this._currentItem,
      });
    } else {
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
          fireEvent(this, "media-browsed", {
            ids: navigateIds,
            current: item,
          });
        },
        (err) => {
          // When we change entity ID, we will first try to see if the new entity is
          // able to resolve the new path. If that results in an error, browse the root.
          const isNewEntityWithSamePath =
            oldNavigateIds &&
            changedProps.has("entityId") &&
            navigateIds.length === oldNavigateIds.length &&
            oldNavigateIds.every(
              (oldItem, idx) =>
                navigateIds[idx].media_content_id ===
                  oldItem.media_content_id &&
                navigateIds[idx].media_content_type ===
                  oldItem.media_content_type
            );
          if (isNewEntityWithSamePath) {
            fireEvent(this, "media-browsed", {
              ids: [
                { media_content_id: undefined, media_content_type: undefined },
              ],
              replace: true,
            });
          } else if (
            err.code === "entity_not_found" &&
            this.entityId &&
            isUnavailableState(this.hass.states[this.entityId]?.state)
          ) {
            this._setError({
              message: this.hass.localize(
                `ui.components.media-browser.media_player_unavailable`
              ),
              code: "entity_not_found",
            });
          } else {
            this._setError(err);
          }
        }
      );
    }
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

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (changedProps.size > 1 || !changedProps.has("hass")) {
      return true;
    }
    const oldHass = changedProps.get("hass") as this["hass"];
    return oldHass === undefined || oldHass.localize !== this.hass.localize;
  }

  protected firstUpdated(): void {
    this._measureCard();
    this._attachResizeObserver();
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);

    if (changedProps.has("_scrolled")) {
      this._animateHeaderHeight();
    } else if (changedProps.has("_currentItem")) {
      this._setHeaderHeight();

      // This fixes a race condition for resizing of the cards using the grid layout
      if (this._observed) {
        return;
      }

      // @ts-ignore
      const virtualizer = this._virtualizer?._virtualizer;

      if (virtualizer) {
        this._observed = true;
        setTimeout(() => virtualizer._observeMutations(), 0);
      }
    }
  }

  protected render() {
    if (this._error) {
      return html`
        <div class="container">
          <ha-alert alert-type="error">
            ${this._renderError(this._error)}
          </ha-alert>
        </div>
      `;
    }

    if (!this._currentItem) {
      return html`<ha-spinner></ha-spinner>`;
    }

    const currentItem = this._currentItem;

    const subtitle = this.hass.localize(
      `ui.components.media-browser.class.${currentItem.media_class}`
    );
    let children = currentItem.children || [];
    const canPlayChildren = new Set<string>();

    // Filter children based on accept property if provided
    if (this.accept && children.length > 0) {
      let checks: ((t: string) => boolean)[] = [];

      for (const type of this.accept) {
        if (type.endsWith("/*")) {
          const baseType = type.slice(0, -1);
          checks.push((t) => t.startsWith(baseType));
        } else if (type === "*") {
          checks = [() => true];
          break;
        } else {
          checks.push((t) => t === type);
        }
      }

      children = children.filter((child) => {
        const contentType = child.media_content_type.toLowerCase();
        const canPlay =
          child.media_content_type &&
          checks.some((check) => check(contentType));
        if (canPlay) {
          canPlayChildren.add(child.media_content_id);
        }
        return !child.media_content_type || child.can_expand || canPlay;
      });
    }

    const mediaClass = MediaClassBrowserSettings[currentItem.media_class];
    const childrenMediaClass = currentItem.children_media_class
      ? MediaClassBrowserSettings[currentItem.children_media_class]
      : MediaClassBrowserSettings.directory;

    const backgroundImage = currentItem.thumbnail
      ? this._getThumbnailURLorBase64(currentItem.thumbnail).then(
          (value) => `url(${value})`
        )
      : "none";

    return html`
              ${
                currentItem.can_play
                  ? html`
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
                                  style="background-image: ${until(
                                    backgroundImage,
                                    ""
                                  )}"
                                >
                                  ${this.narrow &&
                                  currentItem?.can_play &&
                                  (!this.accept ||
                                    canPlayChildren.has(
                                      currentItem.media_content_id
                                    ))
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
                                            .path=${this.action === "play"
                                              ? mdiPlay
                                              : mdiPlus}
                                          ></ha-svg-icon>
                                          ${this.hass.localize(
                                            `ui.components.media-browser.${this.action}`
                                          )}
                                        </ha-fab>
                                      `
                                    : ""}
                                </div>
                              `
                            : nothing}
                          <div class="header-info">
                            <div class="breadcrumb">
                              <h1 class="title">${currentItem.title}</h1>
                              ${subtitle
                                ? html` <h2 class="subtitle">${subtitle}</h2> `
                                : ""}
                            </div>
                            ${currentItem.can_play &&
                            (!currentItem.thumbnail || !this.narrow)
                              ? html`
                                  <ha-button
                                    .item=${currentItem}
                                    @click=${this._actionClicked}
                                  >
                                    <ha-svg-icon
                                      .label=${this.hass.localize(
                                        `ui.components.media-browser.${this.action}-media`
                                      )}
                                      .path=${this.action === "play"
                                        ? mdiPlay
                                        : mdiPlus}
                                      slot="start"
                                    ></ha-svg-icon>
                                    ${this.hass.localize(
                                      `ui.components.media-browser.${this.action}`
                                    )}
                                  </ha-button>
                                `
                              : ""}
                          </div>
                        </div>
                      </div>
                    `
                  : ""
              }
          <div
            class="content"
            @scroll=${this._scroll}
            @touchmove=${this._scroll}
          >
            ${
              this._error
                ? html`
                    <div class="container">
                      <ha-alert alert-type="error">
                        ${this._renderError(this._error)}
                      </ha-alert>
                    </div>
                  `
                : isManualMediaSourceContentId(currentItem.media_content_id)
                  ? html`<ha-browse-media-manual
                      .item=${{
                        media_content_id: this.defaultId || "",
                        media_content_type: this.defaultType || "",
                      }}
                      .hass=${this.hass}
                      @manual-media-picked=${this._manualPicked}
                    ></ha-browse-media-manual>`
                  : isTTSMediaSource(currentItem.media_content_id)
                    ? html`
                        <ha-browse-media-tts
                          .item=${currentItem}
                          .hass=${this.hass}
                          .action=${this.action}
                          @tts-picked=${this._ttsPicked}
                        ></ha-browse-media-tts>
                      `
                    : !children.length && !currentItem.not_shown
                      ? html`
                          <div class="container no-items">
                            ${currentItem.media_content_id ===
                            "media-source://media_source/local/."
                              ? html`
                                  <div class="highlight-add-button">
                                    <span>
                                      <ha-svg-icon
                                        .path=${mdiArrowUpRight}
                                      ></ha-svg-icon>
                                    </span>
                                    <span>
                                      ${this.hass.localize(
                                        "ui.components.media-browser.file_management.highlight_button"
                                      )}
                                    </span>
                                  </div>
                                `
                              : this.hass.localize(
                                  "ui.components.media-browser.no_items"
                                )}
                          </div>
                        `
                      : this.preferredLayout === "grid" ||
                          (this.preferredLayout === "auto" &&
                            childrenMediaClass.layout === "grid")
                        ? html`
                            <lit-virtualizer
                              scroller
                              .layout=${grid({
                                itemSize: {
                                  width: "175px",
                                  height:
                                    childrenMediaClass.thumbnail_ratio ===
                                    "portrait"
                                      ? "312px"
                                      : "225px",
                                },
                                gap: "16px",
                                flex: { preserve: "aspect-ratio" },
                                justify: "space-evenly",
                                direction: "vertical",
                              })}
                              .items=${children}
                              .renderItem=${this._renderGridItem}
                              class="children ${classMap({
                                portrait:
                                  childrenMediaClass.thumbnail_ratio ===
                                  "portrait",
                                not_shown: !!currentItem.not_shown,
                              })}"
                            ></lit-virtualizer>
                            ${currentItem.not_shown
                              ? html`
                                  <div class="grid not-shown">
                                    <div class="title">
                                      ${this.hass.localize(
                                        "ui.components.media-browser.not_shown",
                                        { count: currentItem.not_shown }
                                      )}
                                    </div>
                                  </div>
                                `
                              : ""}
                          `
                        : html`
                            <ha-list>
                              <lit-virtualizer
                                scroller
                                .items=${children}
                                style=${styleMap({
                                  height: `${children.length * 72 + 26}px`,
                                })}
                                .renderItem=${this._renderListItem}
                              ></lit-virtualizer>
                              ${currentItem.not_shown
                                ? html`
                                    <ha-list-item
                                      noninteractive
                                      class="not-shown"
                                      .graphic=${mediaClass.show_list_images
                                        ? "medium"
                                        : "avatar"}
                                    >
                                      <span class="title">
                                        ${this.hass.localize(
                                          "ui.components.media-browser.not_shown",
                                          { count: currentItem.not_shown }
                                        )}
                                      </span>
                                    </ha-list-item>
                                  `
                                : ""}
                            </ha-list>
                          `
            }
          </div>
        </div>
      </div>
    `;
  }

  private _renderGridItem = (child: MediaPlayerItem): TemplateResult => {
    const backgroundImage = child.thumbnail
      ? this._getThumbnailURLorBase64(child.thumbnail).then(
          (value) => `url(${value})`
        )
      : "none";

    return html`
      <div class="child" .item=${child} @click=${this._childClicked}>
        <ha-card outlined>
          <div class="thumbnail">
            ${child.thumbnail
              ? html`
                  <div
                    class="${classMap({
                      "centered-image": ["app", "directory"].includes(
                        child.media_class
                      ),
                      "brand-image": isBrandUrl(child.thumbnail),
                    })} image"
                    style="background-image: ${until(backgroundImage, "")}"
                  ></div>
                `
              : html`
                  <div class="icon-holder image">
                    <ha-svg-icon
                      class=${child.iconPath ? "icon" : "folder"}
                      .path=${child.iconPath ||
                      MediaClassBrowserSettings[
                        child.media_class === "directory"
                          ? child.children_media_class || child.media_class
                          : child.media_class
                      ].icon}
                    ></ha-svg-icon>
                  </div>
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
                    .path=${this.action === "play" ? mdiPlay : mdiPlus}
                    @click=${this._actionClicked}
                  ></ha-icon-button>
                `
              : ""}
          </div>
          <ha-tooltip .for="grid-${child.title}" distance="-4">
            ${child.title}
          </ha-tooltip>
          <div .id="grid-${child.title}" class="title">${child.title}</div>
        </ha-card>
      </div>
    `;
  };

  private _renderListItem = (child: MediaPlayerItem): TemplateResult => {
    const currentItem = this._currentItem;
    const mediaClass = MediaClassBrowserSettings[currentItem!.media_class];

    const backgroundImage =
      mediaClass.show_list_images && child.thumbnail
        ? this._getThumbnailURLorBase64(child.thumbnail).then(
            (value) => `url(${value})`
          )
        : "none";

    return html`
      <ha-list-item
        @click=${this._childClicked}
        .item=${child}
        .graphic=${mediaClass.show_list_images ? "medium" : "avatar"}
      >
        ${backgroundImage === "none" && !child.can_play
          ? html`<ha-svg-icon
              .path=${MediaClassBrowserSettings[
                child.media_class === "directory"
                  ? child.children_media_class || child.media_class
                  : child.media_class
              ].icon}
              slot="graphic"
            ></ha-svg-icon>`
          : html`<div
              class=${classMap({
                graphic: true,
                thumbnail: mediaClass.show_list_images === true,
              })}
              style="background-image: ${until(backgroundImage, "")}"
              slot="graphic"
            >
              ${child.can_play
                ? html`<ha-icon-button
                    class="play ${classMap({
                      show: !mediaClass.show_list_images || !child.thumbnail,
                    })}"
                    .item=${child}
                    .label=${this.hass.localize(
                      `ui.components.media-browser.${this.action}-media`
                    )}
                    .path=${this.action === "play" ? mdiPlay : mdiPlus}
                    @click=${this._actionClicked}
                  ></ha-icon-button>`
                : nothing}
            </div>`}
        <span class="title">${child.title}</span>
      </ha-list-item>
    `;
  };

  private async _getThumbnailURLorBase64(
    thumbnailUrl: string | undefined
  ): Promise<string> {
    if (!thumbnailUrl) {
      return "";
    }

    if (thumbnailUrl.startsWith("/")) {
      // Thumbnails served by local API require authentication
      return new Promise((resolve, reject) => {
        this.hass
          .fetchWithAuth(thumbnailUrl!)
          // Since we are fetching with an authorization header, we cannot just put the
          // URL directly into the document; we need to embed the image. We could do this
          // using blob URLs, but then we would need to keep track of them in order to
          // release them properly. Instead, we embed the thumbnail using base64.
          .then((response) => response.blob())
          .then((blob) => {
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result;
              resolve(typeof result === "string" ? result : "");
            };
            reader.onerror = (e) => reject(e);
            reader.readAsDataURL(blob);
          });
      });
    }

    if (isBrandUrl(thumbnailUrl)) {
      // The backend is not aware of the theme used by the users,
      // so we rewrite the URL to show a proper icon
      thumbnailUrl = brandsUrl({
        domain: extractDomainFromBrandUrl(thumbnailUrl),
        type: "icon",
        useFallback: true,
        darkOptimized: this.hass.themes?.darkMode,
      });
    }

    return thumbnailUrl;
  }

  private _actionClicked = (ev: MouseEvent): void => {
    ev.stopPropagation();
    const item = (ev.currentTarget as any).item;

    this._runAction(item);
  };

  private _runAction(item: MediaPlayerItem): void {
    fireEvent(this, "media-picked", { item, navigateIds: this.navigateIds });
  }

  private _ttsPicked(ev: CustomEvent<TtsMediaPickedEvent>): void {
    ev.stopPropagation();
    const navigateIds = this.navigateIds.slice(0, -1);
    navigateIds.push(ev.detail.item);
    fireEvent(this, "media-picked", {
      ...ev.detail,
      navigateIds,
    });
  }

  private _manualPicked(ev: CustomEvent<ManualMediaPickedEvent>) {
    ev.stopPropagation();
    fireEvent(this, "media-picked", {
      item: ev.detail.item as MediaPlayerItem,
      navigateIds: this.navigateIds,
    });
  }

  private _childClicked = async (ev: MouseEvent): Promise<void> => {
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
  };

  private async _fetchData(
    entityId: string | undefined,
    mediaContentId?: string,
    mediaContentType?: string
  ): Promise<MediaPlayerItem> {
    const prom =
      entityId && entityId !== BROWSER_PLAYER
        ? browseMediaPlayer(
            this.hass,
            entityId,
            mediaContentId,
            mediaContentType
          )
        : browseLocalMediaPlayer(this.hass, mediaContentId);

    return prom.then((item) => {
      if (!mediaContentId && this.action === "pick") {
        item.children = item.children || [];
        item.children.push(MANUAL_ITEM);
      }
      return item;
    });
  }

  private _measureCard(): void {
    this.narrow = (this.dialog ? window.innerWidth : this.offsetWidth) < 450;
  }

  private async _attachResizeObserver(): Promise<void> {
    if (!this._resizeObserver) {
      this._resizeObserver = new ResizeObserver(
        debounce(() => this._measureCard(), 250, false)
      );
    }

    this._resizeObserver.observe(this);
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
          ${this.hass.localize("ui.components.media-browser.setup_local_help", {
            documentation: html`<a
              href=${documentationUrl(
                this.hass,
                "/more-info/local-media/setup-media"
              )}
              target="_blank"
              rel="noreferrer"
              >${this.hass.localize(
                "ui.components.media-browser.documentation"
              )}</a
            >`,
          })}
          <br />
          ${this.hass.localize("ui.components.media-browser.local_media_files")}
        </p>
      `;
    }
    return html`<span class="error">${err.message}</span>`;
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

  @eventOptions({ passive: true })
  private _scroll(ev: Event): void {
    const content = ev.currentTarget as HTMLDivElement;
    if (!this.scrolled && content.scrollTop > this._headerOffsetHeight) {
      this.scrolled = true;
    } else if (this.scrolled && content.scrollTop < this._headerOffsetHeight) {
      this.scrolled = false;
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          display: flex;
          flex-direction: column;
          position: relative;
          direction: ltr;
        }

        ha-spinner {
          margin: 40px auto;
        }

        .container {
          padding: 16px;
        }

        .no-items {
          padding-left: 32px;
        }

        .highlight-add-button {
          display: flex;
          flex-direction: row-reverse;
          margin-right: 48px;
          margin-inline-end: 48px;
          margin-inline-start: initial;
          direction: var(--direction);
        }

        .highlight-add-button ha-svg-icon {
          position: relative;
          top: -0.5em;
          margin-left: 8px;
          margin-inline-start: 8px;
          margin-inline-end: initial;
          transform: scaleX(var(--scale-direction));
        }

        .content {
          overflow-y: auto;
          box-sizing: border-box;
          height: 100%;
        }

        /* HEADER */

        .header {
          display: flex;
          justify-content: space-between;
          border-bottom: 1px solid var(--divider-color);
          background-color: var(--card-background-color);
          position: absolute;
          top: 0;
          right: 0;
          left: 0;
          z-index: 3;
          padding: 16px;
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
          height: 175px;
          width: 175px;
          margin-right: 16px;
          background-size: cover;
          border-radius: 2px;
          transition:
            width 0.4s,
            height 0.4s;
        }
        .header-info {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-self: stretch;
          min-width: 0;
          flex: 1;
        }
        .header-info ha-button {
          display: block;
          padding-bottom: 16px;
        }
        .breadcrumb {
          display: flex;
          flex-direction: column;
          overflow: hidden;
          flex-grow: 1;
          padding-top: 16px;
        }
        .breadcrumb .title {
          font-size: var(--ha-font-size-4xl);
          line-height: var(--ha-line-height-condensed);
          font-weight: var(--ha-font-weight-bold);
          margin: 0;
          overflow: hidden;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
          padding-right: 8px;
        }
        .breadcrumb .previous-title {
          font-size: var(--ha-font-size-m);
          padding-bottom: 8px;
          color: var(--secondary-text-color);
          overflow: hidden;
          text-overflow: ellipsis;
          cursor: pointer;
          --mdc-icon-size: 14px;
        }
        .breadcrumb .subtitle {
          font-size: var(--ha-font-size-l);
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 0;
          transition:
            height 0.5s,
            margin 0.5s;
        }

        .not-shown {
          font-style: italic;
          color: var(--secondary-text-color);
          padding: 8px 16px 8px;
        }

        .grid.not-shown {
          display: flex;
          align-items: center;
          text-align: center;
        }

        /* ============= CHILDREN ============= */

        ha-list {
          --mdc-list-vertical-padding: 0;
          --mdc-list-item-graphic-margin: 0;
          --mdc-theme-text-icon-on-background: var(--secondary-text-color);
          margin-top: 10px;
        }

        ha-list li:last-child {
          display: none;
        }

        ha-list li[divider] {
          border-bottom-color: var(--divider-color);
        }

        ha-list-item {
          width: 100%;
        }

        div.children {
          display: grid;
          grid-template-columns: repeat(
            auto-fit,
            minmax(var(--media-browse-item-size, 175px), 0.1fr)
          );
          grid-gap: var(--ha-space-4);
          padding: 16px;
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
          box-sizing: border-box;
        }

        .children ha-card .thumbnail {
          width: 100%;
          position: relative;
          box-sizing: border-box;
          transition: padding-bottom 0.1s ease-out;
          padding-bottom: 100%;
        }

        .portrait ha-card .thumbnail {
          padding-bottom: 150%;
        }

        ha-card .image {
          border-radius: 3px 3px 0 0;
        }

        .image {
          position: absolute;
          top: 0;
          right: 0;
          left: 0;
          bottom: 0;
          background-size: cover;
          background-repeat: no-repeat;
          background-position: center;
        }

        .centered-image {
          margin: 0 8px;
          background-size: contain;
        }

        .brand-image {
          background-size: 40%;
        }

        .children ha-card .icon-holder {
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .child .folder {
          color: var(--secondary-text-color);
          --mdc-icon-size: calc(var(--media-browse-item-size, 175px) * 0.4);
        }

        .child .icon {
          color: #00a9f7; /* Match the png color from brands repo */
          --mdc-icon-size: calc(var(--media-browse-item-size, 175px) * 0.4);
        }

        .child .play {
          position: absolute;
          transition: color 0.5s;
          border-radius: 50%;
          top: calc(50% - 40px);
          right: calc(50% - 35px);
          opacity: 0;
          transition: opacity 0.1s ease-out;
        }

        .child .play:not(.can_expand) {
          --mdc-icon-button-size: 70px;
          --mdc-icon-size: 48px;
          background-color: var(--primary-color);
          color: var(--text-primary-color);
        }

        ha-card:hover .image {
          filter: brightness(70%);
          transition: filter 0.5s;
        }

        ha-card:hover .play {
          opacity: 1;
        }

        ha-card:hover .play.can_expand {
          bottom: 8px;
        }

        .child .play.can_expand {
          background-color: rgba(var(--rgb-card-background-color), 0.5);
          top: auto;
          bottom: 0px;
          right: 8px;
          transition:
            bottom 0.1s ease-out,
            opacity 0.1s ease-out;
        }

        .child .title {
          font-size: var(--ha-font-size-l);
          padding-top: 16px;
          padding-left: 2px;
          overflow: hidden;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 1;
          text-overflow: ellipsis;
        }

        .child ha-card .title {
          margin-bottom: 16px;
          padding-left: 16px;
        }

        ha-list-item .graphic {
          background-size: contain;
          background-repeat: no-repeat;
          background-position: center;
          border-radius: 2px;
          display: flex;
          align-content: center;
          align-items: center;
          line-height: initial;
        }

        ha-list-item .graphic .play {
          opacity: 0;
          transition: all 0.5s;
          background-color: rgba(var(--rgb-card-background-color), 0.5);
          border-radius: 50%;
          --mdc-icon-button-size: 40px;
        }

        ha-list-item:hover .graphic .play {
          opacity: 1;
          color: var(--primary-text-color);
        }

        ha-list-item .graphic .play.show {
          opacity: 1;
          background-color: transparent;
        }

        ha-list-item .title {
          margin-left: 16px;
          margin-inline-start: 16px;
          margin-inline-end: initial;
        }

        /* ============= Narrow ============= */

        :host([narrow]) {
          padding: 0;
        }

        :host([narrow]) .media-source {
          padding: 0 24px;
        }

        :host([narrow]) div.children {
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
        }

        :host([narrow]) .breadcrumb .title {
          font-size: var(--ha-font-size-2xl);
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
          transition:
            width 0.4s,
            height 0.4s,
            padding-bottom 0.4s;
        }
        ha-fab {
          position: absolute;
          --mdc-theme-secondary: var(--primary-color);
          bottom: -20px;
          right: 20px;
        }
        :host([narrow]) .header-info ha-button {
          margin-top: 16px;
          margin-bottom: 8px;
        }
        :host([narrow]) .header-info {
          padding: 0 16px 8px;
        }

        /* ============= Scroll ============= */
        :host([scrolled]) .breadcrumb .subtitle {
          height: 0;
          margin: 0;
        }
        :host([scrolled]) .breadcrumb .title {
          -webkit-line-clamp: 1;
        }
        :host(:not([narrow])[scrolled]) .header:not(.no-img) ha-icon-button {
          align-self: center;
        }
        :host([scrolled]) .header-info ha-button,
        .no-img .header-info ha-button {
          padding-right: 4px;
        }
        :host([scrolled][narrow]) .no-img .header-info ha-button {
          padding-right: 16px;
        }
        :host([scrolled]) .header-info {
          flex-direction: row;
        }
        :host([scrolled]) .header-info ha-button {
          align-self: center;
          margin-top: 0;
          margin-bottom: 0;
          padding-bottom: 0;
        }
        :host([scrolled][narrow]) .no-img .header-info {
          flex-direction: row-reverse;
        }
        :host([scrolled][narrow]) .header-info {
          padding: 20px 24px 10px 24px;
          align-items: center;
        }
        :host([scrolled]) .header-content {
          align-items: flex-end;
          flex-direction: row;
        }
        :host([scrolled]) .header-content .img {
          height: 75px;
          width: 75px;
        }
        :host([scrolled]) .breadcrumb {
          padding-top: 0;
          align-self: center;
        }
        :host([scrolled][narrow]) .header-content .img {
          height: 100px;
          width: 100px;
          padding-bottom: initial;
          margin-bottom: 0;
        }
        :host([scrolled]) ha-fab {
          bottom: 0px;
          right: -24px;
          --mdc-fab-box-shadow: none;
          --mdc-theme-secondary: rgba(var(--rgb-primary-color), 0.5);
        }

        lit-virtualizer {
          height: 100%;
          overflow: overlay !important;
          contain: size layout !important;
        }

        lit-virtualizer.not_shown {
          height: calc(100% - 36px);
        }

        ha-browse-media-tts {
          direction: var(--direction);
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

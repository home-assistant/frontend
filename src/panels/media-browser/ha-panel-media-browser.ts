import "@material/mwc-button";
import type { ActionDetail } from "@material/mwc-list";
import {
  mdiAlphaABoxOutline,
  mdiArrowLeft,
  mdiDotsVertical,
  mdiGrid,
  mdiListBoxOutline,
} from "@mdi/js";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { storage } from "../../common/decorators/storage";
import type { HASSDomEvent } from "../../common/dom/fire_event";
import { fireEvent } from "../../common/dom/fire_event";
import { navigate } from "../../common/navigate";
import "../../components/ha-icon-button";
import "../../components/ha-icon-button-arrow-prev";
import "../../components/ha-list-item";
import "../../components/ha-menu-button";
import "../../components/ha-top-app-bar-fixed";
import "../../components/media-player/ha-media-manage-button";
import "../../components/media-player/ha-media-player-browse";
import type {
  HaMediaPlayerBrowse,
  MediaPlayerItemId,
} from "../../components/media-player/ha-media-player-browse";
import {
  getEntityIdFromCameraMediaSource,
  isCameraMediaSource,
} from "../../data/camera";
import type {
  MediaPickedEvent,
  MediaPlayerItem,
  MediaPlayerLayoutType,
} from "../../data/media-player";
import { BROWSER_PLAYER, mediaPlayerPlayMedia } from "../../data/media-player";
import type { ResolvedMediaSource } from "../../data/media_source";
import { resolveMediaSource } from "../../data/media_source";
import { showAlertDialog } from "../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../resources/styles";
import type { HomeAssistant, Route } from "../../types";
import "./ha-bar-media-player";
import type { BarMediaPlayer } from "./ha-bar-media-player";
import { showWebBrowserPlayMediaDialog } from "./show-media-player-dialog";

const createMediaPanelUrl = (entityId: string, items: MediaPlayerItemId[]) => {
  const path = `/media-browser/${entityId}`;
  if (items.length <= 1) {
    return path;
  }
  const navigateIds = items
    .slice(1)
    .map((item) =>
      encodeURIComponent(`${item.media_content_type},${item.media_content_id}`)
    );
  const urlparams = new URLSearchParams();
  urlparams.set("ids", navigateIds.join(","));
  return path + "?" + urlparams.toString();
};

const decodeNavigateIds = (
  navigateIdsEncoded: string[]
): MediaPlayerItemId[] => [
  {
    media_content_id: undefined,
    media_content_type: undefined,
  },
  ...navigateIdsEncoded.map((navigateId) => {
    const decoded = decodeURIComponent(navigateId);
    // Don't use split because media_content_id could contain commas
    const delimiter = decoded.indexOf(",");
    return {
      media_content_type: decoded.substring(0, delimiter),
      media_content_id: decoded.substring(delimiter + 1),
    };
  }),
];

@customElement("ha-panel-media-browser")
class PanelMediaBrowser extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  @state() _currentItem?: MediaPlayerItem;

  @state()
  @storage({
    key: "mediaBrowserPreferredLayout",
    state: true,
    subscribe: false,
  })
  private _preferredLayout: MediaPlayerLayoutType = "auto";

  private _navigateIds: MediaPlayerItemId[] = [
    {
      media_content_id: undefined,
      media_content_type: undefined,
    },
  ];

  @state()
  @storage({
    key: "mediaBrowseEntityId",
    state: true,
    subscribe: false,
  })
  private _entityId = BROWSER_PLAYER;

  @query("ha-media-player-browse") private _browser!: HaMediaPlayerBrowse;

  @query("ha-bar-media-player") private _player!: BarMediaPlayer;

  protected render(): TemplateResult {
    return html`
      <ha-top-app-bar-fixed>
        ${this._navigateIds.length > 1
          ? html`
              <ha-icon-button-arrow-prev
                slot="navigationIcon"
                .path=${mdiArrowLeft}
                @click=${this._goBack}
              ></ha-icon-button-arrow-prev>
            `
          : html`
              <ha-menu-button
                slot="navigationIcon"
                .hass=${this.hass}
                .narrow=${this.narrow}
              ></ha-menu-button>
            `}
        <div slot="title">
          ${!this._currentItem
            ? this.hass.localize(
                "ui.components.media-browser.media-player-browser"
              )
            : this._currentItem.title}
        </div>
        <ha-media-manage-button
          slot="actionItems"
          .hass=${this.hass}
          .currentItem=${this._currentItem}
          @media-refresh=${this._refreshMedia}
        ></ha-media-manage-button>
        <ha-button-menu slot="actionItems" @action=${this._handleMenuAction}>
          <ha-icon-button
            slot="trigger"
            .label=${this.hass.localize("ui.common.menu")}
            .path=${mdiDotsVertical}
          ></ha-icon-button>
          <ha-list-item graphic="icon">
            ${this.hass.localize("ui.components.media-browser.auto")}
            <ha-svg-icon
              class=${this._preferredLayout === "auto"
                ? "selected_menu_item"
                : ""}
              slot="graphic"
              .path=${mdiAlphaABoxOutline}
            ></ha-svg-icon>
          </ha-list-item>
          <ha-list-item graphic="icon">
            ${this.hass.localize("ui.components.media-browser.grid")}
            <ha-svg-icon
              class=${this._preferredLayout === "grid"
                ? "selected_menu_item"
                : ""}
              slot="graphic"
              .path=${mdiGrid}
            ></ha-svg-icon>
          </ha-list-item>
          <ha-list-item graphic="icon">
            ${this.hass.localize("ui.components.media-browser.list")}
            <ha-svg-icon
              slot="graphic"
              class=${this._preferredLayout === "list"
                ? "selected_menu_item"
                : ""}
              .path=${mdiListBoxOutline}
            ></ha-svg-icon>
          </ha-list-item>
        </ha-button-menu>
        <ha-media-player-browse
          .hass=${this.hass}
          .entityId=${this._entityId}
          .navigateIds=${this._navigateIds}
          .preferredLayout=${this._preferredLayout}
          @media-picked=${this._mediaPicked}
          @media-browsed=${this._mediaBrowsed}
        ></ha-media-player-browse>
      </ha-top-app-bar-fixed>
      <ha-bar-media-player
        .hass=${this.hass}
        .entityId=${this._entityId}
        .narrow=${this.narrow}
        @player-picked=${this._playerPicked}
      ></ha-bar-media-player>
    `;
  }

  private async _handleMenuAction(ev: CustomEvent<ActionDetail>) {
    switch (ev.detail.index) {
      case 0:
        this._preferredLayout = "auto";
        break;
      case 1:
        this._preferredLayout = "grid";
        break;
      case 2:
        this._preferredLayout = "list";
        break;
    }
  }

  public willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);

    if (
      !this.hasUpdated &&
      this._entityId !== BROWSER_PLAYER &&
      !(this._entityId in this.hass.states)
    ) {
      this._entityId = BROWSER_PLAYER;
    }

    if (!changedProps.has("route")) {
      return;
    }

    if (this.route.path === "") {
      navigate(`/media-browser/${this._entityId}`, { replace: true });
      return;
    }

    const [routePlayer, ...paths] = this.route.path.substring(1).split("/");

    const navigateIdsEncoded =
      new URLSearchParams(location.search).get("ids")?.split(",") || [];

    // Backwards compatibility with old URLs
    if (navigateIdsEncoded.length === 0 && paths.length > 0) {
      const navigateIds = decodeNavigateIds(paths);
      navigate(createMediaPanelUrl(this._entityId, navigateIds), {
        replace: true,
      });
      return;
    }

    if (routePlayer !== this._entityId) {
      // Detect if picked player doesn't exist (anymore)
      // Can happen if URL bookmarked or stored in local storage
      if (
        routePlayer !== BROWSER_PLAYER &&
        this.hass.states[routePlayer] === undefined
      ) {
        navigate(`/media-browser/${BROWSER_PLAYER}`, { replace: true });
        showAlertDialog(this, {
          text: this.hass.localize(
            "ui.panel.media-browser.error.player_not_exist",
            {
              name: routePlayer,
            }
          ),
        });
        return;
      }
      this._entityId = routePlayer;
    }

    this._navigateIds = decodeNavigateIds(navigateIdsEncoded);
    this._currentItem = undefined;
  }

  private _goBack() {
    navigate(
      createMediaPanelUrl(this._entityId, this._navigateIds.slice(0, -1))
    );
    this.requestUpdate("route");
  }

  private _mediaBrowsed(ev: { detail: HASSDomEvents["media-browsed"] }) {
    if (ev.detail.ids === this._navigateIds) {
      this._currentItem = ev.detail.current;
      return;
    }

    navigate(createMediaPanelUrl(this._entityId, ev.detail.ids), {
      replace: ev.detail.replace,
    });
    this.requestUpdate("route");
  }

  private async _mediaPicked(
    ev: HASSDomEvent<MediaPickedEvent>
  ): Promise<void> {
    const item = ev.detail.item;

    if (this._entityId !== BROWSER_PLAYER) {
      this._player.showResolvingNewMediaPicked();
      try {
        await mediaPlayerPlayMedia(
          this.hass,
          this._entityId,
          item.media_content_id,
          item.media_content_type
        );
      } catch (_err) {
        this._player.hideResolvingNewMediaPicked();
      }
      return;
    }

    // We won't cancel current media being played if we're going to
    // open a camera.
    if (isCameraMediaSource(item.media_content_id)) {
      fireEvent(this, "hass-more-info", {
        entityId: getEntityIdFromCameraMediaSource(item.media_content_id),
      });
      return;
    }

    this._player.showResolvingNewMediaPicked();
    let resolvedUrl: ResolvedMediaSource;
    try {
      resolvedUrl = await resolveMediaSource(this.hass, item.media_content_id);
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.components.media-browser.media_browsing_error"
        ),
        text: err.message,
      });
      this._player.hideResolvingNewMediaPicked();
      return;
    }

    if (resolvedUrl.mime_type.startsWith("audio/")) {
      this._player.playItem(item, resolvedUrl);
      return;
    }

    showWebBrowserPlayMediaDialog(this, {
      sourceUrl: resolvedUrl.url,
      sourceType: resolvedUrl.mime_type,
      title: item.title,
      can_play: item.can_play,
    });
    this._player.hideResolvingNewMediaPicked();
  }

  private _playerPicked(ev) {
    const entityId: string = ev.detail.entityId;
    if (entityId === this._entityId) {
      return;
    }
    navigate(createMediaPanelUrl(entityId, this._navigateIds));
  }

  private _refreshMedia() {
    this._browser.refresh();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        ha-media-manage-button {
          --mdc-theme-primary: var(--app-header-text-color);
        }

        ha-media-player-browse {
          height: calc(100vh - (100px + var(--header-height)));
        }

        :host([narrow]) ha-media-player-browse {
          height: calc(100vh - (57px + var(--header-height)));
        }
        .selected_menu_item {
          color: var(--primary-color);
        }

        ha-bar-media-player {
          position: fixed;
          width: var(--mdc-top-app-bar-width, 100%);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-panel-media-browser": PanelMediaBrowser;
  }
}

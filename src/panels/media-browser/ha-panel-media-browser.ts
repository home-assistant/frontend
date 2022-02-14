import { mdiArrowLeft, mdiUpload } from "@mdi/js";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import "@material/mwc-button";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { LocalStorage } from "../../common/decorators/local-storage";
import { fireEvent, HASSDomEvent } from "../../common/dom/fire_event";
import { navigate } from "../../common/navigate";
import "../../components/ha-menu-button";
import "../../components/ha-circular-progress";
import "../../components/ha-icon-button";
import "../../components/ha-svg-icon";
import "../../components/media-player/ha-media-player-browse";
import type {
  HaMediaPlayerBrowse,
  MediaPlayerItemId,
} from "../../components/media-player/ha-media-player-browse";
import {
  BROWSER_PLAYER,
  MediaPickedEvent,
  MediaPlayerItem,
} from "../../data/media-player";
import {
  isLocalMediaSourceContentId,
  resolveMediaSource,
  uploadLocalMedia,
} from "../../data/media_source";
import "../../layouts/ha-app-layout";
import { haStyle } from "../../resources/styles";
import type { HomeAssistant, Route } from "../../types";
import "./ha-bar-media-player";
import { showWebBrowserPlayMediaDialog } from "./show-media-player-dialog";
import { showAlertDialog } from "../../dialogs/generic/show-dialog-box";
import {
  getEntityIdFromCameraMediaSource,
  isCameraMediaSource,
} from "../../data/camera";

const createMediaPanelUrl = (entityId: string, items: MediaPlayerItemId[]) => {
  let path = `/media-browser/${entityId}`;
  for (const item of items.slice(1)) {
    path +=
      "/" +
      encodeURIComponent(`${item.media_content_type},${item.media_content_id}`);
  }
  return path;
};

@customElement("ha-panel-media-browser")
class PanelMediaBrowser extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true })
  public narrow!: boolean;

  @property() public route!: Route;

  @state() _currentItem?: MediaPlayerItem;

  @state() _uploading = 0;

  private _navigateIds: MediaPlayerItemId[] = [
    {
      media_content_id: undefined,
      media_content_type: undefined,
    },
  ];

  @LocalStorage("mediaBrowseEntityId", true, false)
  private _entityId = BROWSER_PLAYER;

  @query("ha-media-player-browse") private _browser!: HaMediaPlayerBrowse;

  protected render(): TemplateResult {
    return html`
      <ha-app-layout>
        <app-header fixed slot="header">
          <app-toolbar>
            ${this._navigateIds.length > 1
              ? html`
                  <ha-icon-button
                    .path=${mdiArrowLeft}
                    @click=${this._goBack}
                  ></ha-icon-button>
                `
              : html`
                  <ha-menu-button
                    .hass=${this.hass}
                    .narrow=${this.narrow}
                  ></ha-menu-button>
                `}
            <div main-title>
              ${!this._currentItem
                ? this.hass.localize(
                    "ui.components.media-browser.media-player-browser"
                  )
                : this._currentItem.title}
            </div>
            ${this._currentItem &&
            isLocalMediaSourceContentId(
              this._currentItem.media_content_id || ""
            )
              ? html`
                  <mwc-button
                    .label=${this._uploading > 0
                      ? this.hass.localize(
                          "ui.components.media-browser.file_management.uploading",
                          {
                            count: this._uploading,
                          }
                        )
                      : this.hass.localize(
                          "ui.components.media-browser.file_management.add_media"
                        )}
                    .disabled=${this._uploading > 0}
                    @click=${this._startUpload}
                  >
                    ${this._uploading > 0
                      ? html`
                          <ha-circular-progress
                            size="tiny"
                            active
                            alt=""
                            slot="icon"
                          ></ha-circular-progress>
                        `
                      : html`
                          <ha-svg-icon
                            .path=${mdiUpload}
                            slot="icon"
                          ></ha-svg-icon>
                        `}
                  </mwc-button>
                `
              : ""}
          </app-toolbar>
        </app-header>
        <ha-media-player-browse
          .hass=${this.hass}
          .entityId=${this._entityId}
          .navigateIds=${this._navigateIds}
          @media-picked=${this._mediaPicked}
          @media-browsed=${this._mediaBrowsed}
        ></ha-media-player-browse>
      </ha-app-layout>
      <ha-bar-media-player
        .hass=${this.hass}
        .entityId=${this._entityId}
        .narrow=${this.narrow}
        @player-picked=${this._playerPicked}
      ></ha-bar-media-player>
    `;
  }

  public willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);

    if (!changedProps.has("route")) {
      return;
    }

    if (this.route.path === "") {
      navigate(`/media-browser/${this._entityId}`, { replace: true });
      return;
    }

    const [routePlayer, ...navigateIdsEncoded] = this.route.path
      .substring(1)
      .split("/");

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

    this._navigateIds = [
      {
        media_content_type: undefined,
        media_content_id: undefined,
      },
      ...navigateIdsEncoded.map((navigateId) => {
        const [media_content_type, media_content_id] =
          decodeURIComponent(navigateId).split(",");
        return {
          media_content_type,
          media_content_id,
        };
      }),
    ];
    this._currentItem = undefined;
  }

  private _goBack() {
    navigate(
      createMediaPanelUrl(this._entityId, this._navigateIds.slice(0, -1))
    );
  }

  private _mediaBrowsed(ev: { detail: HASSDomEvents["media-browsed"] }) {
    if (ev.detail.ids === this._navigateIds) {
      this._currentItem = ev.detail.current;
      return;
    }

    navigate(createMediaPanelUrl(this._entityId, ev.detail.ids), {
      replace: ev.detail.replace,
    });
  }

  private async _mediaPicked(
    ev: HASSDomEvent<MediaPickedEvent>
  ): Promise<void> {
    const item = ev.detail.item;
    if (this._entityId !== BROWSER_PLAYER) {
      this.hass!.callService("media_player", "play_media", {
        entity_id: this._entityId,
        media_content_id: item.media_content_id,
        media_content_type: item.media_content_type,
      });
      return;
    }

    if (isCameraMediaSource(item.media_content_id)) {
      fireEvent(this, "hass-more-info", {
        entityId: getEntityIdFromCameraMediaSource(item.media_content_id),
      });
      return;
    }

    const resolvedUrl = await resolveMediaSource(
      this.hass,
      item.media_content_id
    );

    if (resolvedUrl.mime_type.startsWith("audio/")) {
      await this.shadowRoot!.querySelector("ha-bar-media-player")!.playItem(
        item
      );
      return;
    }

    showWebBrowserPlayMediaDialog(this, {
      sourceUrl: resolvedUrl.url,
      sourceType: resolvedUrl.mime_type,
      title: item.title,
      can_play: item.can_play,
    });
  }

  private _playerPicked(ev) {
    const entityId: string = ev.detail.entityId;
    if (entityId === this._entityId) {
      return;
    }
    navigate(createMediaPanelUrl(entityId, this._navigateIds));
  }

  private async _startUpload() {
    if (this._uploading > 0) {
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "audio/*,video/*,image/*";
    input.multiple = true;
    input.addEventListener(
      "change",
      async () => {
        const files = input.files!;
        const target = this._currentItem!.media_content_id!;

        for (let i = 0; i < files.length; i++) {
          this._uploading = files.length - i;
          try {
            // eslint-disable-next-line no-await-in-loop
            await uploadLocalMedia(this.hass, target, files[i]);
          } catch (err: any) {
            showAlertDialog(this, {
              text: this.hass.localize(
                "ui.components.media-browser.file_management.upload_failed",
                {
                  reason: err.message || err,
                }
              ),
            });
            break;
          }
        }
        this._uploading = 0;
        await this._browser.refresh();
      },
      { once: true }
    );
    input.click();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        app-toolbar mwc-button {
          --mdc-theme-primary: var(--app-header-text-color);
          /* We use icon + text to show disabled state */
          --mdc-button-disabled-ink-color: var(--app-header-text-color);
        }

        ha-media-player-browse {
          height: calc(100vh - (100px + var(--header-height)));
        }

        :host([narrow]) ha-media-player-browse {
          height: calc(100vh - (80px + var(--header-height)));
        }

        ha-bar-media-player {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
        }

        ha-svg-icon[slot="icon"],
        ha-circular-progress[slot="icon"] {
          vertical-align: middle;
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

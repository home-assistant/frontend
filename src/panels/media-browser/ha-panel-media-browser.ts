import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property } from "lit/decorators";
import { LocalStorage } from "../../common/decorators/local-storage";
import { HASSDomEvent } from "../../common/dom/fire_event";
import { navigate } from "../../common/navigate";
import "../../components/ha-menu-button";
import "../../components/media-player/ha-media-player-browse";
import type { MediaPlayerItemId } from "../../components/media-player/ha-media-player-browse";
import { BROWSER_PLAYER, MediaPickedEvent } from "../../data/media-player";
import "../../layouts/ha-app-layout";
import { haStyle } from "../../resources/styles";
import type { HomeAssistant, Route } from "../../types";
import "./ha-bar-media-player";
import { showWebBrowserPlayMediaDialog } from "./show-media-player-dialog";

@customElement("ha-panel-media-browser")
class PanelMediaBrowser extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true })
  public narrow!: boolean;

  @property() public route!: Route;

  private _navigateIds: MediaPlayerItemId[] = [
    {
      media_content_id: undefined,
      media_content_type: undefined,
    },
  ];

  @LocalStorage("mediaBrowseEntityId", true, false)
  private _entityId = BROWSER_PLAYER;

  protected render(): TemplateResult {
    return html`
      <ha-app-layout>
        <app-header fixed slot="header">
          <app-toolbar>
            <ha-menu-button
              .hass=${this.hass}
              .narrow=${this.narrow}
            ></ha-menu-button>
            <div main-title class="heading">
              <div>
                ${this.hass.localize(
                  "ui.components.media-browser.media-player-browser"
                )}
              </div>
            </div>
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
  }

  private _mediaBrowsed(ev) {
    if (ev.detail.back) {
      history.back();
      return;
    }
    let path = "";
    for (const item of ev.detail.ids.slice(1)) {
      path +=
        "/" +
        encodeURIComponent(
          `${item.media_content_type},${item.media_content_id}`
        );
    }
    navigate(`/media-browser/${this._entityId}${path}`);
  }

  private async _mediaPicked(
    ev: HASSDomEvent<MediaPickedEvent>
  ): Promise<void> {
    const item = ev.detail.item;
    if (this._entityId === BROWSER_PLAYER) {
      const resolvedUrl: any = await this.hass.callWS({
        type: "media_source/resolve_media",
        media_content_id: item.media_content_id,
      });

      showWebBrowserPlayMediaDialog(this, {
        sourceUrl: resolvedUrl.url,
        sourceType: resolvedUrl.mime_type,
        title: item.title,
      });
      return;
    }

    this.hass!.callService("media_player", "play_media", {
      entity_id: this._entityId,
      media_content_id: item.media_content_id,
      media_content_type: item.media_content_type,
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          --mdc-theme-primary: var(--app-header-text-color);
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-panel-media-browser": PanelMediaBrowser;
  }
}

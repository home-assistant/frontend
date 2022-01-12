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
import { computeStateDomain } from "../../common/entity/compute_state_domain";
import { supportsFeature } from "../../common/entity/supports-feature";
import { navigate } from "../../common/navigate";
import "../../components/ha-menu-button";
import "../../components/media-player/ha-media-player-browse";
import {
  BROWSER_PLAYER,
  MediaPickedEvent,
  SUPPORT_BROWSE_MEDIA,
} from "../../data/media-player";
import "../../layouts/ha-app-layout";
import { haStyle } from "../../resources/styles";
import type { HomeAssistant, Route } from "../../types";
import { showWebBrowserPlayMediaDialog } from "./show-media-player-dialog";
import { showSelectMediaPlayerDialog } from "./show-select-media-source-dialog";

@customElement("ha-panel-media-browser")
class PanelMediaBrowser extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true })
  public narrow!: boolean;

  @property() public route!: Route;

  // @ts-ignore
  @LocalStorage("mediaBrowseEntityId", true)
  private _entityId = BROWSER_PLAYER;

  protected render(): TemplateResult {
    const stateObj = this._entityId
      ? this.hass.states[this._entityId]
      : undefined;

    const title =
      this._entityId === BROWSER_PLAYER
        ? `${this.hass.localize("ui.components.media-browser.web-browser")}`
        : stateObj?.attributes.friendly_name
        ? `${stateObj?.attributes.friendly_name}`
        : undefined;

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
              <div class="secondary-text">${title || ""}</div>
            </div>
            <mwc-button @click=${this._showSelectMediaPlayerDialog}>
              ${this.hass.localize("ui.components.media-browser.choose_player")}
            </mwc-button>
          </app-toolbar>
        </app-header>
        <div class="content">
          <ha-media-player-browse
            .hass=${this.hass}
            .entityId=${this._entityId}
            @media-picked=${this._mediaPicked}
          ></ha-media-player-browse>
        </div>
      </ha-app-layout>
    `;
  }

  public updated(changedProps: PropertyValues): void {
    super.updated(changedProps);

    if (!changedProps.has("route")) {
      return;
    }

    if (this.route.path === "") {
      navigate(`/media-browser/${this._entityId}`, { replace: true });
      return;
    }

    const routePlayer = this.route.path.substring(1).split("/")[0];
    if (routePlayer !== this._entityId) {
      this._entityId = routePlayer;
    }
  }

  private _showSelectMediaPlayerDialog(): void {
    showSelectMediaPlayerDialog(this, {
      mediaSources: this._mediaPlayerEntities,
      sourceSelectedCallback: (entityId) => {
        navigate(`/media-browser/${entityId}`, { replace: true });
      },
    });
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

  private get _mediaPlayerEntities() {
    return Object.values(this.hass!.states).filter((entity) => {
      if (
        computeStateDomain(entity) === "media_player" &&
        supportsFeature(entity, SUPPORT_BROWSE_MEDIA)
      ) {
        return true;
      }

      return false;
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
          height: calc(100vh - var(--header-height));
        }
        :host([narrow]) app-toolbar mwc-button {
          width: 65px;
        }
        .heading {
          overflow: hidden;
          white-space: nowrap;
          margin-top: 4px;
        }
        .heading .secondary-text {
          font-size: 14px;
          overflow: hidden;
          text-overflow: ellipsis;
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

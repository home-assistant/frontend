import { mdiLoginVariant } from "@mdi/js";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import {
  css,
  CSSResultArray,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import memoize from "memoize-one";
import { LocalStorage } from "../../common/decorators/local-storage";
import { HASSDomEvent } from "../../common/dom/fire_event";
import { computeDomain } from "../../common/entity/compute_domain";
import { supportsFeature } from "../../common/entity/supports-feature";
import "../../components/ha-menu-button";
import "../../components/media-player/ha-media-player-browse";
import {
  MediaPickedEvent,
  SUPPORT_BROWSE_MEDIA,
} from "../../data/media-player";
import "../../layouts/ha-app-layout";
import { haStyle } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import { showMediaPlayerDialog } from "./show-media-player-dialog";
import { showSelectMediaSourceDialog } from "./show-select-media-source-dialog";

@customElement("ha-panel-media-browser")
class PanelMediaBrowser extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true })
  public narrow!: boolean;

  // @ts-ignore
  @LocalStorage("mediaBrowseEntityId")
  private _entityId?: string;

  protected render(): TemplateResult {
    const stateObj = this._entityId
      ? this.hass.states[this._entityId]
      : undefined;

    const title =
      this._entityId === "browser"
        ? `${this.hass.localize("ui.components.media-browser.web-browser")} - `
        : stateObj?.attributes.friendly_name
        ? `${stateObj?.attributes.friendly_name} - `
        : undefined;

    return html`
      <ha-app-layout>
        <app-header fixed slot="header">
          <app-toolbar>
            <ha-menu-button
              .hass=${this.hass}
              .narrow=${this.narrow}
            ></ha-menu-button>
            <div main-title>
              ${title || ""}${this.hass.localize(
                "ui.components.media-browser.media-player-browser"
              )}
            </div>
            <mwc-icon-button
              .label=${this.hass.localize(
                "ui.components.media-browser.choose-source"
              )}
              @click=${this._showMediaSouceDialog}
            >
              <ha-svg-icon .path=${mdiLoginVariant}></ha-svg-icon>
            </mwc-icon-button>
          </app-toolbar>
        </app-header>
        <div class="content">
          ${this._entityId
            ? html`
                <ha-media-player-browse
                  .hass=${this.hass}
                  .entityId=${this._entityId}
                  @media-picked=${this._mediaPicked}
                ></ha-media-player-browse>
              `
            : html`
                <div class="no-source">
                  <h2>
                    ${this.hass.localize(
                      "ui.components.media-browser.choose_media_source"
                    )}
                  </h2>
                  <mwc-button raised @click=${this._showMediaSouceDialog}
                    >${this.hass.localize(
                      "ui.components.media-browser.choose-source"
                    )}</mwc-button
                  >
                </div>
              `}
        </div>
      </ha-app-layout>
    `;
  }

  private _showMediaSouceDialog(): void {
    showSelectMediaSourceDialog(this, {
      mediaSources: this._browseMediaSources(this.hass),
      sourceSelectedCallback: (entityId) => {
        this._entityId = entityId;
        this.requestUpdate();
      },
    });
  }

  private async _mediaPicked(
    ev: HASSDomEvent<MediaPickedEvent>
  ): Promise<void> {
    const item = ev.detail.item;
    if (this._entityId === "browser") {
      const resolvedUrl: any = await this.hass.callWS({
        type: "media_source/resolve_media",
        media_content_id: item.media_content_id,
      });

      showMediaPlayerDialog(this, {
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

  static get styles(): CSSResultArray {
    return [
      haStyle,
      css`
        .no-source {
          text-align: center;
        }

        .no-source mwc-button {
          display: block;
          padding-top: 24px;
        }

        ha-media-player-browse,
        .no-source {
          height: calc(100vh - 84px);
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

import { mdiPlayBox, mdiPlus } from "@mdi/js";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { fireEvent } from "../../common/dom/fire_event";
import { supportsFeature } from "../../common/entity/supports-feature";
import { getSignedPath } from "../../data/auth";
import type { MediaPickedEvent } from "../../data/media-player";
import {
  MediaClassBrowserSettings,
  MediaPlayerEntityFeature,
} from "../../data/media-player";
import type { MediaSelector, MediaSelectorValue } from "../../data/selector";
import type { HomeAssistant } from "../../types";
import { brandsUrl, extractDomainFromBrandUrl } from "../../util/brands-url";
import "../ha-alert";
import "../ha-form/ha-form";
import type { SchemaUnion } from "../ha-form/types";
import { showMediaBrowserDialog } from "../media-player/show-media-browser-dialog";

const MANUAL_SCHEMA = [
  { name: "media_content_id", required: false, selector: { text: {} } },
  { name: "media_content_type", required: false, selector: { text: {} } },
] as const;

@customElement("ha-selector-media")
export class HaMediaSelector extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public selector!: MediaSelector;

  @property({ attribute: false }) public value?: MediaSelectorValue;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  @property({ type: Boolean, reflect: true }) public required = true;

  @state() private _thumbnailUrl?: string | null;

  willUpdate(changedProps: PropertyValues<this>) {
    if (changedProps.has("value")) {
      const thumbnail = this.value?.metadata?.thumbnail;
      const oldThumbnail = (changedProps.get("value") as this["value"])
        ?.metadata?.thumbnail;
      if (thumbnail === oldThumbnail) {
        return;
      }
      if (thumbnail && thumbnail.startsWith("/")) {
        this._thumbnailUrl = undefined;
        // Thumbnails served by local API require authentication
        getSignedPath(this.hass, thumbnail).then((signedPath) => {
          this._thumbnailUrl = signedPath.path;
        });
      } else if (
        thumbnail &&
        thumbnail.startsWith("https://brands.home-assistant.io")
      ) {
        // The backend is not aware of the theme used by the users,
        // so we rewrite the URL to show a proper icon
        this._thumbnailUrl = brandsUrl({
          domain: extractDomainFromBrandUrl(thumbnail),
          type: "icon",
          useFallback: true,
          darkOptimized: this.hass.themes?.darkMode,
        });
      } else {
        this._thumbnailUrl = thumbnail;
      }
    }
  }

  protected render() {
    const stateObj = this.value?.entity_id
      ? this.hass.states[this.value.entity_id]
      : undefined;

    const supportsBrowse =
      !this.value?.entity_id ||
      (stateObj &&
        supportsFeature(stateObj, MediaPlayerEntityFeature.BROWSE_MEDIA));

    const hasAccept = this.selector.media?.accept?.length;

    return html`
      ${hasAccept
        ? nothing
        : html`
            <ha-entity-picker
              .hass=${this.hass}
              .value=${this.value?.entity_id}
              .label=${this.label ||
              this.hass.localize(
                "ui.components.selectors.media.pick_media_player"
              )}
              .disabled=${this.disabled}
              .helper=${this.helper}
              .required=${this.required}
              .includeDomains=${["media_player"]}
              allow-custom-entity
              @value-changed=${this._entityChanged}
            ></ha-entity-picker>
          `}
      ${!supportsBrowse
        ? html`
            <ha-alert>
              ${this.hass.localize(
                "ui.components.selectors.media.browse_not_supported"
              )}
            </ha-alert>
            <ha-form
              .hass=${this.hass}
              .data=${this.value || {}}
              .schema=${MANUAL_SCHEMA}
              .computeLabel=${this._computeLabelCallback}
            ></ha-form>
          `
        : html`
            <ha-card
              outlined
              tabindex="0"
              role="button"
              aria-label=${!this.value?.media_content_id
                ? this.hass.localize("ui.components.selectors.media.pick_media")
                : this.value.metadata?.title || this.value.media_content_id}
              @click=${this._pickMedia}
              @keydown=${this._handleKeyDown}
              class=${this.disabled || (!this.value?.entity_id && !hasAccept)
                ? "disabled"
                : ""}
            >
              <div class="content-container">
                <div class="thumbnail">
                  ${this.value?.metadata?.thumbnail
                    ? html`
                        <div
                          class="${classMap({
                            "centered-image":
                              !!this.value.metadata.media_class &&
                              ["app", "directory"].includes(
                                this.value.metadata.media_class
                              ),
                          })}
                          image"
                          style=${this._thumbnailUrl
                            ? `background-image: url(${this._thumbnailUrl});`
                            : ""}
                        ></div>
                      `
                    : html`
                        <div class="icon-holder image">
                          <ha-svg-icon
                            class="folder"
                            .path=${!this.value?.media_content_id
                              ? mdiPlus
                              : this.value?.metadata?.media_class
                                ? MediaClassBrowserSettings[
                                    this.value.metadata.media_class ===
                                    "directory"
                                      ? this.value.metadata
                                          .children_media_class ||
                                        this.value.metadata.media_class
                                      : this.value.metadata.media_class
                                  ].icon
                                : mdiPlayBox}
                          ></ha-svg-icon>
                        </div>
                      `}
                </div>
                <div class="title">
                  ${!this.value?.media_content_id
                    ? this.hass.localize(
                        "ui.components.selectors.media.pick_media"
                      )
                    : this.value.metadata?.title || this.value.media_content_id}
                </div>
              </div>
            </ha-card>
          `}
    `;
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<typeof MANUAL_SCHEMA>
  ): string =>
    this.hass.localize(`ui.components.selectors.media.${schema.name}`);

  private _entityChanged(ev: CustomEvent) {
    ev.stopPropagation();
    fireEvent(this, "value-changed", {
      value: {
        entity_id: ev.detail.value,
        media_content_id: "",
        media_content_type: "",
      },
    });
  }

  private _pickMedia() {
    showMediaBrowserDialog(this, {
      action: "pick",
      entityId: this.value?.entity_id,
      navigateIds: this.value?.metadata?.navigateIds,
      accept: this.selector.media?.accept,
      mediaPickedCallback: (pickedMedia: MediaPickedEvent) => {
        fireEvent(this, "value-changed", {
          value: {
            ...this.value,
            media_content_id: pickedMedia.item.media_content_id,
            media_content_type: pickedMedia.item.media_content_type,
            metadata: {
              title: pickedMedia.item.title,
              thumbnail: pickedMedia.item.thumbnail,
              media_class: pickedMedia.item.media_class,
              children_media_class: pickedMedia.item.children_media_class,
              navigateIds: pickedMedia.navigateIds?.map((id) => ({
                media_content_type: id.media_content_type,
                media_content_id: id.media_content_id,
              })),
            },
          },
        });
      },
    });
  }

  private _handleKeyDown(ev: KeyboardEvent) {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      this._pickMedia();
    }
  }

  static styles = css`
    ha-entity-picker {
      display: block;
      margin-bottom: 16px;
    }
    mwc-button {
      margin-top: 8px;
    }
    ha-alert {
      display: block;
      margin-bottom: 16px;
    }
    ha-card {
      position: relative;
      width: 100%;
      box-sizing: border-box;
      cursor: pointer;
      transition: all 180ms ease-in-out;
      min-height: 56px;
    }
    ha-card:hover:not(.disabled),
    ha-card:focus:not(.disabled) {
      background-color: var(--state-icon-hover-color, rgba(0, 0, 0, 0.04));
    }
    ha-card:focus {
      outline: none;
    }
    ha-card.disabled {
      pointer-events: none;
      color: var(--disabled-text-color);
    }
    .content-container {
      display: flex;
      align-items: center;
      padding: 8px;
      gap: 12px;
    }
    ha-card .thumbnail {
      width: 40px;
      height: 40px;
      flex-shrink: 0;
      position: relative;
      box-sizing: border-box;
      border-radius: 8px;
      overflow: hidden;
    }
    ha-card .image {
      border-radius: 8px;
    }
    .folder {
      --mdc-icon-size: 24px;
    }
    .title {
      font-size: var(--ha-font-size-m);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      line-height: 1.4;
      flex: 1;
      min-width: 0;
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
      margin: 4px;
      background-size: contain;
    }
    .icon-holder {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
      height: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-media": HaMediaSelector;
  }
}

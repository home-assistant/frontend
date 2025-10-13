import { mdiPlus } from "@mdi/js";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { fireEvent } from "../../common/dom/fire_event";
import { supportsFeature } from "../../common/entity/supports-feature";
import { getSignedPath } from "../../data/auth";
import type { MediaPickedEvent } from "../../data/media-player";
import { MediaPlayerEntityFeature } from "../../data/media-player";
import type { MediaSelector, MediaSelectorValue } from "../../data/selector";
import type { HomeAssistant } from "../../types";
import { brandsUrl, extractDomainFromBrandUrl } from "../../util/brands-url";
import "../ha-alert";
import "../ha-form/ha-form";
import type { SchemaUnion } from "../ha-form/types";
import { showMediaBrowserDialog } from "../media-player/show-media-browser-dialog";
import { ensureArray } from "../../common/array/ensure-array";
import "../ha-picture-upload";
import "../chips/ha-chip-set";
import "../chips/ha-input-chip";

const MANUAL_SCHEMA = [
  { name: "media_content_id", required: false, selector: { text: {} } },
  { name: "media_content_type", required: false, selector: { text: {} } },
] as const;

const INCLUDE_DOMAINS = ["media_player"];

const EMPTY_FORM = {};

@customElement("ha-selector-media")
export class HaMediaSelector extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public selector!: MediaSelector;

  @property({ attribute: false })
  public value?: MediaSelectorValue | MediaSelectorValue[];

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  @property({ type: Boolean, reflect: true }) public required = true;

  @property({ attribute: false }) public context?: {
    filter_entity?: string | string[];
  };

  @state() private _thumbnailUrl?: string | null;

  // For multiple selection mode, cache signed/rewritten URLs per thumbnail string
  @state() private _thumbnailUrlMap: Record<string, string | null> = {};

  private _contextEntities: string[] | undefined;

  private get _hasAccept(): boolean {
    return !!this.selector?.media?.accept?.length;
  }

  willUpdate(changedProps: PropertyValues<this>) {
    if (changedProps.has("selector") && this.value !== undefined) {
      if (this.selector.media?.multiple && !Array.isArray(this.value)) {
        this.value = [this.value];
        fireEvent(this, "value-changed", { value: this.value });
      } else if (!this.selector.media?.multiple && Array.isArray(this.value)) {
        this.value = this.value[0];
        fireEvent(this, "value-changed", { value: this.value });
      }
    }
    if (changedProps.has("context")) {
      if (!this._hasAccept) {
        this._contextEntities = ensureArray(this.context?.filter_entity);
      }
    }

    if (changedProps.has("value")) {
      if (this.selector.media?.multiple) {
        const values = Array.isArray(this.value)
          ? this.value
          : this.value
            ? [this.value]
            : [];
        const seenThumbs = new Set<string>();
        values.forEach((val) => {
          const thumbnail = val.metadata?.thumbnail;
          if (!thumbnail) {
            return;
          }
          seenThumbs.add(thumbnail);
          // Only (re)compute if not cached yet
          if (this._thumbnailUrlMap[thumbnail] !== undefined) {
            return;
          }
          if (thumbnail.startsWith("/")) {
            this._thumbnailUrlMap = {
              ...this._thumbnailUrlMap,
              [thumbnail]: null,
            };
            getSignedPath(this.hass, thumbnail).then((signedPath) => {
              // Avoid losing other keys
              this._thumbnailUrlMap = {
                ...this._thumbnailUrlMap,
                [thumbnail]: signedPath.path,
              };
            });
          } else if (thumbnail.startsWith("https://brands.home-assistant.io")) {
            this._thumbnailUrlMap = {
              ...this._thumbnailUrlMap,
              [thumbnail]: brandsUrl({
                domain: extractDomainFromBrandUrl(thumbnail),
                type: "icon",
                useFallback: true,
                darkOptimized: this.hass.themes?.darkMode,
              }),
            };
          } else {
            this._thumbnailUrlMap = {
              ...this._thumbnailUrlMap,
              [thumbnail]: thumbnail,
            };
          }
        });
        // Clean up thumbnails no longer present
        const newMap: Record<string, string | null> = {};
        Object.keys(this._thumbnailUrlMap).forEach((key) => {
          if (seenThumbs.has(key)) {
            newMap[key] = this._thumbnailUrlMap[key];
          }
        });
        this._thumbnailUrlMap = newMap;
      } else {
        const currVal = Array.isArray(this.value) ? this.value[0] : this.value;
        const prevVal = Array.isArray(changedProps.get("value") as any)
          ? (changedProps.get("value") as MediaSelectorValue[])[0]
          : (changedProps.get("value") as MediaSelectorValue);
        const thumbnail = currVal?.metadata?.thumbnail;
        const oldThumbnail = prevVal?.metadata?.thumbnail;
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
          this._thumbnailUrl = thumbnail ?? undefined;
        }
      }
    }
  }

  protected render() {
    const entityId = this._getActiveEntityId();

    const stateObj = entityId ? this.hass.states[entityId] : undefined;

    const supportsBrowse =
      !entityId ||
      (stateObj &&
        supportsFeature(stateObj, MediaPlayerEntityFeature.BROWSE_MEDIA));

    const isMultiple = this.selector.media?.multiple === true;

    if (
      this.selector.media?.image_upload &&
      (!this.value || (Array.isArray(this.value) && this.value.length === 0))
    ) {
      return html`<ha-picture-upload
        .hass=${this.hass}
        .value=${null}
        .contentIdHelper=${this.selector.media?.content_id_helper}
        select-media
        full-media
        @media-picked=${this._pictureUploadMediaPicked}
      ></ha-picture-upload>`;
    }

    return html`
      ${this._hasAccept ||
      (this._contextEntities && this._contextEntities.length <= 1)
        ? nothing
        : html`
            <ha-entity-picker
              .hass=${this.hass}
              .value=${entityId}
              .label=${this.label ||
              this.hass.localize(
                "ui.components.selectors.media.pick_media_player"
              )}
              .disabled=${this.disabled}
              .helper=${this.helper}
              .required=${this.required}
              .hideClearIcon=${!!this._contextEntities}
              .includeDomains=${INCLUDE_DOMAINS}
              .includeEntities=${this._contextEntities}
              .allowCustomEntity=${!this._contextEntities}
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
              .data=${Array.isArray(this.value)
                ? this.value[0]
                : this.value || EMPTY_FORM}
              .schema=${MANUAL_SCHEMA}
              .computeLabel=${this._computeLabelCallback}
              .computeHelper=${this._computeHelperCallback}
            ></ha-form>
          `
        : html`
            ${isMultiple && Array.isArray(this.value) && this.value.length
              ? html`
                  <ha-chip-set>
                    ${this.value.map(
                      (item, idx) => html`
                        <ha-input-chip
                          selected
                          .idx=${idx}
                          @remove=${this._removeItem}
                          >${item.metadata?.title ||
                          item.media_content_id}</ha-input-chip
                        >
                      `
                    )}
                  </ha-chip-set>
                `
              : nothing}

            <ha-card
              outlined
              tabindex="0"
              role="button"
              aria-label=${(() => {
                const currVal = Array.isArray(this.value)
                  ? this.value[this.value.length - 1]
                  : this.value;
                return !currVal?.media_content_id
                  ? this.hass.localize(
                      "ui.components.selectors.media.pick_media"
                    )
                  : currVal.metadata?.title || currVal.media_content_id;
              })()}
              @click=${this._pickMedia}
              @keydown=${this._handleKeyDown}
              class=${this.disabled || (!entityId && !this._hasAccept)
                ? "disabled"
                : ""}
            >
              <div class="content-container">
                <div class="thumbnail">
                  ${!isMultiple &&
                  (Array.isArray(this.value) ? this.value[0] : this.value)
                    ?.metadata?.thumbnail
                    ? html`
                        <div
                          class="${classMap({
                            "centered-image":
                              !!(
                                Array.isArray(this.value)
                                  ? this.value[0]
                                  : this.value
                              )!.metadata!.media_class &&
                              ["app", "directory"].includes(
                                (Array.isArray(this.value)
                                  ? this.value[0]
                                  : this.value)!.metadata!.media_class!
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
                            .path=${mdiPlus}
                          ></ha-svg-icon>
                        </div>
                      `}
                </div>
                <div class="title">
                  ${(() => {
                    const currVal = Array.isArray(this.value)
                      ? this.value[this.value.length - 1]
                      : this.value;
                    return !currVal?.media_content_id
                      ? this.hass.localize(
                          "ui.components.selectors.media.pick_media"
                        )
                      : currVal.metadata?.title || currVal.media_content_id;
                  })()}
                </div>
              </div>
            </ha-card>
            ${this.selector.media?.clearable &&
            (Array.isArray(this.value) ? this.value.length : this.value)
              ? html`<div>
                  <ha-button
                    appearance="plain"
                    size="small"
                    variant="danger"
                    @click=${this._clearValue}
                  >
                    ${this.hass.localize(
                      "ui.components.picture-upload.clear_picture"
                    )}
                  </ha-button>
                </div>`
              : nothing}
          `}
    `;
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<typeof MANUAL_SCHEMA>
  ): string =>
    this.hass.localize(`ui.components.selectors.media.${schema.name}`);

  private _computeHelperCallback = (
    schema: SchemaUnion<typeof MANUAL_SCHEMA>
  ): string =>
    this.hass.localize(`ui.components.selectors.media.${schema.name}_detail`);

  private _entityChanged(ev: CustomEvent) {
    ev.stopPropagation();
    if (!this._hasAccept && this.context?.filter_entity) {
      fireEvent(this, "value-changed", {
        value: {
          media_content_id: "",
          media_content_type: "",
          metadata: {
            browse_entity_id: ev.detail.value,
          },
        },
      });
    } else {
      fireEvent(this, "value-changed", {
        value: {
          entity_id: ev.detail.value,
          media_content_id: "",
          media_content_type: "",
        },
      });
    }
  }

  private _pickMedia() {
    showMediaBrowserDialog(this, {
      action: "pick",
      entityId: this._getActiveEntityId(),
      navigateIds: (Array.isArray(this.value)
        ? this.value[this.value.length - 1]
        : this.value
      )?.metadata?.navigateIds,
      accept: this.selector.media?.accept,
      defaultId: Array.isArray(this.value)
        ? this.value[this.value.length - 1]?.media_content_id
        : this.value?.media_content_id,
      defaultType: Array.isArray(this.value)
        ? this.value[this.value.length - 1]?.media_content_type
        : this.value?.media_content_type,
      hideContentType: this.selector.media?.hide_content_type,
      contentIdHelper: this.selector.media?.content_id_helper,
      mediaPickedCallback: (pickedMedia: MediaPickedEvent) => {
        const newItem: MediaSelectorValue = {
          ...(Array.isArray(this.value) ? {} : (this.value as any)),
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
            ...(!this._hasAccept && this.context?.filter_entity
              ? { browse_entity_id: this._getActiveEntityId() }
              : {}),
          },
        };
        if (this.selector.media?.multiple) {
          const current = Array.isArray(this.value)
            ? this.value
            : this.value
              ? [this.value]
              : [];
          fireEvent(this, "value-changed", {
            value: [...current, newItem],
          });
          return;
        }
        fireEvent(this, "value-changed", { value: newItem });
      },
    });
  }

  private _getActiveEntityId(): string | undefined {
    const val = Array.isArray(this.value)
      ? this.value[this.value.length - 1]
      : this.value;
    const metaId = val?.metadata?.browse_entity_id;
    return (
      val?.entity_id ||
      (metaId && this._contextEntities?.includes(metaId) && metaId) ||
      this._contextEntities?.[0]
    );
  }

  private _handleKeyDown(ev: KeyboardEvent) {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      this._pickMedia();
    }
  }

  private _pictureUploadMediaPicked(ev) {
    const pickedMedia = ev.detail as MediaPickedEvent;
    const newItem: MediaSelectorValue = {
      ...(Array.isArray(this.value) ? {} : (this.value as any)),
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
    };
    if (this.selector.media?.multiple) {
      const current = Array.isArray(this.value)
        ? this.value
        : this.value
          ? [this.value]
          : [];
      fireEvent(this, "value-changed", { value: [...current, newItem] });
      return;
    }
    fireEvent(this, "value-changed", { value: newItem });
  }

  private _clearValue() {
    fireEvent(this, "value-changed", {
      value: this.selector.media?.multiple ? [] : undefined,
    });
  }

  private _removeItem(ev: CustomEvent) {
    ev.stopPropagation();
    if (!Array.isArray(this.value)) return;
    const idx = (ev.currentTarget as any).idx as number;
    if (idx === undefined) return;
    const newValue = this.value.slice();
    newValue.splice(idx, 1);
    fireEvent(this, "value-changed", { value: newValue });
  }

  static styles = css`
    ha-entity-picker {
      display: block;
      margin-bottom: 16px;
    }
    ha-alert {
      display: block;
      margin-bottom: 16px;
    }
    ha-chip-set {
      padding-bottom: 8px;
    }
    ha-card {
      position: relative;
      width: 100%;
      box-sizing: border-box;
      cursor: pointer;
      transition: background-color 180ms ease-in-out;
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
      gap: var(--ha-space-3);
    }
    ha-card .thumbnail {
      width: 40px;
      height: 40px;
      flex-shrink: 0;
      position: relative;
      box-sizing: border-box;
      border-radius: var(--ha-border-radius-md);
      overflow: hidden;
    }
    ha-card .image {
      border-radius: var(--ha-border-radius-md);
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

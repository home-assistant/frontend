import {
  mdiLoginVariant,
  mdiMusicNote,
  mdiMusicNoteEighth,
  mdiPlayBoxMultiple,
  mdiSpeakerMultiple,
} from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import { keyed } from "lit/directives/keyed";
import memoizeOne from "memoize-one";
import { consume } from "../../../common/decorators/consume";
import { consumeLocalize } from "../../../common/decorators/consume-context-entry";
import type { HASSDomTargetEvent } from "../../../common/dom/fire_event";
import { stateActive } from "../../../common/entity/state_active";
import { supportsFeature } from "../../../common/entity/supports-feature";
import type { LocalizeFunc } from "../../../common/translations/localize";
import { MediaProgressController } from "../../../common/controllers/media-progress-controller";
import "../../../components/ha-button";
import "../../../components/ha-dropdown";
import type { HaDropdownSelectEvent } from "../../../components/ha-dropdown";
import "../../../components/ha-dropdown-item";
import "../../../components/ha-generic-picker";
import type { HaGenericPicker } from "../../../components/ha-generic-picker";
import "../../../components/ha-icon-button";
import "../../../components/ha-marquee-text";
import type { PickerComboBoxItem } from "../../../components/ha-picker-combo-box";
import type { HaSlider } from "../../../components/ha-slider";
import "../../../components/ha-svg-icon";
import "../../../components/ha-tooltip";
import "../../../components/media-player/ha-media-player-volume";
import { showJoinMediaPlayersDialog } from "../../../components/media-player/show-join-media-players-dialog";
import { showMediaBrowserDialog } from "../../../components/media-player/show-media-browser-dialog";
import {
  apiContext,
  connectionContext,
  formattersContext,
} from "../../../data/context";
import { UNAVAILABLE } from "../../../data/entity/entity";
import type {
  MediaPickedEvent,
  MediaPlayerEntity,
} from "../../../data/media-player";
import {
  cleanupMediaTitle,
  computeMediaControls,
  computeMediaDescription,
  formatMediaTime,
  handleMediaControlClick,
  MediaPlayerEntityFeature,
  mediaPlayerPlayMedia,
  removeSecondaryStopControl,
} from "../../../data/media-player";
import type {
  HomeAssistantApi,
  HomeAssistantConnection,
  HomeAssistantFormatters,
  ValueChangedEvent,
} from "../../../types";

const DROPDOWN_MAX_ITEMS = 4;

const computeAttributeItems = (
  stateObj: MediaPlayerEntity,
  attribute: "source" | "sound_mode",
  formatters: HomeAssistantFormatters
): PickerComboBoxItem[] =>
  (stateObj.attributes[`${attribute}_list`] ?? []).map((option) => ({
    id: option,
    primary: formatters.formatEntityAttributeValue(stateObj, attribute, option),
  }));

@customElement("more-info-media_player")
class MoreInfoMediaPlayer extends LitElement {
  @property({ attribute: false }) public stateObj?: MediaPlayerEntity;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @state()
  @consume({ context: formattersContext, subscribe: true })
  private _formatters!: HomeAssistantFormatters;

  @state()
  @consume({ context: apiContext, subscribe: true })
  private _api!: HomeAssistantApi;

  @state()
  @consume({ context: connectionContext, subscribe: true })
  private _connection!: HomeAssistantConnection;

  @query("#position-slider")
  private _positionSlider?: HaSlider;

  @query("#source-picker")
  private _sourcePicker?: HaGenericPicker;

  @query("#sound-mode-picker")
  private _soundModePicker?: HaGenericPicker;

  private _progressController = new MediaProgressController(this, {
    getStateObj: () => this.stateObj,
    getSlider: () => this._positionSlider,
  });

  private _computeSourceItems = memoizeOne(computeAttributeItems);

  private _computeSoundModeItems = memoizeOne(computeAttributeItems);

  protected render() {
    if (!this.stateObj || !this._localize) {
      return nothing;
    }

    if (this.stateObj.state === UNAVAILABLE) {
      return this._renderEmptyCover(
        this._formatters.formatEntityState(this.stateObj)
      );
    }

    const stateObj = this.stateObj;
    const controls = computeMediaControls(stateObj, true);
    const coverUrlRaw =
      stateObj.attributes.entity_picture_local ||
      stateObj.attributes.entity_picture ||
      "";
    const coverUrl = coverUrlRaw ? this._connection.hassUrl(coverUrlRaw) : "";

    const position = Math.max(
      Math.floor(this._progressController.progress ?? 0),
      0
    );
    const duration = Math.max(stateObj.attributes.media_duration || 0, 0);
    const primaryTitle = cleanupMediaTitle(stateObj.attributes.media_title);
    const secondaryTitle = computeMediaDescription(stateObj);
    const turnOn = controls?.find((c) => c.action === "turn_on");
    const turnOff = controls?.find((c) => c.action === "turn_off");
    const mainControls = removeSecondaryStopControl(stateObj, controls);
    const stop = controls?.find((c) => c.action === "media_stop");
    const secondaryStop = stop && !mainControls?.includes(stop);

    return html`
      ${
        coverUrl
          ? html`<div class="cover-container">
              <img
                class=${classMap({
                  "cover-image": true,
                  "cover-image--playing": stateObj.state === "playing",
                })}
                src=${coverUrl}
                alt=${ifDefined(primaryTitle)}
              />
            </div>`
          : this._renderEmptyCover(
              this._formatters.formatEntityState(stateObj),
              mdiMusicNote
            )
      }
      ${
        primaryTitle || secondaryTitle
          ? html`<div class="media-info-row">
              ${
                primaryTitle
                  ? html`<ha-marquee-text
                      class="media-title"
                      speed="30"
                      pause-on-hover
                    >
                      ${primaryTitle}
                    </ha-marquee-text>`
                  : nothing
              }
              ${
                secondaryTitle
                  ? html`<ha-marquee-text
                      class="media-artist"
                      speed="30"
                      pause-on-hover
                    >
                      ${secondaryTitle}
                    </ha-marquee-text>`
                  : nothing
              }
            </div>`
          : nothing
      }
      ${
        duration > 0
          ? html`
              <div class="position-bar">
                <ha-slider
                  id="position-slider"
                  min="0"
                  max=${duration}
                  step="1"
                  .accessibleLabel=${this._localize(
                    "ui.card.media_player.track_position"
                  )}
                  @change=${this._handleMediaSeekChanged}
                  ?disabled=${
                    !stateActive(stateObj) ||
                    !supportsFeature(stateObj, MediaPlayerEntityFeature.SEEK)
                  }
                >
                  <span class="position-time" slot="reference"
                    >${formatMediaTime(position)}</span
                  >
                  <span class="position-time" slot="reference"
                    >${formatMediaTime(duration)}</span
                  >
                </ha-slider>
              </div>
            `
          : nothing
      }
      <div class="bottom-controls">
        ${
          controls && controls.length > 0
            ? html`<div class="main-controls">
                ${["repeat_set", "media_previous_track"].map((action) => {
                  const control = controls.find((c) => c.action === action);
                  return control
                    ? html`<ha-icon-button
                        action=${action}
                        @click=${this._handleClick}
                        .path=${control.icon}
                        .label=${this._localize(
                          `ui.card.media_player.${control.action}`
                        )}
                      >
                      </ha-icon-button>`
                    : html`<span class="spacer"></span>`;
                })}
                ${[
                  "media_play_pause",
                  "media_pause",
                  "media_play",
                  "media_stop",
                ].map((action) => {
                  const control = mainControls?.find(
                    (c) => c.action === action
                  );
                  return control
                    ? html`<ha-button
                        variant="brand"
                        appearance="filled"
                        size="m"
                        action=${action}
                        @click=${this._handleClick}
                        class="center-control"
                      >
                        <ha-svg-icon
                          .path=${control.icon}
                          aria-label=${this._localize(
                            `ui.card.media_player.${control.action}`
                          )}
                        ></ha-svg-icon>
                      </ha-button>`
                    : nothing;
                })}
                ${["media_next_track", "shuffle_set"].map((action) => {
                  const control = controls.find((c) => c.action === action);
                  return control
                    ? html`<ha-icon-button
                        action=${action}
                        @click=${this._handleClick}
                        .path=${control.icon}
                        .label=${this._localize(
                          `ui.card.media_player.${control.action}`
                        )}
                      >
                      </ha-icon-button>`
                    : html`<span class="spacer"></span>`;
                })}
              </div>`
            : nothing
        }
        <ha-media-player-volume .stateObj=${stateObj}></ha-media-player-volume>
        <div class="controls-row">
          ${
            secondaryStop
              ? this._renderControlButton(
                  "media_stop",
                  this._localize("ui.card.media_player.media_stop"),
                  stop.icon,
                  this._handleClick,
                  stop.action
                )
              : nothing
          }
          ${
            supportsFeature(stateObj, MediaPlayerEntityFeature.BROWSE_MEDIA)
              ? this._renderControlButton(
                  "browse_media",
                  this._localize("ui.card.media_player.browse_media"),
                  mdiPlayBoxMultiple,
                  this._showBrowseMedia
                )
              : nothing
          }
          ${this._renderGrouping()} ${this._renderSourceControl()}
          ${this._renderSoundModeControl()}
          ${
            turnOn
              ? this._renderControlButton(
                  "turn_on",
                  this._localize(`ui.card.media_player.${turnOn.action}`),
                  turnOn.icon,
                  this._handleClick,
                  turnOn.action
                )
              : nothing
          }
          ${
            turnOff
              ? this._renderControlButton(
                  "turn_off",
                  this._localize(`ui.card.media_player.${turnOff.action}`),
                  turnOff.icon,
                  this._handleClick,
                  turnOff.action
                )
              : nothing
          }
        </div>
      </div>
    `;
  }

  private _renderEmptyCover(title: string, icon?: string) {
    return html`
      <div class="cover-container">
        <div class="cover-image empty-cover" role="img" aria-label=${title}>
          ${icon ? html`<ha-svg-icon .path=${icon}></ha-svg-icon>` : title}
        </div>
      </div>
    `;
  }

  private _renderGrouping() {
    if (
      !this.stateObj ||
      // Compare against `unavailable` so we allow `unknown`
      this.stateObj.state === UNAVAILABLE ||
      !supportsFeature(this.stateObj, MediaPlayerEntityFeature.GROUPING)
    ) {
      return nothing;
    }

    const groupMembers = this.stateObj.attributes.group_members ?? [];

    return html`<ha-icon-button
        @click=${this._showGroupMediaPlayers}
        .title=${this._localize("ui.card.media_player.join")}
        id="grouping-button"
      >
        <div class="grouping">
          <ha-svg-icon .path=${mdiSpeakerMultiple}></ha-svg-icon>
          ${
            groupMembers.length > 1
              ? html`<span class="badge">${groupMembers.length}</span>`
              : nothing
          }
        </div>
      </ha-icon-button>
      <ha-tooltip for="grouping-button">
        ${this._localize("ui.card.media_player.join")}
      </ha-tooltip>`;
  }

  private _renderSourceControl() {
    if (
      !this.stateObj ||
      !supportsFeature(this.stateObj, MediaPlayerEntityFeature.SELECT_SOURCE)
    ) {
      return nothing;
    }

    const stateObj = this.stateObj;
    const sourceList = stateObj.attributes.source_list ?? [];
    const label = this._localize("ui.card.media_player.source");

    const usePicker = sourceList.length > DROPDOWN_MAX_ITEMS;

    // Keyed so the tooltip reconnects and rebinds to the new button when
    // switching between picker and dropdown
    return keyed(
      usePicker,
      html`<ha-tooltip for="source-button">${label}</ha-tooltip> ${
          usePicker
            ? html`<ha-generic-picker
                id="source-picker"
                .label=${label}
                .value=${stateObj.attributes.source}
                .getItems=${this._getSourceItems}
                no-sort
                @value-changed=${this._handleSourcePicked}
              >
                <ha-icon-button
                  id="source-button"
                  slot="field"
                  .label=${label}
                  .path=${mdiLoginVariant}
                  @click=${this._openSourcePicker}
                ></ha-icon-button>
              </ha-generic-picker>`
            : html`<ha-dropdown @wa-select=${this._handleSourceChange}>
                <ha-icon-button
                  id="source-button"
                  slot="trigger"
                  .label=${label}
                  .path=${mdiLoginVariant}
                ></ha-icon-button>
                ${sourceList.map(
                  (source) =>
                    html`<ha-dropdown-item
                      .value=${source}
                      .selected=${source === stateObj.attributes.source}
                    >
                      ${this._formatters.formatEntityAttributeValue(
                        stateObj,
                        "source",
                        source
                      )}
                    </ha-dropdown-item>`
                )}
              </ha-dropdown>`
        }`
    );
  }

  private _renderSoundModeControl() {
    if (
      !this.stateObj ||
      !supportsFeature(
        this.stateObj,
        MediaPlayerEntityFeature.SELECT_SOUND_MODE
      ) ||
      !this.stateObj.attributes.sound_mode_list?.length
    ) {
      return nothing;
    }

    const stateObj = this.stateObj;
    const soundModeList = this.stateObj.attributes.sound_mode_list;
    const label = this._localize("ui.card.media_player.sound_mode");

    const usePicker = soundModeList.length > DROPDOWN_MAX_ITEMS;

    // Keyed so the tooltip reconnects and rebinds to the new button when
    // switching between picker and dropdown
    return keyed(
      usePicker,
      html`<ha-tooltip for="sound-mode-button">${label}</ha-tooltip> ${
          usePicker
            ? html`<ha-generic-picker
                id="sound-mode-picker"
                .label=${label}
                .value=${stateObj.attributes.sound_mode}
                .getItems=${this._getSoundModeItems}
                no-sort
                @value-changed=${this._handleSoundModePicked}
              >
                <ha-icon-button
                  id="sound-mode-button"
                  slot="field"
                  .label=${label}
                  .path=${mdiMusicNoteEighth}
                  hide-title
                  @click=${this._openSoundModePicker}
                ></ha-icon-button>
              </ha-generic-picker>`
            : html`<ha-dropdown @wa-select=${this._handleSoundModeChange}>
                <ha-icon-button
                  id="sound-mode-button"
                  slot="trigger"
                  .label=${label}
                  .path=${mdiMusicNoteEighth}
                  hide-title
                ></ha-icon-button>
                ${soundModeList.map(
                  (soundMode) =>
                    html`<ha-dropdown-item
                      .value=${soundMode}
                      .selected=${soundMode === stateObj.attributes.sound_mode}
                    >
                      ${this._formatters.formatEntityAttributeValue(
                        stateObj,
                        "sound_mode",
                        soundMode
                      )}
                    </ha-dropdown-item>`
                )}
              </ha-dropdown>`
        }`
    );
  }

  private _renderControlButton(
    idSuffix: string,
    title: string,
    icon: string,
    clickHandler: (e: MouseEvent) => void,
    action?: string
  ) {
    return html`
      <ha-icon-button
        .id=${`media-control-row-button-${idSuffix}`}
        hide-title
        action=${ifDefined(action)}
        @click=${clickHandler}
        .label=${title}
        .path=${icon}
      >
      </ha-icon-button>
      <ha-tooltip for=${`media-control-row-button-${idSuffix}`}>
        ${title}
      </ha-tooltip>
    `;
  }

  private _getSourceItems = (): PickerComboBoxItem[] =>
    this._computeSourceItems(this.stateObj!, "source", this._formatters);

  private _getSoundModeItems = (): PickerComboBoxItem[] =>
    this._computeSoundModeItems(this.stateObj!, "sound_mode", this._formatters);

  private _handleClick(e: MouseEvent): void {
    handleMediaControlClick(
      this._api,
      this.stateObj!,
      (e.currentTarget as HTMLElement).getAttribute("action")!
    );
  }

  private _selectSource(source?: string) {
    if (!source || this.stateObj!.attributes.source === source) {
      return;
    }

    this._api.callService("media_player", "select_source", {
      entity_id: this.stateObj!.entity_id,
      source,
    });
  }

  private _selectSoundMode(soundMode?: string) {
    if (!soundMode || this.stateObj!.attributes.sound_mode === soundMode) {
      return;
    }

    this._api.callService("media_player", "select_sound_mode", {
      entity_id: this.stateObj!.entity_id,
      sound_mode: soundMode,
    });
  }

  private _handleSourceChange(ev: HaDropdownSelectEvent) {
    this._selectSource(ev.detail.item.value);
  }

  private _handleSoundModeChange(ev: HaDropdownSelectEvent) {
    this._selectSoundMode(ev.detail.item.value);
  }

  private _handleSourcePicked(ev: ValueChangedEvent<string | undefined>) {
    ev.stopPropagation();
    this._selectSource(ev.detail.value);
  }

  private _handleSoundModePicked(ev: ValueChangedEvent<string | undefined>) {
    ev.stopPropagation();
    this._selectSoundMode(ev.detail.value);
  }

  private _openSourcePicker(ev: Event) {
    this._sourcePicker?.open(ev);
  }

  private _openSoundModePicker(ev: Event) {
    this._soundModePicker?.open(ev);
  }

  private _showBrowseMedia(): void {
    showMediaBrowserDialog(this, {
      action: "play",
      entityId: this.stateObj!.entity_id,
      mediaPickedCallback: (pickedMedia: MediaPickedEvent) =>
        mediaPlayerPlayMedia(
          this._api,
          this.stateObj!.entity_id,
          pickedMedia.item.media_content_id,
          pickedMedia.item.media_content_type
        ),
    });
  }

  private _showGroupMediaPlayers(): void {
    showJoinMediaPlayersDialog(this, {
      entityId: this.stateObj!.entity_id,
    });
  }

  private _handleMediaSeekChanged(e: HASSDomTargetEvent<HaSlider>): void {
    if (!this.stateObj) {
      return;
    }

    const newValue = e.target.value;
    this._progressController.seek(newValue);
    this._api.callService("media_player", "media_seek", {
      entity_id: this.stateObj.entity_id,
      seek_position: newValue,
    });
  }

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-6);
      margin-top: 0;
    }

    .cover-container {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 320px;
      width: 100%;
    }

    .cover-image {
      width: 240px;
      height: 240px;
      max-width: 100%;
      max-height: 100%;
      object-fit: cover;
      border-radius: var(--ha-border-radius-sm);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      transition:
        width 0.3s,
        height 0.3s;
    }

    .cover-image--playing {
      width: 320px;
      height: 320px;
    }

    @media (max-height: 750px) {
      .cover-container {
        height: 120px;
      }

      .cover-image {
        width: 100px;
        height: 100px;
      }

      .cover-image--playing {
        width: 120px;
        height: 120px;
      }
    }

    .empty-cover {
      background-color: var(--secondary-background-color);
      font-size: 1.5em;
      color: var(--secondary-text-color);
    }

    .main-controls {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .center-control {
      --ha-button-height: 56px;
    }

    .spacer {
      width: 48px;
    }

    .position-bar,
    .main-controls {
      direction: ltr;
    }

    .position-bar ha-slider {
      width: 100%;
    }

    .badge {
      position: absolute;
      top: -10px;
      left: var(--ha-space-4);
      display: flex;
      justify-content: center;
      align-items: center;
      height: 16px;
      min-width: var(--ha-space-2);
      border-radius: var(--ha-border-radius-md);
      font-weight: var(--ha-font-weight-normal);
      font-size: var(--ha-font-size-xs);
      background-color: var(--primary-color);
      padding: 0 var(--ha-space-1);
      color: var(--text-primary-color);
    }

    .position-bar {
      display: flex;
      flex-direction: column;
    }

    .position-bar ha-slider::part(references) {
      color: var(--secondary-text-color);
    }

    .position-time {
      margin-top: var(--ha-space-2);
    }

    .media-info-row {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      margin: var(--ha-space-2) 0 var(--ha-space-2) var(--ha-space-2);
    }

    .media-title {
      font-size: var(--ha-font-size-xl);
      font-weight: var(--ha-font-weight-bold);
      margin-bottom: var(--ha-space-1);
    }

    .media-artist {
      font-size: var(--ha-font-size-l);
      font-weight: var(--ha-font-weight-normal);
      color: var(--secondary-text-color);
    }

    .controls-row {
      display: flex;
      align-items: center;
      justify-content: space-around;
    }

    .controls-row ha-icon-button {
      color: var(--secondary-text-color);
      background: var(--ha-color-fill-neutral-quiet-resting);
      border-radius: var(--ha-border-radius-circle);
    }

    .controls-row ha-svg-icon {
      color: var(--ha-color-on-neutral-quiet);
    }

    .grouping {
      position: relative;
    }

    .bottom-controls {
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-6);
      align-self: center;
      width: 320px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-media_player": MoreInfoMediaPlayer;
  }
}

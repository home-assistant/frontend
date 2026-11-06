import {
  mdiVolumeHigh,
  mdiVolumeMinus,
  mdiVolumeOff,
  mdiVolumePlus,
} from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { consume } from "../../common/decorators/consume";
import { consumeLocalize } from "../../common/decorators/consume-context-entry";
import { fireEvent } from "../../common/dom/fire_event";
import { stateActive } from "../../common/entity/state_active";
import { supportsFeature } from "../../common/entity/supports-feature";
import type { LocalizeFunc } from "../../common/translations/localize";
import { debounce } from "../../common/util/debounce";
import { VolumeSliderController } from "../../common/util/volume-slider";
import { apiContext } from "../../data/context";
import type { MediaPlayerEntity } from "../../data/media-player";
import {
  handleMediaControlClick,
  MediaPlayerEntityFeature,
} from "../../data/media-player";
import type { HomeAssistantApi } from "../../types";
import "../ha-icon-button";
import type { HaSlider } from "../ha-slider";
import "../ha-slider";
import "../ha-svg-icon";

const VOLUME_STEP = 2;

@customElement("ha-media-player-volume")
export class HaMediaPlayerVolume extends LitElement {
  @property({ attribute: false }) public stateObj?: MediaPlayerEntity;

  /** Accessible name for the controls, for when several are shown together. */
  @property({ attribute: false }) public label?: string;

  /** Leave the wheel to a scrollable parent. */
  @property({ type: Boolean, attribute: "no-wheel" }) public noWheel = false;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @consume({ context: apiContext, subscribe: true })
  private _api!: HomeAssistantApi;

  @query(".volume-slider")
  private _volumeSlider?: HaSlider;

  private _debouncedVolumeSet = debounce((value: number) => {
    this._setVolume(value);
  }, 100);

  private _volumeController = new VolumeSliderController({
    getSlider: () => this._volumeSlider,
    step: VOLUME_STEP,
    onSetVolume: (value) => this._setVolume(value),
    onSetVolumeDebounced: (value) => this._debouncedVolumeSet(value),
  });

  protected render() {
    if (!this.stateObj || !this._localize) {
      return nothing;
    }

    const stateObj = this.stateObj;
    const supportsMute = supportsFeature(
      stateObj,
      MediaPlayerEntityFeature.VOLUME_MUTE
    );
    const supportsSliding = supportsFeature(
      stateObj,
      MediaPlayerEntityFeature.VOLUME_SET
    );
    const supportsStep = supportsFeature(
      stateObj,
      MediaPlayerEntityFeature.VOLUME_STEP
    );
    const assumedState = stateObj.attributes.assumed_state === true;
    const volumeLevel = stateObj.attributes.volume_level;
    const showSlider = supportsSliding && volumeLevel != null;

    if (
      !(supportsSliding || supportsStep) ||
      !(showSlider || supportsStep || supportsMute) ||
      !(stateActive(stateObj) || assumedState)
    ) {
      return nothing;
    }

    const isMuted = stateObj.attributes.is_volume_muted;

    return html`
      <div
        class="volume"
        part="volume"
        role="group"
        aria-label=${ifDefined(this.label)}
      >
        ${
          supportsMute
            ? html`
                <ha-icon-button
                  .path=${isMuted ? mdiVolumeOff : mdiVolumeHigh}
                  .label=${this._localize(
                    `ui.card.media_player.${
                      isMuted ? "media_volume_unmute" : "media_volume_mute"
                    }`
                  )}
                  @click=${this._toggleMute}
                ></ha-icon-button>
              `
            : nothing
        }
        ${
          supportsStep && !showSlider
            ? html`
                <ha-icon-button
                  action="volume_down"
                  .path=${mdiVolumeMinus}
                  .label=${this._localize(
                    "ui.card.media_player.media_volume_down"
                  )}
                  @click=${this._handleClick}
                ></ha-icon-button>
                <ha-icon-button
                  action="volume_up"
                  .path=${mdiVolumePlus}
                  .label=${this._localize(
                    "ui.card.media_player.media_volume_up"
                  )}
                  @click=${this._handleClick}
                ></ha-icon-button>
              `
            : nothing
        }
        ${
          showSlider
            ? html`
                ${
                  !supportsMute
                    ? html`<ha-svg-icon .path=${mdiVolumeHigh}></ha-svg-icon>`
                    : nothing
                }
                <div
                  class="volume-slider-container"
                  @touchstart=${this._handlePointerDown}
                  @touchmove=${this._volumeController.handleTouchMove}
                  @touchend=${this._handlePointerUp}
                  @touchcancel=${this._handlePointerUp}
                  @pointerdown=${this._handlePointerDown}
                  @pointerup=${this._handlePointerUp}
                  @wheel=${this._handleWheel}
                >
                  <ha-slider
                    class="volume-slider"
                    labeled
                    id="input"
                    .accessibleLabel=${this.label ?? ""}
                    .value=${volumeLevel * 100}
                    .step=${VOLUME_STEP}
                    @input=${this._volumeController.handleInput}
                    @change=${this._volumeController.handleChange}
                  ></ha-slider>
                </div>
              `
            : nothing
        }
      </div>
    `;
  }

  private _handleClick(e: MouseEvent): void {
    handleMediaControlClick(
      this._api,
      this.stateObj!,
      (e.currentTarget as HTMLElement).getAttribute("action")!
    );
  }

  private _toggleMute() {
    this._api.callService("media_player", "volume_mute", {
      entity_id: this.stateObj!.entity_id,
      is_volume_muted: !this.stateObj!.attributes.is_volume_muted,
    });
  }

  private _setVolume(value: number) {
    this._api.callService("media_player", "volume_set", {
      entity_id: this.stateObj!.entity_id,
      volume_level: value / 100,
    });
  }

  private _handleWheel = (ev: WheelEvent) => {
    if (!this.noWheel) {
      this._volumeController.handleWheel(ev);
    }
  };

  private _handlePointerDown = (ev: TouchEvent | PointerEvent | MouseEvent) => {
    if (ev.type === "touchstart") {
      this._volumeController.handleTouchStart(ev as TouchEvent);
    }
    if (!this._volumeController.isInteracting) {
      fireEvent(this, "slider-interaction-start");
    }
  };

  private _handlePointerUp = (ev: TouchEvent | PointerEvent | MouseEvent) => {
    if (ev.type === "touchend") {
      this._volumeController.handleTouchEnd(ev as TouchEvent);
    } else if (ev.type === "touchcancel") {
      this._volumeController.handleTouchCancel();
    }
    setTimeout(() => {
      fireEvent(this, "slider-interaction-stop");
    }, 100);
  };

  static styles = css`
    :host {
      /* Leave no box behind when there is nothing to control, so parents
         with a gap don't reserve space for it */
      display: contents;
    }

    .volume {
      direction: ltr;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--ha-space-3);
      padding-inline: var(--ha-space-2);
    }

    .volume ha-slider {
      width: 100%;
    }

    .volume-slider-container {
      width: 100%;
    }

    .volume ha-svg-icon {
      padding: var(--ha-space-1);
      height: 16px;
      width: 16px;
    }

    .volume ha-icon-button {
      --ha-icon-button-size: 32px;
      --mdc-icon-size: 16px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-media-player-volume": HaMediaPlayerVolume;
  }
}

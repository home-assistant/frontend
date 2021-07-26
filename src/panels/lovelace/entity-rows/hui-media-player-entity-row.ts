import { HassEntity } from "home-assistant-js-websocket";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeStateDisplay } from "../../../common/entity/compute_state_display";
import { supportsFeature } from "../../../common/entity/supports-feature";
import { computeRTLDirection } from "../../../common/util/compute_rtl";
import { debounce } from "../../../common/util/debounce";
import "../../../components/ha-icon-button";
import "../../../components/ha-slider";
import { UNAVAILABLE, UNAVAILABLE_STATES, UNKNOWN } from "../../../data/entity";
import {
  computeMediaDescription,
  MediaPlayerEntity,
  SUPPORT_NEXT_TRACK,
  SUPPORT_PAUSE,
  SUPPORT_PLAY,
  SUPPORT_PREVIOUS_TRACK,
  SUPPORT_STOP,
  SUPPORT_TURN_OFF,
  SUPPORT_TURN_ON,
  SUPPORT_VOLUME_BUTTONS,
  SUPPORT_VOLUME_MUTE,
  SUPPORT_VOLUME_SET,
} from "../../../data/media-player";
import type { HomeAssistant } from "../../../types";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import { installResizeObserver } from "../common/install-resize-observer";
import "../components/hui-generic-entity-row";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import type { EntityConfig, LovelaceRow } from "./types";

@customElement("hui-media-player-entity-row")
class HuiMediaPlayerEntityRow extends LitElement implements LovelaceRow {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: EntityConfig;

  @state() private _narrow?: boolean = false;

  @state() private _veryNarrow?: boolean = false;

  private _resizeObserver?: ResizeObserver;

  public setConfig(config: EntityConfig): void {
    if (!config || !config.entity) {
      throw new Error("Entity must be specified");
    }

    this._config = config;
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._attachObserver();
  }

  public disconnectedCallback(): void {
    this._resizeObserver?.unobserve(this);
  }

  public willUpdate(): void {
    if (!this.hasUpdated) {
      this._measureCard();
    }
  }

  protected firstUpdated(): void {
    this._attachObserver();
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return hasConfigOrEntityChanged(this, changedProps);
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    const stateObj = this.hass.states[this._config.entity] as MediaPlayerEntity;

    if (!stateObj) {
      return html`
        <hui-warning>
          ${createEntityNotFoundWarning(this.hass, this._config.entity)}
        </hui-warning>
      `;
    }

    const entityState = stateObj.state;

    const buttons = html`
      ${!this._narrow &&
      entityState === "playing" &&
      supportsFeature(stateObj, SUPPORT_PREVIOUS_TRACK)
        ? html`
            <ha-icon-button
              icon="hass:skip-previous"
              @click=${this._previousTrack}
            ></ha-icon-button>
          `
        : ""}
      ${(entityState === "playing" &&
        (supportsFeature(stateObj, SUPPORT_PAUSE) ||
          supportsFeature(stateObj, SUPPORT_STOP))) ||
      ((entityState === "paused" || entityState === "idle") &&
        supportsFeature(stateObj, SUPPORT_PLAY)) ||
      (entityState === "on" &&
        (supportsFeature(stateObj, SUPPORT_PLAY) ||
          supportsFeature(stateObj, SUPPORT_PAUSE)))
        ? html`
            <ha-icon-button
              icon=${this._computeControlIcon(stateObj)}
              @click=${this._playPauseStop}
            ></ha-icon-button>
          `
        : ""}
      ${entityState === "playing" &&
      supportsFeature(stateObj, SUPPORT_NEXT_TRACK)
        ? html`
            <ha-icon-button
              icon="hass:skip-next"
              @click=${this._nextTrack}
            ></ha-icon-button>
          `
        : ""}
    `;

    const mediaDescription = computeMediaDescription(stateObj);

    return html`
      <hui-generic-entity-row
        .hass=${this.hass}
        .config=${this._config}
        .secondaryText=${mediaDescription ||
        computeStateDisplay(this.hass.localize, stateObj, this.hass.locale)}
      >
        <div class="controls">
          ${supportsFeature(stateObj, SUPPORT_TURN_ON) &&
          entityState === "off" &&
          !UNAVAILABLE_STATES.includes(entityState)
            ? html`
                <ha-icon-button
                  icon="hass:power"
                  @click=${this._togglePower}
                ></ha-icon-button>
              `
            : !supportsFeature(stateObj, SUPPORT_VOLUME_SET) &&
              !supportsFeature(stateObj, SUPPORT_VOLUME_BUTTONS)
            ? buttons
            : ""}
          ${supportsFeature(stateObj, SUPPORT_TURN_OFF) &&
          entityState !== "off" &&
          !UNAVAILABLE_STATES.includes(entityState)
            ? html`
                <ha-icon-button
                  icon="hass:power"
                  @click=${this._togglePower}
                ></ha-icon-button>
              `
            : ""}
        </div>
      </hui-generic-entity-row>
      ${(supportsFeature(stateObj, SUPPORT_VOLUME_SET) ||
        supportsFeature(stateObj, SUPPORT_VOLUME_BUTTONS)) &&
      ![UNAVAILABLE, UNKNOWN, "off"].includes(entityState)
        ? html`
            <div class="flex">
              <div class="volume">
                ${supportsFeature(stateObj, SUPPORT_VOLUME_MUTE)
                  ? html`
                      <ha-icon-button
                        .icon=${stateObj.attributes.is_volume_muted
                          ? "hass:volume-off"
                          : "hass:volume-high"}
                        @click=${this._toggleMute}
                      ></ha-icon-button>
                    `
                  : ""}
                ${!this._veryNarrow &&
                supportsFeature(stateObj, SUPPORT_VOLUME_SET)
                  ? html`
                      <ha-slider
                        .dir=${computeRTLDirection(this.hass!)}
                        .value=${Number(stateObj.attributes.volume_level) * 100}
                        pin
                        @change=${this._selectedValueChanged}
                        ignore-bar-touch
                        id="input"
                      ></ha-slider>
                    `
                  : !this._veryNarrow &&
                    supportsFeature(stateObj, SUPPORT_VOLUME_BUTTONS)
                  ? html`
                      <ha-icon-button
                        icon="hass:volume-minus"
                        @click=${this._volumeDown}
                      ></ha-icon-button>
                      <ha-icon-button
                        icon="hass:volume-plus"
                        @click=${this._volumeUp}
                      ></ha-icon-button>
                    `
                  : ""}
              </div>

              <div class="controls">${buttons}</div>
            </div>
          `
        : ""}
    `;
  }

  private async _attachObserver(): Promise<void> {
    if (!this._resizeObserver) {
      await installResizeObserver();
      this._resizeObserver = new ResizeObserver(
        debounce(() => this._measureCard(), 250, false)
      );
    }
    this._resizeObserver.observe(this);
  }

  private _measureCard() {
    if (!this.isConnected) {
      return;
    }
    this._narrow = (this.clientWidth || 0) < 300;
    this._veryNarrow = (this.clientWidth || 0) < 225;
  }

  private _computeControlIcon(stateObj: HassEntity): string {
    return stateObj.state === "on"
      ? "hass:play-pause"
      : stateObj.state !== "playing"
      ? "hass:play"
      : supportsFeature(stateObj, SUPPORT_PAUSE)
      ? "hass:pause"
      : "hass:stop";
  }

  private _togglePower(): void {
    const stateObj = this.hass!.states[this._config!.entity];

    this.hass!.callService(
      "media_player",
      stateObj.state === "off" ? "turn_on" : "turn_off",
      {
        entity_id: this._config!.entity,
      }
    );
  }

  private _playPauseStop(): void {
    const stateObj = this.hass!.states[this._config!.entity];

    const service =
      stateObj.state !== "playing"
        ? "media_play"
        : supportsFeature(stateObj, SUPPORT_PAUSE)
        ? "media_pause"
        : "media_stop";

    this.hass!.callService("media_player", service, {
      entity_id: this._config!.entity,
    });
  }

  private _previousTrack(): void {
    this.hass!.callService("media_player", "media_previous_track", {
      entity_id: this._config!.entity,
    });
  }

  private _nextTrack(): void {
    this.hass!.callService("media_player", "media_next_track", {
      entity_id: this._config!.entity,
    });
  }

  private _toggleMute() {
    this.hass!.callService("media_player", "volume_mute", {
      entity_id: this._config!.entity,
      is_volume_muted:
        !this.hass!.states[this._config!.entity].attributes.is_volume_muted,
    });
  }

  private _volumeDown() {
    this.hass!.callService("media_player", "volume_down", {
      entity_id: this._config!.entity,
    });
  }

  private _volumeUp() {
    this.hass!.callService("media_player", "volume_up", {
      entity_id: this._config!.entity,
    });
  }

  private _selectedValueChanged(ev): void {
    this.hass!.callService("media_player", "volume_set", {
      entity_id: this._config!.entity,
      volume_level: ev.target.value / 100,
    });
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
      }
      .flex {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .volume {
        display: flex;
        flex-grow: 2;
        flex-shrink: 2;
      }
      .controls {
        white-space: nowrap;
      }
      ha-slider {
        flex-grow: 2;
        flex-shrink: 2;
        width: 100%;
        margin: 0 -8px 0 1px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-media-player-entity-row": HuiMediaPlayerEntityRow;
  }
}

import {
  html,
  LitElement,
  TemplateResult,
  css,
  CSSResult,
  property,
  customElement,
  PropertyValues,
} from "lit-element";
import "@polymer/paper-icon-button/paper-icon-button";

import "../components/hui-generic-entity-row";
import "../components/hui-warning";

import { LovelaceRow, EntityConfig } from "./types";
import { HomeAssistant } from "../../../types";
import { HassEntity } from "home-assistant-js-websocket";
import { supportsFeature } from "../../../common/entity/supports-feature";
import {
  SUPPORTS_PLAY,
  SUPPORT_NEXT_TRACK,
  SUPPORT_PAUSE,
  SUPPORT_TURN_ON,
  SUPPORT_TURN_OFF,
  SUPPORT_PREVIOUS_TRACK,
  SUPPORT_VOLUME_SET,
  SUPPORT_VOLUME_MUTE,
  SUPPORT_VOLUME_BUTTONS,
} from "../../../data/media-player";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import { computeRTLDirection } from "../../../common/util/compute_rtl";
import { debounce } from "../../../common/util/debounce";

@customElement("hui-media-player-entity-row")
class HuiMediaPlayerEntityRow extends LitElement implements LovelaceRow {
  @property() public hass?: HomeAssistant;
  @property() private _config?: EntityConfig;
  @property() private _narrow?: boolean = false;
  @property() private _veryNarrow?: boolean = false;
  private _resizeObserver?: ResizeObserver;
  private _debouncedResizeListener = debounce(
    () => {
      this._narrow = this.parentElement
        ? this.parentElement.clientWidth < 350
        : false;
      this._veryNarrow = this.parentElement
        ? this.parentElement.clientWidth < 300
        : false;
    },
    250,
    false
  );

  public setConfig(config: EntityConfig): void {
    if (!config || !config.entity) {
      throw new Error("Invalid Configuration: 'entity' required");
    }

    this._config = config;
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

    const stateObj = this.hass.states[this._config.entity];

    if (!stateObj) {
      return html`
        <hui-warning
          >${this.hass.localize(
            "ui.panel.lovelace.warning.entity_not_found",
            "entity",
            this._config.entity
          )}</hui-warning
        >
      `;
    }

    return html`
      <hui-generic-entity-row
        .hass=${this.hass}
        .config=${this._config}
        .secondaryText=${this._computeMediaTitle(stateObj)}
      >
        ${Boolean(
          OFF_STATES.includes(stateObj.state)
            ? supportsFeature(stateObj, SUPPORT_TURN_ON)
            : supportsFeature(stateObj, SUPPORT_TURN_OFF)
        )
          ? html`
              <paper-icon-button
                icon="hass:power"
                @click=${this._togglePower}
              ></paper-icon-button>
            `
          : ""}
      </hui-generic-entity-row>
      <div class="flex">
        <div class="volume">
          ${supportsFeature(stateObj, SUPPORT_VOLUME_MUTE)
            ? html`
                <paper-icon-button
                  .icon=${stateObj.attributes.is_volume_muted
                    ? "hass:volume-off"
                    : "hass:volume-high"}
                  @click=${this._toggleMute}
                ></paper-icon-button>
              `
            : ""}
          ${supportsFeature(stateObj, SUPPORT_VOLUME_SET) && !this._narrow
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
            : supportsFeature(stateObj, SUPPORT_VOLUME_BUTTONS) &&
              !this._veryNarrow
            ? html`
                <paper-icon-button
                  icon="hass:volume-minus"
                  @click=${this._volumeDown}
                ></paper-icon-button>
                <paper-icon-button
                  icon="hass:volume-plus"
                  @click=${this._volumeUp}
                ></paper-icon-button>
              `
            : ""}
        </div>
        <div class="controls">
          ${supportsFeature(stateObj, SUPPORT_PREVIOUS_TRACK) &&
          !this._veryNarrow
            ? html`
                <paper-icon-button
                  icon="hass:skip-previous"
                  @click=${this._previousTrack}
                ></paper-icon-button>
              `
            : ""}
          ${stateObj.state !== "playing" &&
          !supportsFeature(stateObj, SUPPORTS_PLAY)
            ? ""
            : html`
                <paper-icon-button
                  icon=${this._computeControlIcon(stateObj)}
                  @click=${this._playPause}
                ></paper-icon-button>
              `}
          ${supportsFeature(stateObj, SUPPORT_NEXT_TRACK)
            ? html`
                <paper-icon-button
                  icon="hass:skip-next"
                  @click=${this._nextTrack}
                ></paper-icon-button>
              `
            : ""}
        </div>
      </div>
    `;
  }

  static get styles(): CSSResult {
    return css`
      .flex {
        display: flex;
        align-items: center;
        padding-left: 48px;
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
      }
    `;
  }

  private _attachObserver(): void {
    if (typeof ResizeObserver !== "function") {
      import("resize-observer").then((modules) => {
        modules.install();
        this._attachObserver();
      });
      return;
    }

    this._resizeObserver = new ResizeObserver(() =>
      this._debouncedResizeListener()
    );

    this._resizeObserver.observe(this);
  }

  private _computeControlIcon(stateObj: HassEntity): string {
    if (stateObj.state !== "playing") {
      return "hass:play";
    }

    // tslint:disable-next-line:no-bitwise
    return supportsFeature(stateObj, SUPPORT_PAUSE)
      ? "hass:pause"
      : "hass:stop";
  }

  private _computeMediaTitle(stateObj: HassEntity): string {
    let prefix;
    let suffix;

    switch (stateObj.attributes.media_content_type) {
      case "music":
        prefix = stateObj.attributes.media_artist;
        suffix = stateObj.attributes.media_title;
        break;
      case "tvshow":
        prefix = stateObj.attributes.media_series_title;
        suffix = stateObj.attributes.media_title;
        break;
      default:
        prefix =
          stateObj.attributes.media_title ||
          stateObj.attributes.app_name ||
          stateObj.state;
        suffix = "";
    }

    return prefix && suffix ? `${prefix}: ${suffix}` : prefix || suffix || "";
  }

  private _togglePower(): void {
    const stateObj = this.hass!.states[this._config!.entity];

    this.hass!.callService(
      "media_player",
      OFF_STATES.includes(stateObj.state) ? "turn_on" : "turn_off",
      {
        entity_id: this._config!.entity,
      }
    );
  }

  private _playPause(): void {
    this.hass!.callService("media_player", "media_play_pause", {
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
      is_volume_muted: !this.hass!.states[this._config!.entity].attributes
        .is_volume_muted,
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

  private get _inputElement(): { value: number } {
    return (this.shadowRoot!.getElementById("input") as unknown) as {
      value: number;
    };
  }

  private _selectedValueChanged(): void {
    const element = this._inputElement;

    this.hass!.callService("media_player", "volume_set", {
      entity_id: this._config!.entity,
      volume_level: element.value / 100,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-media-player-entity-row": HuiMediaPlayerEntityRow;
  }
}

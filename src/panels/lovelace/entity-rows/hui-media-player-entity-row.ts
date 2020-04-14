import "@polymer/paper-icon-button/paper-icon-button";
import { HassEntity } from "home-assistant-js-websocket";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import { supportsFeature } from "../../../common/entity/supports-feature";
import { computeRTLDirection } from "../../../common/util/compute_rtl";
import { debounce } from "../../../common/util/debounce";
import "../../../components/ha-slider";
import { UNAVAILABLE, UNKNOWN } from "../../../data/entity";
import {
  SUPPORTS_PLAY,
  SUPPORT_NEXT_TRACK,
  SUPPORT_PAUSE,
  SUPPORT_PREVIOUS_TRACK,
  SUPPORT_TURN_OFF,
  SUPPORT_TURN_ON,
  SUPPORT_VOLUME_BUTTONS,
  SUPPORT_VOLUME_MUTE,
  SUPPORT_VOLUME_SET,
} from "../../../data/media-player";
import { HomeAssistant } from "../../../types";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import "../components/hui-generic-entity-row";
import "../components/hui-warning";
import { EntityConfig, LovelaceRow } from "./types";

@customElement("hui-media-player-entity-row")
class HuiMediaPlayerEntityRow extends LitElement implements LovelaceRow {
  @property() public hass?: HomeAssistant;

  @property() private _config?: EntityConfig;

  @property() private _narrow?: boolean = false;

  @property() private _veryNarrow?: boolean = false;

  private _resizeObserver?: ResizeObserver;

  private _debouncedResizeListener = debounce(
    () => {
      this._narrow = (this.clientWidth || 0) < 300;
      this._veryNarrow = (this.clientWidth || 0) < 225;
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

  public connectedCallback(): void {
    super.connectedCallback();
    if (!this._resizeObserver) {
      this._attachObserver();
    }
  }

  public disconnectedCallback(): void {
    this._resizeObserver?.unobserve(this);
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

    const buttons = html`
      ${!this._narrow && supportsFeature(stateObj, SUPPORT_PREVIOUS_TRACK)
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
    `;

    return html`
      <hui-generic-entity-row
        .hass=${this.hass}
        .config=${this._config}
        .secondaryText=${this._computeMediaTitle(stateObj)}
      >
        <div class="controls">
          ${supportsFeature(stateObj, SUPPORT_TURN_ON) &&
          stateObj.state === "off"
            ? html`
                <paper-icon-button
                  icon="hass:power"
                  @click=${this._togglePower}
                ></paper-icon-button>
              `
            : !supportsFeature(stateObj, SUPPORT_VOLUME_SET) &&
              !supportsFeature(stateObj, SUPPORT_VOLUME_BUTTONS)
            ? buttons
            : supportsFeature(stateObj, SUPPORT_TURN_OFF) &&
              stateObj.state !== "off"
            ? html`
                <paper-icon-button
                  icon="hass:power"
                  @click=${this._togglePower}
                ></paper-icon-button>
              `
            : ""}
        </div>
      </hui-generic-entity-row>
      ${(supportsFeature(stateObj, SUPPORT_VOLUME_SET) ||
        supportsFeature(stateObj, SUPPORT_VOLUME_BUTTONS)) &&
      ![UNAVAILABLE, UNKNOWN, "off"].includes(stateObj.state)
        ? html`
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
                ${buttons}
              </div>
            </div>
          `
        : ""}
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

    // eslint-disable-next-line:no-bitwise
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
      stateObj.state === "off" || stateObj.state === "idle"
        ? "turn_on"
        : "turn_off",
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

  private _selectedValueChanged(ev): void {
    this.hass!.callService("media_player", "volume_set", {
      entity_id: this._config!.entity,
      volume_level: ev.target.value / 100,
    });
  }

  static get styles(): CSSResult {
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

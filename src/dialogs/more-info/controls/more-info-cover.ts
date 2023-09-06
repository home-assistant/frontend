import { mdiMenu, mdiSwapVertical } from "@mdi/js";
import {
  CSSResultGroup,
  LitElement,
  PropertyValues,
  css,
  html,
  nothing,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-attributes";
import "../../../components/ha-icon-button-group";
import "../../../components/ha-icon-button-toggle";
import {
  CoverEntity,
  CoverEntityFeature,
  computeCoverPositionStateDisplay,
} from "../../../data/cover";
import type { HomeAssistant } from "../../../types";
import "../components/cover/ha-more-info-cover-buttons";
import "../components/cover/ha-more-info-cover-position";
import "../components/cover/ha-more-info-cover-tilt-position";
import "../components/cover/ha-more-info-cover-toggle";
import { moreInfoControlStyle } from "../components/ha-more-info-control-style";
import "../components/ha-more-info-state-header";

type Mode = "position" | "button";

@customElement("more-info-cover")
class MoreInfoCover extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: CoverEntity;

  @state() private _livePosition?: number;

  @state() private _liveTilt?: number;

  @state() private _mode?: Mode;

  private _setMode(ev) {
    this._mode = ev.currentTarget.mode;
  }

  private _positionSliderMoved(ev) {
    const value = (ev.detail as any).value;
    if (isNaN(value)) return;
    this._livePosition = value;
  }

  private _positionValueChanged() {
    this._livePosition = undefined;
  }

  private _tiltSliderMoved(ev) {
    const value = (ev.detail as any).value;
    if (isNaN(value)) return;
    this._liveTilt = value;
  }

  private _tiltValueChanged() {
    this._liveTilt = undefined;
  }

  protected willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);
    if (changedProps.has("stateObj") && this.stateObj) {
      if (!this._mode) {
        this._mode =
          supportsFeature(this.stateObj, CoverEntityFeature.SET_POSITION) ||
          supportsFeature(this.stateObj, CoverEntityFeature.SET_TILT_POSITION)
            ? "position"
            : "button";
      }
    }
  }

  private get _stateOverride() {
    const liveValue = this._livePosition ?? this._liveTilt;

    const forcedState =
      liveValue != null ? (liveValue ? "open" : "closed") : undefined;

    const stateDisplay = this.hass.formatEntityState(
      this.stateObj!,
      forcedState
    );

    const positionStateDisplay = computeCoverPositionStateDisplay(
      this.stateObj!,
      this.hass,
      liveValue
    );

    if (positionStateDisplay) {
      return `${stateDisplay} ⸱ ${positionStateDisplay}`;
    }
    return stateDisplay;
  }

  protected render() {
    if (!this.hass || !this.stateObj) {
      return nothing;
    }

    const supportsPosition = supportsFeature(
      this.stateObj,
      CoverEntityFeature.SET_POSITION
    );

    const supportsTiltPosition = supportsFeature(
      this.stateObj,
      CoverEntityFeature.SET_TILT_POSITION
    );

    const supportsOpenClose =
      supportsFeature(this.stateObj, CoverEntityFeature.OPEN) ||
      supportsFeature(this.stateObj, CoverEntityFeature.CLOSE) ||
      supportsFeature(this.stateObj, CoverEntityFeature.STOP);

    const supportsTilt =
      supportsFeature(this.stateObj, CoverEntityFeature.OPEN_TILT) ||
      supportsFeature(this.stateObj, CoverEntityFeature.CLOSE_TILT) ||
      supportsFeature(this.stateObj, CoverEntityFeature.STOP_TILT);

    const supportsOpenCloseWithoutStop =
      supportsFeature(this.stateObj, CoverEntityFeature.OPEN) &&
      supportsFeature(this.stateObj, CoverEntityFeature.CLOSE) &&
      !supportsFeature(this.stateObj, CoverEntityFeature.STOP) &&
      !supportsFeature(this.stateObj, CoverEntityFeature.OPEN_TILT) &&
      !supportsFeature(this.stateObj, CoverEntityFeature.CLOSE_TILT);

    return html`
      <ha-more-info-state-header
        .hass=${this.hass}
        .stateObj=${this.stateObj}
        .stateOverride=${this._stateOverride}
      ></ha-more-info-state-header>
      <div class="controls">
        <div class="main-control">
          ${
            this._mode === "position"
              ? html`
                  ${supportsPosition
                    ? html`
                        <ha-more-info-cover-position
                          .stateObj=${this.stateObj}
                          .hass=${this.hass}
                          @slider-moved=${this._positionSliderMoved}
                          @value-changed=${this._positionValueChanged}
                        ></ha-more-info-cover-position>
                      `
                    : nothing}
                  ${supportsTiltPosition
                    ? html`
                        <ha-more-info-cover-tilt-position
                          .stateObj=${this.stateObj}
                          .hass=${this.hass}
                          @slider-moved=${this._tiltSliderMoved}
                          @value-changed=${this._tiltValueChanged}
                        ></ha-more-info-cover-tilt-position>
                      `
                    : nothing}
                `
              : nothing
          }
          ${
            this._mode === "button"
              ? html`
                  ${supportsOpenCloseWithoutStop
                    ? html`
                        <ha-more-info-cover-toggle
                          .stateObj=${this.stateObj}
                          .hass=${this.hass}
                        ></ha-more-info-cover-toggle>
                      `
                    : supportsOpenClose || supportsTilt
                    ? html`
                        <ha-more-info-cover-buttons
                          .stateObj=${this.stateObj}
                          .hass=${this.hass}
                        ></ha-more-info-cover-buttons>
                      `
                    : nothing}
                `
              : nothing
          }
            </div>
          ${
            (supportsPosition || supportsTiltPosition) &&
            (supportsOpenClose || supportsTilt)
              ? html`
                  <ha-icon-button-group>
                    <ha-icon-button-toggle
                      .label=${this.hass.localize(
                        `ui.dialogs.more_info_control.cover.switch_mode.position`
                      )}
                      .selected=${this._mode === "position"}
                      .path=${mdiMenu}
                      .mode=${"position"}
                      @click=${this._setMode}
                    ></ha-icon-button-toggle>
                    <ha-icon-button-toggle
                      .label=${this.hass.localize(
                        `ui.dialogs.more_info_control.cover.switch_mode.button`
                      )}
                      .selected=${this._mode === "button"}
                      .path=${mdiSwapVertical}
                      .mode=${"button"}
                      @click=${this._setMode}
                    ></ha-icon-button-toggle>
                  </ha-icon-button-group>
                `
              : nothing
          }
        </div>
      </div>
      <ha-attributes
        .hass=${this.hass}
        .stateObj=${this.stateObj}
        extra-filters="current_position,current_tilt_position"
      ></ha-attributes>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      moreInfoControlStyle,
      css`
        .main-control {
          display: flex;
          flex-direction: row;
          align-items: center;
        }
        .main-control > * {
          margin: 0 8px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-cover": MoreInfoCover;
  }
}

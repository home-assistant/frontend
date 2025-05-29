import { mdiMenu, mdiSwapVertical } from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-attributes";
import "../../../components/ha-icon-button-group";
import "../../../components/ha-icon-button-toggle";
import type { CoverEntity } from "../../../data/cover";
import {
  CoverEntityFeature,
  computeCoverPositionStateDisplay,
} from "../../../data/cover";
import "../../../state-control/cover/ha-state-control-cover-buttons";
import "../../../state-control/cover/ha-state-control-cover-position";
import "../../../state-control/cover/ha-state-control-cover-tilt-position";
import "../../../state-control/cover/ha-state-control-cover-toggle";
import type { HomeAssistant } from "../../../types";
import "../components/ha-more-info-state-header";
import { moreInfoControlStyle } from "../components/more-info-control-style";

type Mode = "position" | "button";

@customElement("more-info-cover")
class MoreInfoCover extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: CoverEntity;

  @state() private _mode?: Mode;

  private _setMode(ev) {
    this._mode = ev.currentTarget.mode;
  }

  protected willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);
    if (changedProps.has("stateObj") && this.stateObj) {
      const entityId = this.stateObj.entity_id;
      const oldEntityId = changedProps.get("stateObj")?.entity_id;
      if (!this._mode || entityId !== oldEntityId) {
        this._mode =
          supportsFeature(this.stateObj, CoverEntityFeature.SET_POSITION) ||
          supportsFeature(this.stateObj, CoverEntityFeature.SET_TILT_POSITION)
            ? "position"
            : "button";
      }
    }
  }

  private get _stateOverride() {
    const stateDisplay = this.hass.formatEntityState(this.stateObj!);

    const positionStateDisplay = computeCoverPositionStateDisplay(
      this.stateObj!,
      this.hass
    );

    if (positionStateDisplay) {
      return `${stateDisplay} · ${positionStateDisplay}`;
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

    const supportsOpenCloseOnly =
      supportsFeature(this.stateObj, CoverEntityFeature.OPEN) &&
      supportsFeature(this.stateObj, CoverEntityFeature.CLOSE) &&
      !supportsFeature(this.stateObj, CoverEntityFeature.STOP) &&
      !supportsTilt &&
      !supportsPosition &&
      !supportsTiltPosition;

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
                        <ha-state-control-cover-position
                          .stateObj=${this.stateObj}
                          .hass=${this.hass}
                        ></ha-state-control-cover-position>
                      `
                    : nothing}
                  ${supportsTiltPosition
                    ? html`
                        <ha-state-control-cover-tilt-position
                          .stateObj=${this.stateObj}
                          .hass=${this.hass}
                        ></ha-state-control-cover-tilt-position>
                      `
                    : nothing}
                `
              : nothing
          }
          ${
            this._mode === "button"
              ? html`
                  ${supportsOpenCloseOnly
                    ? html`
                        <ha-state-control-cover-toggle
                          .stateObj=${this.stateObj}
                          .hass=${this.hass}
                        ></ha-state-control-cover-toggle>
                      `
                    : supportsOpenClose || supportsTilt
                      ? html`
                          <ha-state-control-cover-buttons
                            .stateObj=${this.stateObj}
                            .hass=${this.hass}
                          ></ha-state-control-cover-buttons>
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

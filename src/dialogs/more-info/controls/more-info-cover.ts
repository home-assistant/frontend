import { mdiMenu, mdiSwapVertical } from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-icon-button-group";
import "../../../components/ha-icon-button-toggle";
import type { ExtEntityRegistryEntry } from "../../../data/entity/entity_registry";
import type { CoverEntity } from "../../../data/cover";
import {
  CoverEntityFeature,
  coverSupportsFavoritePosition,
  coverSupportsFavoritePositions,
  coverSupportsFavoriteTiltPosition,
  computeCoverPositionStateDisplay,
} from "../../../data/cover";
import "../../../state-control/cover/ha-state-control-cover-buttons";
import "../../../state-control/cover/ha-state-control-cover-position";
import "../../../state-control/cover/ha-state-control-cover-tilt-position";
import "../../../state-control/cover/ha-state-control-cover-toggle";
import type { HomeAssistant } from "../../../types";
import "../components/covers/ha-more-info-cover-favorite-positions";
import "../components/ha-more-info-state-header";
import { moreInfoControlStyle } from "../components/more-info-control-style";

type Mode = "position" | "button";

@customElement("more-info-cover")
class MoreInfoCover extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: CoverEntity;

  @property({ attribute: false }) public entry?: ExtEntityRegistryEntry | null;

  @property({ attribute: false }) public editMode?: boolean;

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

    const supportsPosition = coverSupportsFavoritePosition(this.stateObj);

    const supportsTiltPosition = coverSupportsFavoriteTiltPosition(
      this.stateObj
    );

    const hasFavoritePositions =
      this.entry &&
      (this.entry.options?.cover?.favorite_positions == null ||
        this.entry.options.cover.favorite_positions.length > 0);

    const hasFavoriteTiltPositions =
      this.entry &&
      (this.entry.options?.cover?.favorite_tilt_positions == null ||
        this.entry.options.cover.favorite_tilt_positions.length > 0);

    const hasFavorites =
      (supportsPosition && hasFavoritePositions) ||
      (supportsTiltPosition && hasFavoriteTiltPositions);

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
        ${
          this.entry &&
          coverSupportsFavoritePositions(this.stateObj) &&
          (this.editMode || hasFavorites)
            ? html`
                <ha-more-info-cover-favorite-positions
                  .hass=${this.hass}
                  .stateObj=${this.stateObj}
                  .entry=${this.entry}
                  .editMode=${this.editMode}
                ></ha-more-info-cover-favorite-positions>
              `
            : nothing
        }
      </div>
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
          margin: 0 var(--ha-space-2);
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

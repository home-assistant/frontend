import { mdiMenu, mdiSpeedometer, mdiSwapVertical } from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consume } from "../../../common/decorators/consume";
import { consumeLocalize } from "../../../common/decorators/consume-context-entry";
import { supportsFeature } from "../../../common/entity/supports-feature";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/ha-control-select-menu";
import type { HaDropdownSelectEvent } from "../../../components/ha-dropdown";
import "../../../components/ha-icon-button-group";
import "../../../components/ha-icon-button-toggle";
import "../../../components/ha-svg-icon";
import { formattersContext } from "../../../data/context";
import { UNAVAILABLE } from "../../../data/entity/entity";
import {
  shouldShowFavoriteOptions,
  type ExtEntityRegistryEntry,
} from "../../../data/entity/entity_registry";
import type { CoverEntity } from "../../../data/cover";
import {
  CoverEntityFeature,
  coverSupportsAnyPosition,
  coverSupportsPosition,
  coverSupportsTiltPosition,
  computeCoverPositionStateDisplay,
} from "../../../data/cover";
import "../../../state-control/cover/ha-state-control-cover-buttons";
import "../../../state-control/cover/ha-state-control-cover-position";
import "../../../state-control/cover/ha-state-control-cover-tilt-position";
import "../../../state-control/cover/ha-state-control-cover-toggle";
import type { HomeAssistantFormatters } from "../../../types";
import "../components/covers/ha-more-info-cover-favorite-positions";
import "../components/ha-more-info-control-select-container";
import "../components/ha-more-info-state-header";
import { moreInfoControlStyle } from "../components/more-info-control-style";

type Mode = "position" | "button";

@customElement("more-info-cover")
class MoreInfoCover extends LitElement {
  @state()
  @consume({ context: formattersContext, subscribe: true })
  private _formatters!: HomeAssistantFormatters;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @property({ attribute: false }) public stateObj?: CoverEntity;

  @property({ attribute: false }) public entry?: ExtEntityRegistryEntry | null;

  @property({ attribute: false }) public editMode?: boolean;

  @state() private _mode?: Mode;

  @state() private _speed?: string;

  private _setMode(ev) {
    this._mode = ev.currentTarget.mode;
  }

  protected willUpdate(changedProps: PropertyValues<this>): void {
    super.willUpdate(changedProps);
    if (changedProps.has("stateObj") && this.stateObj) {
      const entityId = this.stateObj.entity_id;
      const oldEntityId = changedProps.get("stateObj")?.entity_id;
      if (!this._mode || entityId !== oldEntityId) {
        this._mode = coverSupportsAnyPosition(this.stateObj)
          ? "position"
          : "button";
      }
      if (entityId !== oldEntityId) {
        this._speed = undefined;
      }
    }
  }

  private get _stateOverride() {
    const stateDisplay = this._formatters.formatEntityState(this.stateObj!);

    const positionStateDisplay = computeCoverPositionStateDisplay(
      this.stateObj!,
      this._formatters.formatEntityAttributeValue
    );

    if (positionStateDisplay) {
      return `${stateDisplay} · ${positionStateDisplay}`;
    }
    return stateDisplay;
  }

  protected render() {
    if (!this.stateObj) {
      return nothing;
    }

    const supportsPosition = coverSupportsPosition(this.stateObj);

    const supportsTiltPosition = coverSupportsTiltPosition(this.stateObj);

    const showFavoriteControls = Boolean(
      this.entry &&
      (this.editMode ||
        (coverSupportsPosition(this.stateObj) &&
          shouldShowFavoriteOptions(
            this.entry.options?.cover?.favorite_positions
          )) ||
        (coverSupportsTiltPosition(this.stateObj) &&
          shouldShowFavoriteOptions(
            this.entry.options?.cover?.favorite_tilt_positions
          )))
    );

    const supportsOpenClose =
      supportsFeature(this.stateObj, CoverEntityFeature.OPEN) ||
      supportsFeature(this.stateObj, CoverEntityFeature.CLOSE) ||
      supportsFeature(this.stateObj, CoverEntityFeature.STOP);

    const supportsTilt =
      supportsFeature(this.stateObj, CoverEntityFeature.OPEN_TILT) ||
      supportsFeature(this.stateObj, CoverEntityFeature.CLOSE_TILT) ||
      supportsFeature(this.stateObj, CoverEntityFeature.STOP_TILT);

    const supportedSpeeds = supportsFeature(
      this.stateObj,
      CoverEntityFeature.SPEED
    )
      ? this.stateObj.attributes.supported_speeds
      : undefined;

    const supportsOpenCloseOnly =
      supportsFeature(this.stateObj, CoverEntityFeature.OPEN) &&
      supportsFeature(this.stateObj, CoverEntityFeature.CLOSE) &&
      !supportsFeature(this.stateObj, CoverEntityFeature.STOP) &&
      !supportsTilt &&
      !supportsPosition &&
      !supportsTiltPosition;

    return html`
      <ha-more-info-state-header
        .stateObj=${this.stateObj}
        .stateOverride=${this._stateOverride}
      ></ha-more-info-state-header>
      <div class="controls">
        <div class="main-control">
          ${
            this._mode === "position"
              ? html`
                  ${
                    supportsPosition
                      ? html`
                          <ha-state-control-cover-position
                            .stateObj=${this.stateObj}
                            .speed=${this._speed}
                          ></ha-state-control-cover-position>
                        `
                      : nothing
                  }
                  ${
                    supportsTiltPosition
                      ? html`
                          <ha-state-control-cover-tilt-position
                            .stateObj=${this.stateObj}
                          ></ha-state-control-cover-tilt-position>
                        `
                      : nothing
                  }
                `
              : nothing
          }
          ${
            this._mode === "button"
              ? html`
                  ${
                    supportsOpenCloseOnly
                      ? html`
                          <ha-state-control-cover-toggle
                            .stateObj=${this.stateObj}
                            .speed=${this._speed}
                          ></ha-state-control-cover-toggle>
                        `
                      : supportsOpenClose || supportsTilt
                        ? html`
                            <ha-state-control-cover-buttons
                              .stateObj=${this.stateObj}
                              .speed=${this._speed}
                            ></ha-state-control-cover-buttons>
                          `
                        : nothing
                  }
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
                    .label=${this._localize(
                      `ui.dialogs.more_info_control.cover.switch_mode.position`
                    )}
                    .selected=${this._mode === "position"}
                    .path=${mdiMenu}
                    .mode=${"position"}
                    @click=${this._setMode}
                  ></ha-icon-button-toggle>
                  <ha-icon-button-toggle
                    .label=${this._localize(
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
        ${
          showFavoriteControls
            ? html`
                <ha-more-info-cover-favorite-positions
                  .stateObj=${this.stateObj}
                  .entry=${this.entry}
                  .editMode=${this.editMode}
                  .speed=${this._speed}
                ></ha-more-info-cover-favorite-positions>
              `
            : nothing
        }
      </div>
      ${
        supportedSpeeds?.length
          ? html`
              <div>
                <ha-more-info-control-select-container>
                  <ha-control-select-menu
                    .label=${this._formatters.formatEntityAttributeName(
                      this.stateObj,
                      "speed"
                    )}
                    .value=${this._speed}
                    .disabled=${this.stateObj.state === UNAVAILABLE}
                    @wa-select=${this._handleSpeed}
                    .options=${supportedSpeeds.map((speed) => ({
                      value: speed,
                      label: this._formatters.formatEntityAttributeValue(
                        this.stateObj!,
                        "speed",
                        speed
                      ),
                    }))}
                  >
                    <ha-svg-icon
                      slot="icon"
                      .path=${mdiSpeedometer}
                    ></ha-svg-icon>
                  </ha-control-select-menu>
                </ha-more-info-control-select-container>
              </div>
            `
          : nothing
      }
    `;
  }

  private _handleSpeed(ev: HaDropdownSelectEvent) {
    this._speed = ev.detail.item.value;
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

import type { ContextType } from "@lit/context";
import {
  mdiArrowOscillating,
  mdiArrowOscillatingOff,
  mdiFan,
  mdiFanOff,
  mdiPower,
  mdiTuneVariant,
} from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consume } from "../../../common/decorators/consume";
import { consumeLocalize } from "../../../common/decorators/consume-context-entry";
import { transform } from "../../../common/decorators/transform";
import { stateActive } from "../../../common/entity/state_active";
import { supportsFeature } from "../../../common/entity/supports-feature";
import type { HASSDomEvent } from "../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/ha-alert";
import "../../../components/ha-attribute-icon";
import "../../../components/ha-control-select-menu";
import "../../../components/ha-outlined-icon-button";
import { UNAVAILABLE } from "../../../data/entity/entity";
import type { ExtEntityRegistryEntry } from "../../../data/entity/entity_registry";
import type { FanEntity, FanFavoriteSaveBlocker } from "../../../data/fan";
import {
  FAN_SPEED_COUNT_MAX_FOR_BUTTONS,
  FanEntityFeature,
  computeFanSpeedCount,
  computeFanSpeedStateDisplay,
  fanSupportsFavorites,
  normalizeFanFavorites,
} from "../../../data/fan";
import { forwardHaptic } from "../../../data/haptics";
import "../../../state-control/fan/ha-state-control-fan-speed";
import "../../../state-control/ha-state-control-toggle";
import {
  apiContext,
  configContext,
  formattersContext,
} from "../../../data/context";
import type { HomeAssistantConfig } from "../../../types";
import "../components/fans/ha-more-info-fan-favorites";
import "../components/ha-more-info-control-select-container";
import "../components/ha-more-info-state-header";
import { moreInfoControlStyle } from "../components/more-info-control-style";
import type { HaDropdownSelectEvent } from "../../../components/ha-dropdown";

@customElement("more-info-fan")
class MoreInfoFan extends LitElement {
  @state()
  @consume({ context: formattersContext, subscribe: true })
  private _formatters!: ContextType<typeof formattersContext>;

  @state()
  @consume({ context: apiContext, subscribe: true })
  private _api!: ContextType<typeof apiContext>;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @state()
  @consume({ context: configContext, subscribe: true })
  @transform<HomeAssistantConfig, boolean>({
    transformer: ({ user }) => Boolean(user?.is_admin),
  })
  private _isAdmin!: boolean;

  @property({ attribute: false }) public stateObj?: FanEntity;

  @property({ attribute: false }) public entry?: ExtEntityRegistryEntry | null;

  @property({ attribute: false }) public editMode?: boolean;

  @state() public _presetMode?: string;

  // Favorite being updated in edit mode.
  @state() private _selectedFavoriteIndex?: number;

  // Why the current state cannot be saved, reported by the favorites.
  @state() private _favoriteSaveBlocker?: FanFavoriteSaveBlocker;

  private _renderPresetModeIcon = (value: string) =>
    html`<ha-attribute-icon
      .stateObj=${this.stateObj}
      attribute="preset_mode"
      .attributeValue=${value}
    ></ha-attribute-icon>`;

  private _renderDirectionIcon = (value: string) =>
    html`<ha-attribute-icon
      .stateObj=${this.stateObj}
      attribute="direction"
      .attributeValue=${value}
    ></ha-attribute-icon>`;

  private _toggle = () => {
    const service = this.stateObj?.state === "on" ? "turn_off" : "turn_on";
    forwardHaptic(this, "light");
    this._api.callService("fan", service, {
      entity_id: this.stateObj!.entity_id,
    });
  };

  private _handleDirection(ev: HaDropdownSelectEvent) {
    const newVal = ev.detail.item.value;
    const oldVal = this.stateObj?.attributes.direction;

    if (!newVal || oldVal === newVal) return;

    this._api.callService("fan", "set_direction", {
      entity_id: this.stateObj!.entity_id,
      direction: newVal,
    });
  }

  private _handlePresetMode(ev: HaDropdownSelectEvent) {
    const newVal = ev.detail.item.value;
    const oldVal = this._presetMode;

    if (!newVal || oldVal === newVal) return;

    this._presetMode = newVal;
    this._api.callService("fan", "set_preset_mode", {
      entity_id: this.stateObj!.entity_id,
      preset_mode: newVal,
    });
  }

  private _handleOscillating(ev: HaDropdownSelectEvent) {
    const newVal = ev.detail.item.value === "true";
    const oldVal = this.stateObj?.attributes.oscillating;

    if (oldVal === newVal) return;

    this._api.callService("fan", "oscillate", {
      entity_id: this.stateObj!.entity_id,
      oscillating: newVal,
    });
  }

  private _favoriteSelected(
    ev: HASSDomEvent<HASSDomEvents["fan-favorite-selected"]>
  ) {
    ev.stopPropagation();
    this._selectedFavoriteIndex = ev.detail.index;
  }

  private _favoriteSaveBlockerChanged(
    ev: HASSDomEvent<HASSDomEvents["fan-favorite-save-blocker-changed"]>
  ) {
    ev.stopPropagation();
    this._favoriteSaveBlocker = ev.detail.blocker;
  }

  protected willUpdate(changedProps: PropertyValues<this>): void {
    if (
      (changedProps.has("editMode") && !this.editMode) ||
      (changedProps.has("stateObj") &&
        changedProps.get("stateObj")?.entity_id !== this.stateObj?.entity_id)
    ) {
      this._selectedFavoriteIndex = undefined;
    }
  }

  protected updated(changedProps: PropertyValues<this>): void {
    if (changedProps.has("stateObj")) {
      this._presetMode = this.stateObj?.attributes.preset_mode;
    }
  }

  private _renderFavoritesInfo(supportsPresetMode: boolean) {
    const updating = this._selectedFavoriteIndex !== undefined;
    const blocker = this._favoriteSaveBlocker;

    return html`
      <ha-alert alert-type="info" class="favorites-info">
        <p>
          ${this._localize(
            updating
              ? "ui.dialogs.more_info_control.fan.favorites.edit_info_update"
              : "ui.dialogs.more_info_control.fan.favorites.edit_info_create"
          )}
        </p>
        ${
          supportsPresetMode
            ? html`<p>
                ${this._localize(
                  "ui.dialogs.more_info_control.fan.favorites.edit_info_preset"
                )}
              </p>`
            : nothing
        }
        ${
          blocker
            ? html`<p>
                ${this._localize(
                  `ui.dialogs.more_info_control.fan.favorites.save_blocked_${blocker}`
                )}
              </p>`
            : nothing
        }
      </ha-alert>
    `;
  }

  private get _stateOverride() {
    const stateDisplay = this._formatters.formatEntityState(this.stateObj!);

    const positionStateDisplay = computeFanSpeedStateDisplay(
      this.stateObj!,
      this._formatters
    );

    if (positionStateDisplay && stateActive(this.stateObj!)) {
      return positionStateDisplay;
    }
    return stateDisplay;
  }

  protected render() {
    if (!this.stateObj) {
      return nothing;
    }

    const supportsOnOff =
      supportsFeature(this.stateObj, FanEntityFeature.TURN_ON) ||
      supportsFeature(this.stateObj, FanEntityFeature.TURN_OFF);

    const supportsSpeed = supportsFeature(
      this.stateObj,
      FanEntityFeature.SET_SPEED
    );

    const supportsDirection = supportsFeature(
      this.stateObj,
      FanEntityFeature.DIRECTION
    );
    const supportsOscillate = supportsFeature(
      this.stateObj,
      FanEntityFeature.OSCILLATE
    );
    const supportsPresetMode = supportsFeature(
      this.stateObj,
      FanEntityFeature.PRESET_MODE
    );

    const supportSpeedPercentage =
      supportsSpeed &&
      computeFanSpeedCount(this.stateObj) > FAN_SPEED_COUNT_MAX_FOR_BUTTONS;

    const supportsFavorites = Boolean(
      this.entry && fanSupportsFavorites(this.stateObj)
    );
    // Admins get an action to add the first favorite.
    const showFavorites =
      supportsFavorites &&
      (this._isAdmin ||
        normalizeFanFavorites(this.entry?.options?.fan?.favorites).length > 0);

    return html`
      <ha-more-info-state-header
        .stateObj=${this.stateObj}
        .stateOverride=${this._stateOverride}
      ></ha-more-info-state-header>
      ${
        supportsFavorites && this.editMode
          ? this._renderFavoritesInfo(supportsPresetMode)
          : nothing
      }
      <div class="controls">
        ${
          supportsSpeed
            ? html`
                <ha-state-control-fan-speed .stateObj=${this.stateObj}>
                </ha-state-control-fan-speed>
              `
            : html`
                <ha-state-control-toggle
                  .stateObj=${this.stateObj}
                  .iconPathOn=${mdiFan}
                  .iconPathOff=${mdiFanOff}
                ></ha-state-control-toggle>
              `
        }
        ${
          supportSpeedPercentage && supportsOnOff
            ? html`
                <div class="buttons">
                  <ha-outlined-icon-button
                    .disabled=${this.stateObj.state === UNAVAILABLE}
                    @click=${this._toggle}
                  >
                    <ha-svg-icon .path=${mdiPower}></ha-svg-icon>
                  </ha-outlined-icon-button>
                </div>
              `
            : nothing
        }
        ${
          showFavorites
            ? html`
                <ha-more-info-fan-favorites
                  .stateObj=${this.stateObj}
                  .entry=${this.entry}
                  .editMode=${this.editMode}
                  .selectedIndex=${this._selectedFavoriteIndex}
                  @fan-favorite-selected=${this._favoriteSelected}
                  @fan-favorite-save-blocker-changed=${
                    this._favoriteSaveBlockerChanged
                  }
                ></ha-more-info-fan-favorites>
              `
            : nothing
        }
      </div>
      <ha-more-info-control-select-container>
        ${
          supportsPresetMode && this.stateObj.attributes.preset_modes
            ? html`
                <ha-control-select-menu
                  .label=${this._formatters.formatEntityAttributeName(
                    this.stateObj,
                    "preset_mode"
                  )}
                  .value=${this.stateObj.attributes.preset_mode}
                  .disabled=${this.stateObj.state === UNAVAILABLE}
                  @wa-select=${this._handlePresetMode}
                  .options=${this.stateObj.attributes.preset_modes.map(
                    (mode) => ({
                      value: mode,
                      label: this._formatters.formatEntityAttributeValue(
                        this.stateObj!,
                        "preset_mode",
                        mode
                      ),
                    })
                  )}
                  .renderIcon=${this._renderPresetModeIcon}
                >
                  <ha-svg-icon
                    slot="icon"
                    .path=${mdiTuneVariant}
                  ></ha-svg-icon>
                </ha-control-select-menu>
              `
            : nothing
        }
        ${
          supportsDirection
            ? html`
                <ha-control-select-menu
                  .label=${this._formatters.formatEntityAttributeName(
                    this.stateObj,
                    "direction"
                  )}
                  .value=${this.stateObj.attributes.direction}
                  .disabled=${this.stateObj.state === UNAVAILABLE}
                  @wa-select=${this._handleDirection}
                  .options=${["forward", "reverse"].map((direction) => ({
                    value: direction,
                    label: this.stateObj
                      ? this._formatters.formatEntityAttributeValue(
                          this.stateObj,
                          "direction",
                          direction
                        )
                      : direction,
                  }))}
                  .renderIcon=${this._renderDirectionIcon}
                >
                  <ha-attribute-icon
                    slot="icon"
                    .stateObj=${this.stateObj}
                    attribute="direction"
                    .attributeValue=${this.stateObj.attributes.direction}
                  ></ha-attribute-icon>
                </ha-control-select-menu>
              `
            : nothing
        }
        ${
          supportsOscillate
            ? html`
                <ha-control-select-menu
                  .label=${this._formatters.formatEntityAttributeName(
                    this.stateObj,
                    "oscillating"
                  )}
                  .value=${
                    this.stateObj.attributes.oscillating ? "true" : "false"
                  }
                  .disabled=${this.stateObj.state === UNAVAILABLE}
                  @wa-select=${this._handleOscillating}
                  .options=${["true", "false"].map((val) => ({
                    value: val,
                    iconPath:
                      val === "true"
                        ? mdiArrowOscillating
                        : mdiArrowOscillatingOff,
                    label: this.stateObj
                      ? this._formatters.formatEntityAttributeValue(
                          this.stateObj,
                          "oscillating",
                          val === "true"
                        )
                      : val,
                  }))}
                >
                  <ha-svg-icon
                    slot="icon"
                    .path=${mdiArrowOscillatingOff}
                  ></ha-svg-icon>
                </ha-control-select-menu>
              `
            : nothing
        }
      </ha-more-info-control-select-container>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      moreInfoControlStyle,
      css`
        .favorites-info {
          display: block;
          margin-bottom: var(--ha-space-4);
        }
        .favorites-info p {
          margin: 0;
        }
        .favorites-info p + p {
          margin-top: var(--ha-space-2);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-fan": MoreInfoFan;
  }
}

import { mdiAngleAcute, mdiArrowUpDown } from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consume } from "../../../common/decorators/consume";
import { consumeLocalize } from "../../../common/decorators/consume-context-entry";
import type { HASSDomEvent } from "../../../common/dom/fire_event";
import { supportsFeature } from "../../../common/entity/supports-feature";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/ha-control-select";
import type { ControlSelectOption } from "../../../components/ha-control-select";
import "../../../components/ha-icon-button-group";
import "../../../components/ha-icon-button-toggle";
import { apiContext, formattersContext } from "../../../data/context";
import type { CoverControlMode, CoverEntity } from "../../../data/cover";
import {
  CoverEntityFeature,
  coverModeValue,
  coverSupportsPosition,
  coverSupportsTiltPosition,
} from "../../../data/cover";
import {
  shouldShowFavoriteOptions,
  type ExtEntityRegistryEntry,
} from "../../../data/entity/entity_registry";
import "../../../state-control/cover/ha-state-control-cover-drawing";
import type {
  CoverCommand,
  CoverDrag,
} from "../../../state-control/cover/ha-state-control-cover-drawing";
import type { HomeAssistantApi, HomeAssistantFormatters } from "../../../types";
import { CoverRequestController } from "../components/covers/cover-request-controller";
import "../components/covers/ha-more-info-cover-buttons";
import "../components/covers/ha-more-info-cover-favorite-positions";
import "../components/ha-more-info-state-header";
import { moreInfoControlStyle } from "../components/more-info-control-style";

const POSITION_FEATURES = [
  CoverEntityFeature.OPEN,
  CoverEntityFeature.CLOSE,
  CoverEntityFeature.STOP,
  CoverEntityFeature.SET_POSITION,
];

const TILT_FEATURES = [
  CoverEntityFeature.OPEN_TILT,
  CoverEntityFeature.CLOSE_TILT,
  CoverEntityFeature.STOP_TILT,
  CoverEntityFeature.SET_TILT_POSITION,
];

const SPEED_SERVICES = ["open_cover", "close_cover", "set_cover_position"];

const supportsAny = (stateObj: CoverEntity, features: CoverEntityFeature[]) =>
  features.some((feature) => supportsFeature(stateObj, feature));

@customElement("more-info-cover")
class MoreInfoCover extends LitElement {
  @state()
  @consume({ context: formattersContext, subscribe: true })
  private _formatters!: HomeAssistantFormatters;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @consume({ context: apiContext, subscribe: true })
  private _api!: HomeAssistantApi;

  @property({ attribute: false }) public stateObj?: CoverEntity;

  @property({ attribute: false }) public entry?: ExtEntityRegistryEntry | null;

  @property({ attribute: false }) public editMode?: boolean;

  @state() private _mode: CoverControlMode = "position";

  @state() private _drag?: CoverDrag;

  @state() private _speed?: string;

  private _requests = new CoverRequestController(this);

  protected willUpdate(changedProps: PropertyValues<this>): void {
    super.willUpdate(changedProps);
    if (!changedProps.has("stateObj") || !this.stateObj) {
      return;
    }
    const oldStateObj = changedProps.get("stateObj") as CoverEntity | undefined;
    if (!oldStateObj || oldStateObj.entity_id !== this.stateObj.entity_id) {
      this._mode =
        supportsAny(this.stateObj, TILT_FEATURES) &&
        !supportsAny(this.stateObj, POSITION_FEATURES)
          ? "tilt"
          : "position";
      this._requests.clear();
      this._drag = undefined;
      this._speed = undefined;
      return;
    }
    this._requests.stateChanged(this.stateObj);
  }

  private _setMode(ev: Event) {
    this._mode = (ev.currentTarget as HTMLElement).dataset
      .mode as CoverControlMode;
  }

  private _handleCommand(ev: HASSDomEvent<CoverCommand>) {
    ev.stopPropagation();
    const stateObj = this.stateObj!;
    const { service, value } = ev.detail;
    if (value !== undefined && !Number.isFinite(value)) {
      return;
    }
    const data: Record<string, unknown> = { entity_id: stateObj.entity_id };
    if (service === "set_cover_position") {
      data.position = value;
    } else if (service === "set_cover_tilt_position") {
      data.tilt_position = value;
    }
    if (
      this._speed &&
      SPEED_SERVICES.includes(service) &&
      supportsFeature(stateObj, CoverEntityFeature.SPEED)
    ) {
      data.speed = this._speed;
    }
    this._api
      .callService("cover", service, data)
      .catch(() => this._requests.clear());
    this._requests.commandSent(ev.detail, stateObj);
  }

  private _handleDrag(ev: HASSDomEvent<{ drag?: CoverDrag }>) {
    ev.stopPropagation();
    this._drag = ev.detail.drag;
  }

  private _handleSpeed(ev: CustomEvent<{ value: string }>) {
    this._speed = ev.detail.value;
  }

  private _formatValue(mode: CoverControlMode, value: number) {
    return this._formatters.formatEntityAttributeValue(
      this.stateObj!,
      mode === "tilt" ? "current_tilt_position" : "current_position",
      Math.round(value)
    );
  }

  private _stateOverride(): { text: string; accent: boolean } {
    if (this._drag?.swipe?.flipped) {
      return {
        text: this._localize(
          this._drag.swipe.start
            ? "ui.dialogs.more_info_control.cover.closes_on_release"
            : "ui.dialogs.more_info_control.cover.opens_on_release"
        ),
        accent: true,
      };
    }
    if (this._drag && !this._drag.swipe) {
      return {
        text: this._formatValue(this._mode, this._drag.value),
        accent: true,
      };
    }
    return { text: this._stateText(), accent: false };
  }

  private _stateText(): string {
    const stateObj = this.stateObj!;
    const stateDisplay = this._formatters.formatEntityState(stateObj);
    const position = stateObj.attributes.current_position;
    if (!position || Math.round(position) === 0) {
      return stateDisplay;
    }
    return `${stateDisplay} · ${this._formatValue("position", position)}`;
  }

  private _secondaryOverride(): string | undefined {
    const stateObj = this.stateObj!;
    const localize = (
      key:
        | "requested"
        | "requested_open"
        | "requested_closed"
        | "currently"
        | "currently_unknown",
      values?: Record<string, string>
    ) => this._localize(`ui.dialogs.more_info_control.cover.${key}`, values);
    if (this._drag?.swipe) {
      return undefined;
    }
    if (this._drag) {
      const current = coverModeValue(stateObj, this._mode);
      return current === undefined
        ? localize("currently_unknown")
        : localize("currently", {
            value: this._formatValue(this._mode, current),
          });
    }
    const request = this._requests.request;
    if (!request) {
      return undefined;
    }
    if (request.mode === "position" && !coverSupportsPosition(stateObj)) {
      return localize(request.value ? "requested_open" : "requested_closed");
    }
    return localize("requested", {
      value: this._formatValue(request.mode, request.value),
    });
  }

  private _speedOptions(stateObj: CoverEntity): ControlSelectOption[] {
    return (stateObj.attributes.supported_speeds ?? []).map((speed) => ({
      value: speed,
      label: this._formatters.formatEntityAttributeValue(
        stateObj,
        "speed",
        speed
      ),
    }));
  }

  private _showFavorites(stateObj: CoverEntity): boolean {
    if (!this.entry) {
      return false;
    }
    const tilt = this._mode === "tilt";
    const supported = tilt
      ? coverSupportsTiltPosition(stateObj)
      : coverSupportsPosition(stateObj);
    const options = this.entry.options?.cover;
    return (
      supported &&
      (Boolean(this.editMode) ||
        shouldShowFavoriteOptions(
          tilt ? options?.favorite_tilt_positions : options?.favorite_positions
        ))
    );
  }

  protected render() {
    if (!this.stateObj) {
      return nothing;
    }
    const stateObj = this.stateObj;
    const bothModes =
      supportsAny(stateObj, POSITION_FEATURES) &&
      supportsAny(stateObj, TILT_FEATURES);
    const speedOptions =
      this._mode === "position" &&
      supportsFeature(stateObj, CoverEntityFeature.SPEED)
        ? this._speedOptions(stateObj)
        : [];
    const header = this._stateOverride();

    return html`
      <ha-more-info-state-header
        .stateObj=${stateObj}
        .stateOverride=${header.text}
        .secondaryOverride=${this._secondaryOverride()}
        .stateAccent=${header.accent}
      ></ha-more-info-state-header>
      <div
        class="controls"
        @cover-command=${this._handleCommand}
        @cover-drag-changed=${this._handleDrag}
      >
        <div class="main-control">
          <ha-state-control-cover-drawing
            .stateObj=${stateObj}
            .mode=${this._mode}
            .request=${this._requests.request}
          ></ha-state-control-cover-drawing>
          ${
            bothModes
              ? html`
                  <ha-icon-button-group>
                    <ha-icon-button-toggle
                      .label=${this._localize("ui.card.cover.position")}
                      .selected=${this._mode === "position"}
                      .path=${mdiArrowUpDown}
                      data-mode="position"
                      @click=${this._setMode}
                    ></ha-icon-button-toggle>
                    <ha-icon-button-toggle
                      .label=${this._localize("ui.card.cover.tilt_position")}
                      .selected=${this._mode === "tilt"}
                      .path=${mdiAngleAcute}
                      data-mode="tilt"
                      @click=${this._setMode}
                    ></ha-icon-button-toggle>
                  </ha-icon-button-group>
                `
              : nothing
          }
        </div>
        <ha-more-info-cover-buttons
          .stateObj=${stateObj}
          .mode=${this._mode}
        ></ha-more-info-cover-buttons>
        ${
          speedOptions.length
            ? html`
                <ha-control-select
                  class="speed"
                  .options=${speedOptions}
                  .value=${this._speed}
                  .label=${this._formatters.formatEntityAttributeName(
                    stateObj,
                    "speed"
                  )}
                  @value-changed=${this._handleSpeed}
                ></ha-control-select>
              `
            : nothing
        }
        ${
          this._showFavorites(stateObj)
            ? html`
                <ha-more-info-cover-favorite-positions
                  .stateObj=${stateObj}
                  .entry=${this.entry}
                  .editMode=${this.editMode}
                  .mode=${this._mode}
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
          flex-direction: column;
          align-items: center;
          gap: var(--ha-space-4);
        }
        ha-more-info-cover-buttons,
        .speed {
          max-width: 360px;
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

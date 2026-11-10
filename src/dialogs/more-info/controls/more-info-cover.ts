import { mdiAngleAcute, mdiArrowUpDown } from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consume } from "../../../common/decorators/consume";
import { consumeLocalize } from "../../../common/decorators/consume-context-entry";
import type { HASSDomEvent } from "../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/ha-icon-button-group";
import "../../../components/ha-icon-button-toggle";
import { apiContext, formattersContext } from "../../../data/context";
import type {
  CoverCommand,
  CoverControlMode,
  CoverDrag,
  CoverEntity,
} from "../../../data/cover";
import {
  coverCommandData,
  coverCommandService,
  coverCurrentValue,
  coverHasPositionControls,
  coverHasTiltControls,
  coverModeAttribute,
  coverSupportsPosition,
  coverSupportsSetValue,
  defaultCoverMode,
} from "../../../data/cover";
import type { ExtEntityRegistryEntry } from "../../../data/entity/entity_registry";
import { CoverRequestController } from "../../../state-control/cover/cover-request-controller";
import "../../../state-control/cover/ha-state-control-cover";
import type { HomeAssistantApi, HomeAssistantFormatters } from "../../../types";
import "../components/covers/ha-more-info-cover-buttons";
import "../components/covers/ha-more-info-cover-favorite-positions";
import "../components/ha-more-info-state-header";
import { moreInfoControlStyle } from "../components/more-info-control-style";

type CoverHintKey =
  | "requested"
  | "requested_open"
  | "requested_closed"
  | "currently"
  | "currently_unknown";

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

  private _requests = new CoverRequestController(this);

  protected willUpdate(changedProps: PropertyValues<this>): void {
    super.willUpdate(changedProps);
    if (!changedProps.has("stateObj") || !this.stateObj) {
      return;
    }
    if (changedProps.get("stateObj")?.entity_id !== this.stateObj.entity_id) {
      this._mode = defaultCoverMode(this.stateObj);
      this._requests.clear();
      this._drag = undefined;
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
    const command = ev.detail;
    this._api
      .callService(
        "cover",
        coverCommandService(command),
        coverCommandData(stateObj, command)
      )
      .catch(() => this._requests.clear());
    this._requests.commandSent(command, stateObj);
  }

  private _handleDrag(ev: HASSDomEvent<HASSDomEvents["cover-drag-changed"]>) {
    ev.stopPropagation();
    this._drag = ev.detail.drag;
  }

  private _formatValue(mode: CoverControlMode, value: number) {
    return this._formatters.formatEntityAttributeValue(
      this.stateObj!,
      coverModeAttribute(mode),
      Math.round(value)
    );
  }

  private _hint(key: CoverHintKey, values?: Record<string, string>) {
    return this._localize(`ui.dialogs.more_info_control.cover.${key}`, values);
  }

  private _dragText(): string | undefined {
    const drag = this._drag;
    if (!drag) {
      return undefined;
    }
    if (!drag.swipe) {
      return this._formatValue(this._mode, drag.value);
    }
    if (!drag.swipe.passedHalfway) {
      return undefined;
    }
    return this._localize(
      drag.swipe.action === "close"
        ? "ui.dialogs.more_info_control.cover.closes_on_release"
        : "ui.dialogs.more_info_control.cover.opens_on_release"
    );
  }

  private _stateText(): string {
    const stateObj = this.stateObj!;
    const stateDisplay = this._formatters.formatEntityState(stateObj);
    const mode: CoverControlMode =
      stateObj.attributes.current_position == null ? "tilt" : "position";
    const value = Math.round(coverCurrentValue(stateObj, mode) ?? 0);
    if (value === 0) {
      return stateDisplay;
    }
    return `${stateDisplay} · ${this._formatValue(mode, value)}`;
  }

  private _dragHint(): string | undefined {
    if (!this._drag || this._drag.swipe) {
      return undefined;
    }
    const current = coverCurrentValue(this.stateObj!, this._mode);
    return current === undefined
      ? this._hint("currently_unknown")
      : this._hint("currently", {
          value: this._formatValue(this._mode, current),
        });
  }

  private _requestHint(): string | undefined {
    const request = this._requests.request;
    if (!request || this._drag) {
      return undefined;
    }
    if (request.mode === "position" && !coverSupportsPosition(this.stateObj!)) {
      return this._hint(request.value ? "requested_open" : "requested_closed");
    }
    return this._hint("requested", {
      value: this._formatValue(request.mode, request.value),
    });
  }

  private _showFavorites(stateObj: CoverEntity): boolean {
    if (!this.entry) {
      return false;
    }
    return coverSupportsSetValue(stateObj, this._mode);
  }

  protected render() {
    if (!this.stateObj) {
      return nothing;
    }
    const stateObj = this.stateObj;
    const bothModes =
      coverHasPositionControls(stateObj) && coverHasTiltControls(stateObj);
    const dragText = this._dragText();

    return html`
      <ha-more-info-state-header
        .stateObj=${stateObj}
        .stateOverride=${dragText ?? this._stateText()}
        .changedTextOverride=${this._dragHint() ?? this._requestHint()}
        .stateAccent=${dragText !== undefined}
      ></ha-more-info-state-header>
      <div
        class="controls"
        @cover-command=${this._handleCommand}
        @cover-drag-changed=${this._handleDrag}
      >
        <div class="main-control">
          <ha-state-control-cover
            .stateObj=${stateObj}
            .mode=${this._mode}
            .request=${this._requests.request}
          ></ha-state-control-cover>
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
        ha-more-info-cover-buttons {
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

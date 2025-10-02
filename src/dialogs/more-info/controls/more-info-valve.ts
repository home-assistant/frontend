import { mdiMenu, mdiSwapVertical } from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-attributes";
import "../../../components/ha-icon-button-group";
import "../../../components/ha-icon-button-toggle";
import type { ValveEntity } from "../../../data/valve";
import {
  ValveEntityFeature,
  computeValvePositionStateDisplay,
} from "../../../data/valve";
import "../../../state-control/valve/ha-state-control-valve-buttons";
import "../../../state-control/valve/ha-state-control-valve-position";
import "../../../state-control/valve/ha-state-control-valve-toggle";
import type { HomeAssistant } from "../../../types";
import "../components/ha-more-info-state-header";
import { moreInfoControlStyle } from "../components/more-info-control-style";

type Mode = "position" | "button";

@customElement("more-info-valve")
class MoreInfoValve extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: ValveEntity;

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
        this._mode = supportsFeature(
          this.stateObj,
          ValveEntityFeature.SET_POSITION
        )
          ? "position"
          : "button";
      }
    }
  }

  private get _stateOverride() {
    const stateDisplay = this.hass.formatEntityState(this.stateObj!);

    const positionStateDisplay = computeValvePositionStateDisplay(
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
      ValveEntityFeature.SET_POSITION
    );

    const supportsOpenClose =
      supportsFeature(this.stateObj, ValveEntityFeature.OPEN) ||
      supportsFeature(this.stateObj, ValveEntityFeature.CLOSE) ||
      supportsFeature(this.stateObj, ValveEntityFeature.STOP);

    const supportsOpenCloseOnly =
      supportsFeature(this.stateObj, ValveEntityFeature.OPEN) &&
      supportsFeature(this.stateObj, ValveEntityFeature.CLOSE) &&
      !supportsFeature(this.stateObj, ValveEntityFeature.STOP) &&
      !supportsPosition;

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
                        <ha-state-control-valve-position
                          .stateObj=${this.stateObj}
                          .hass=${this.hass}
                        ></ha-state-control-valve-position>
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
                        <ha-state-control-valve-toggle
                          .stateObj=${this.stateObj}
                          .hass=${this.hass}
                        ></ha-state-control-valve-toggle>
                      `
                    : supportsOpenClose
                      ? html`
                          <ha-state-control-valve-buttons
                            .stateObj=${this.stateObj}
                            .hass=${this.hass}
                          ></ha-state-control-valve-buttons>
                        `
                      : nothing}
                `
              : nothing
          }
            </div>
          ${
            supportsPosition && supportsOpenClose
              ? html`
                  <ha-icon-button-group>
                    <ha-icon-button-toggle
                      .label=${this.hass.localize(
                        `ui.dialogs.more_info_control.valve.switch_mode.position`
                      )}
                      .selected=${this._mode === "position"}
                      .path=${mdiMenu}
                      .mode=${"position"}
                      @click=${this._setMode}
                    ></ha-icon-button-toggle>
                    <ha-icon-button-toggle
                      .label=${this.hass.localize(
                        `ui.dialogs.more_info_control.valve.switch_mode.button`
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
    "more-info-valve": MoreInfoValve;
  }
}

import { mdiArrowBottomLeft, mdiArrowTopRight, mdiStop } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import {
  CoverEntity,
  isFullyClosedTilt,
  isFullyOpenTilt,
  supportsCloseTilt,
  supportsOpenTilt,
  supportsStopTilt,
} from "../data/cover";
import { UNAVAILABLE } from "../data/entity";
import { HomeAssistant } from "../types";
import "./ha-icon-button";

@customElement("ha-cover-tilt-controls")
class HaCoverTiltControls extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) stateObj!: CoverEntity;

  protected render(): TemplateResult {
    if (!this.stateObj) {
      return html``;
    }

    return html` <ha-icon-button
        class=${classMap({
          invisible: !supportsOpenTilt(this.stateObj),
        })}
        .label=${this.hass.localize(
          "ui.dialogs.more_info_control.cover.open_tilt_cover"
        )}
        .path=${mdiArrowTopRight}
        @click=${this._onOpenTiltTap}
        .disabled=${this._computeOpenDisabled()}
      ></ha-icon-button>
      <ha-icon-button
        class=${classMap({
          invisible: !supportsStopTilt(this.stateObj),
        })}
        .label=${this.hass.localize(
          "ui.dialogs.more_info_control.cover.stop_cover"
        )}
        .path=${mdiStop}
        @click=${this._onStopTiltTap}
        .disabled=${this.stateObj.state === UNAVAILABLE}
      ></ha-icon-button>
      <ha-icon-button
        class=${classMap({
          invisible: !supportsCloseTilt(this.stateObj),
        })}
        .label=${this.hass.localize(
          "ui.dialogs.more_info_control.cover.close_tilt_cover"
        )}
        .path=${mdiArrowBottomLeft}
        @click=${this._onCloseTiltTap}
        .disabled=${this._computeClosedDisabled()}
      ></ha-icon-button>`;
  }

  private _computeOpenDisabled(): boolean {
    if (this.stateObj.state === UNAVAILABLE) {
      return true;
    }
    const assumedState = this.stateObj.attributes.assumed_state === true;
    return isFullyOpenTilt(this.stateObj) && !assumedState;
  }

  private _computeClosedDisabled(): boolean {
    if (this.stateObj.state === UNAVAILABLE) {
      return true;
    }
    const assumedState = this.stateObj.attributes.assumed_state === true;
    return isFullyClosedTilt(this.stateObj) && !assumedState;
  }

  private _onOpenTiltTap(ev): void {
    ev.stopPropagation();
    this.hass.callService("cover", "open_cover_tilt", {
      entity_id: this.stateObj.entity_id,
    });
  }

  private _onCloseTiltTap(ev): void {
    ev.stopPropagation();
    this.hass.callService("cover", "close_cover_tilt", {
      entity_id: this.stateObj.entity_id,
    });
  }

  private _onStopTiltTap(ev): void {
    ev.stopPropagation();
    this.hass.callService("cover", "stop_cover_tilt", {
      entity_id: this.stateObj.entity_id,
    });
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        white-space: nowrap;
      }
      .invisible {
        visibility: hidden !important;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-cover-tilt-controls": HaCoverTiltControls;
  }
}

import { HassEntity } from "home-assistant-js-websocket";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { UNAVAILABLE } from "../data/entity";
import { HomeAssistant } from "../types";
import CoverEntity from "../util/cover-model";
import "./ha-icon-button";

@customElement("ha-cover-tilt-controls")
class HaCoverTiltControls extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) stateObj!: HassEntity;

  @state() private _entityObj?: CoverEntity;

  public willUpdate(changedProperties: PropertyValues): void {
    super.willUpdate(changedProperties);

    if (changedProperties.has("stateObj")) {
      this._entityObj = new CoverEntity(this.hass, this.stateObj);
    }
  }

  protected render(): TemplateResult {
    if (!this._entityObj) {
      return html``;
    }

    return html` <ha-icon-button
        class=${classMap({
          invisible: !this._entityObj.supportsOpenTilt,
        })}
        label=${this.hass.localize(
          "ui.dialogs.more_info_control.open_tilt_cover"
        )}
        icon="hass:arrow-top-right"
        @click=${this._onOpenTiltTap}
        .disabled=${this._computeOpenDisabled()}
      ></ha-icon-button>
      <ha-icon-button
        class=${classMap({
          invisible: !this._entityObj.supportsStopTilt,
        })}
        label=${this.hass.localize("ui.dialogs.more_info_control.stop_cover")}
        icon="hass:stop"
        @click=${this._onStopTiltTap}
        .disabled=${this.stateObj.state === UNAVAILABLE}
      ></ha-icon-button>
      <ha-icon-button
        class=${classMap({
          invisible: !this._entityObj.supportsCloseTilt,
        })}
        label=${this.hass.localize(
          "ui.dialogs.more_info_control.close_tilt_cover"
        )}
        icon="hass:arrow-bottom-left"
        @click=${this._onCloseTiltTap}
        .disabled=${this._computeClosedDisabled()}
      ></ha-icon-button>`;
  }

  private _computeOpenDisabled(): boolean {
    if (this.stateObj.state === UNAVAILABLE) {
      return true;
    }
    const assumedState = this.stateObj.attributes.assumed_state === true;
    return this._entityObj.isFullyOpenTilt && !assumedState;
  }

  private _computeClosedDisabled(): boolean {
    if (this.stateObj.state === UNAVAILABLE) {
      return true;
    }
    const assumedState = this.stateObj.attributes.assumed_state === true;
    return this._entityObj.isFullyClosedTilt && !assumedState;
  }

  private _onOpenTiltTap(ev): void {
    ev.stopPropagation();
    this._entityObj.openCoverTilt();
  }

  private _onCloseTiltTap(ev): void {
    ev.stopPropagation();
    this._entityObj.closeCoverTilt();
  }

  private _onStopTiltTap(ev): void {
    ev.stopPropagation();
    this._entityObj.stopCoverTilt();
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

import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";
import { HassEntity } from "home-assistant-js-websocket";

import { UNAVAILABLE } from "../data/entity";
import { HomeAssistant } from "../types";
import CoverEntity from "../util/cover-model";

import "./ha-icon-button";

@customElement("ha-cover-controls")
class HaCoverControls extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @internalProperty() private _stateObj!: HassEntity;

  private _entityObj?: CoverEntity;

  public set stateObj(stateObj: HassEntity) {
    this._entityObj = new CoverEntity(this.hass, stateObj);
    this._stateObj = stateObj;
  }

  protected render(): TemplateResult {
    if (!this._entityObj) {
      return html``;
    }

    return html`
      <div class="state">
        <ha-icon-button
          class=${classMap({
            invisible: !this._entityObj.supportsOpen,
          })}
          .label=${this.hass.localize("ui.dialogs.more_info_control.open_cover")}
          .icon=${this._computeOpenIcon()}
          @click=${this._onOpenTap}
          .disabled=${this._computeOpenDisabled()}
        ></ha-icon-button>
        <ha-icon-button
          class=${classMap({
            invisible: !this._entityObj.supportsStop,
          })}
          .label=${this.hass.localize("ui.dialogs.more_info_control.stop_cover")}
          icon="hass:stop"
          @click=${this._onStopTap}
          .disabled=${this._stateObj.state === UNAVAILABLE}
        ></ha-icon-button>
        <ha-icon-button
          class=${classMap({
            invisible: !this._entityObj.supportsClose,
          })}
          .label=${this.hass.localize(
            "ui.dialogs.more_info_control.close_cover"
          )}
          .icon=${this._computeCloseIcon()}
          @click=${this._onCloseTap}
          .disabled=${this._computeClosedDisabled()}
        ></ha-icon-button>
      </div>
    `;
  }

  private _computeOpenIcon(): string {
    switch (this._stateObj.attributes.device_class) {
      case "awning":
      case "door":
      case "gate":
        return "hass:arrow-expand-horizontal";
      default:
        return "hass:arrow-up";
    }
  }

  private _computeCloseIcon(): string {
    switch (this._stateObj.attributes.device_class) {
      case "awning":
      case "door":
      case "gate":
        return "hass:arrow-collapse-horizontal";
      default:
        return "hass:arrow-down";
    }
  }

  private _computeOpenDisabled(): boolean {
    if (this._stateObj.state === UNAVAILABLE) {
      return true;
    }
    const assumedState = this._stateObj.attributes.assumed_state === true;
    return (
      (this._entityObj.isFullyOpen || this._entityObj.isOpening) &&
      !assumedState
    );
  }

  private _computeClosedDisabled(): boolean {
    if (this._stateObj.state === UNAVAILABLE) {
      return true;
    }
    const assumedState = this._stateObj.attributes.assumed_state === true;
    return (
      (this._entityObj.isFullyClosed || this._entityObj.isClosing) &&
      !assumedState
    );
  }

  private _onOpenTap(ev): void {
    ev.stopPropagation();
    this._entityObj.openCover();
  }

  private _onCloseTap(ev): void {
    ev.stopPropagation();
    this._entityObj.closeCover();
  }

  private _onStopTap(ev): void {
    ev.stopPropagation();
    this._entityObj.stopCover();
  }

  static get styles(): CSSResult {
    return css`
      .state {
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
    "ha-cover-controls": HaCoverControls;
  }
}

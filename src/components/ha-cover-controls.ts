import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";

import { UNAVAILABLE } from "../data/entity";
import { HomeAssistant } from "../types";
import { HassEntity } from "home-assistant-js-websocket";
import CoverEntity from "../util/cover-model";

import "./ha-icon-button";

@customElement("ha-cover-controls")
class HaCoverControls extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public stateObj!: HassEntity;

  protected render() {
    const entityObj = new CoverEntity(this.hass, this.stateObj);

    return html`
      <div class="state">
        <ha-icon-button
          class=${classMap({
            invisible: entityObj.supportsOpen,
          })}
          label="Open cover"
          .icon=${this.computeOpenIcon()}
          @click=${this.onOpenTap}
          .disabled=${this.computeOpenDisabled()}
        ></ha-icon-button>
        <ha-icon-button
          class=${classMap({
            invisible: entityObj.supportsStop,
          })}
          label="Stop the cover from moving"
          icon="hass:stop"
          @click=${this.onStopTap}
          .disabled=${this.computeStopDisabled()}
        ></ha-icon-button>
        <ha-icon-button
          class=${classMap({
            invisible: entityObj.supportsClose,
          })}
          label="Close cover"
          .icon=${this.computeCloseIcon()}
          @click=${this.onCloseTap}
          .disabled=${this.computeClosedDisabled()}
        ></ha-icon-button>
      </div>
    `;
  }

  static get styles(): CSSResult {
    return css`
      .state {
        white-space: nowrap;
      }
      [invisible] {
        visibility: hidden !important;
      }
    `;
  }

  private computeOpenIcon(): string {
    switch (this.stateObj.attributes.device_class) {
      case "awning":
      case "door":
      case "gate":
        return "hass:arrow-expand-horizontal";
      default:
        return "hass:arrow-up";
    }
  }

  private computeCloseIcon(): string {
    switch (this.stateObj.attributes.device_class) {
      case "awning":
      case "door":
      case "gate":
        return "hass:arrow-collapse-horizontal";
      default:
        return "hass:arrow-down";
    }
  }

  private computeStopDisabled(): boolean {
    if (this.stateObj.state === UNAVAILABLE) {
      return true;
    }
    return false;
  }

  private computeOpenDisabled(): boolean {
    if (this.stateObj.state === UNAVAILABLE) {
      return true;
    }
    const assumedState = this.stateObj.attributes.assumed_state === true;
    const entityObj = new CoverEntity(this.hass, this.stateObj);
    return (entityObj.isFullyOpen || entityObj.isOpening) && !assumedState;
  }

  private computeClosedDisabled(): boolean {
    if (this.stateObj.state === UNAVAILABLE) {
      return true;
    }
    const assumedState = this.stateObj.attributes.assumed_state === true;
    const entityObj = new CoverEntity(this.hass, this.stateObj);
    return (entityObj.isFullyClosed || entityObj.isClosing) && !assumedState;
  }

  private onOpenTap(ev): void {
    ev.stopPropagation();
    new CoverEntity(this.hass, this.stateObj).openCover();
  }

  private onCloseTap(ev): void {
    ev.stopPropagation();
    new CoverEntity(this.hass, this.stateObj).closeCover();
  }

  private onStopTap(ev): void {
    ev.stopPropagation();
    new CoverEntity(this.hass, this.stateObj).stopCover();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-cover-controls": HaCoverControls;
  }
}

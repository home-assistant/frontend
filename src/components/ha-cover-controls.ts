import type { HassEntity } from "home-assistant-js-websocket";
import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";
import { computeCloseIcon, computeOpenIcon } from "../common/entity/cover_icon";
import { UNAVAILABLE } from "../data/entity";
import type { HomeAssistant } from "../types";
import CoverEntity from "../util/cover-model";
import "./ha-icon-button";

@customElement("ha-cover-controls")
class HaCoverControls extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: HassEntity;

  @internalProperty() private _entityObj?: CoverEntity;

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    if (changedProperties.has("stateObj")) {
      this._entityObj = new CoverEntity(this.hass, this.stateObj);
    }
  }

  protected render(): TemplateResult {
    if (!this._entityObj) {
      return html``;
    }

    return html`
      <div class="state">
        <ha-icon-button
          class=${classMap({
            hidden: !this._entityObj.supportsOpen,
          })}
          .label=${this.hass.localize(
            "ui.dialogs.more_info_control.open_cover"
          )}
          .icon=${computeOpenIcon(this.stateObj)}
          @click=${this._onOpenTap}
          .disabled=${this._computeOpenDisabled()}
        ></ha-icon-button>
        <ha-icon-button
          class=${classMap({
            hidden: !this._entityObj.supportsStop,
          })}
          .label=${this.hass.localize(
            "ui.dialogs.more_info_control.stop_cover"
          )}
          icon="hass:stop"
          @click=${this._onStopTap}
          .disabled=${this.stateObj.state === UNAVAILABLE}
        ></ha-icon-button>
        <ha-icon-button
          class=${classMap({
            hidden: !this._entityObj.supportsClose,
          })}
          .label=${this.hass.localize(
            "ui.dialogs.more_info_control.close_cover"
          )}
          .icon=${computeCloseIcon(this.stateObj)}
          @click=${this._onCloseTap}
          .disabled=${this._computeClosedDisabled()}
        ></ha-icon-button>
      </div>
    `;
  }

  private _computeOpenDisabled(): boolean {
    if (this.stateObj.state === UNAVAILABLE) {
      return true;
    }
    const assumedState = this.stateObj.attributes.assumed_state === true;
    return (
      (this._entityObj.isFullyOpen || this._entityObj.isOpening) &&
      !assumedState
    );
  }

  private _computeClosedDisabled(): boolean {
    if (this.stateObj.state === UNAVAILABLE) {
      return true;
    }
    const assumedState = this.stateObj.attributes.assumed_state === true;
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
      .hidden {
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

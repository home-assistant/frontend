import { mdiStop } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { computeCloseIcon, computeOpenIcon } from "../common/entity/cover_icon";
import {
  CoverEntity,
  isClosing,
  isFullyClosed,
  isFullyOpen,
  isOpening,
  supportsClose,
  supportsOpen,
  supportsStop,
} from "../data/cover";
import { UNAVAILABLE } from "../data/entity";
import type { HomeAssistant } from "../types";
import "./ha-icon-button";

@customElement("ha-cover-controls")
class HaCoverControls extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: CoverEntity;

  protected render(): TemplateResult {
    if (!this.stateObj) {
      return html``;
    }

    return html`
      <div class="state">
        <ha-icon-button
          class=${classMap({
            hidden: !supportsOpen(this.stateObj),
          })}
          .label=${this.hass.localize(
            "ui.dialogs.more_info_control.cover.open_cover"
          )}
          @click=${this._onOpenTap}
          .disabled=${this._computeOpenDisabled()}
          .path=${computeOpenIcon(this.stateObj)}
        >
        </ha-icon-button>
        <ha-icon-button
          class=${classMap({
            hidden: !supportsStop(this.stateObj),
          })}
          .label=${this.hass.localize(
            "ui.dialogs.more_info_control.cover.stop_cover"
          )}
          .path=${mdiStop}
          @click=${this._onStopTap}
          .disabled=${this.stateObj.state === UNAVAILABLE}
        ></ha-icon-button>
        <ha-icon-button
          class=${classMap({
            hidden: !supportsClose(this.stateObj),
          })}
          .label=${this.hass.localize(
            "ui.dialogs.more_info_control.cover.close_cover"
          )}
          @click=${this._onCloseTap}
          .disabled=${this._computeClosedDisabled()}
          .path=${computeCloseIcon(this.stateObj)}
        >
        </ha-icon-button>
      </div>
    `;
  }

  private _computeOpenDisabled(): boolean {
    if (this.stateObj.state === UNAVAILABLE) {
      return true;
    }
    const assumedState = this.stateObj.attributes.assumed_state === true;
    return (
      (isFullyOpen(this.stateObj) || isOpening(this.stateObj)) && !assumedState
    );
  }

  private _computeClosedDisabled(): boolean {
    if (this.stateObj.state === UNAVAILABLE) {
      return true;
    }
    const assumedState = this.stateObj.attributes.assumed_state === true;
    return (
      (isFullyClosed(this.stateObj) || isClosing(this.stateObj)) &&
      !assumedState
    );
  }

  private _onOpenTap(ev): void {
    ev.stopPropagation();
    this.hass.callService("cover", "open_cover", {
      entity_id: this.stateObj.entity_id,
    });
  }

  private _onCloseTap(ev): void {
    ev.stopPropagation();
    this.hass.callService("cover", "close_cover", {
      entity_id: this.stateObj.entity_id,
    });
  }

  private _onStopTap(ev): void {
    ev.stopPropagation();
    this.hass.callService("cover", "stop_cover", {
      entity_id: this.stateObj.entity_id,
    });
  }

  static get styles(): CSSResultGroup {
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

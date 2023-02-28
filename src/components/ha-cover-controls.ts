import { mdiStop } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { computeCloseIcon, computeOpenIcon } from "../common/entity/cover_icon";
import { supportsFeature } from "../common/entity/supports-feature";
import {
  canClose,
  canOpen,
  canStop,
  CoverEntity,
  CoverEntityFeature,
} from "../data/cover";
import type { HomeAssistant } from "../types";
import "./ha-icon-button";

@customElement("ha-cover-controls")
class HaCoverControls extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: CoverEntity;

  protected render() {
    if (!this.stateObj) {
      return nothing;
    }

    return html`
      <div class="state">
        <ha-icon-button
          class=${classMap({
            hidden: !supportsFeature(this.stateObj, CoverEntityFeature.OPEN),
          })}
          .label=${this.hass.localize(
            "ui.dialogs.more_info_control.cover.open_cover"
          )}
          @click=${this._onOpenTap}
          .disabled=${!canOpen(this.stateObj)}
          .path=${computeOpenIcon(this.stateObj)}
        >
        </ha-icon-button>
        <ha-icon-button
          class=${classMap({
            hidden: !supportsFeature(this.stateObj, CoverEntityFeature.STOP),
          })}
          .label=${this.hass.localize(
            "ui.dialogs.more_info_control.cover.stop_cover"
          )}
          .path=${mdiStop}
          @click=${this._onStopTap}
          .disabled=${!canStop(this.stateObj)}
        ></ha-icon-button>
        <ha-icon-button
          class=${classMap({
            hidden: !supportsFeature(this.stateObj, CoverEntityFeature.CLOSE),
          })}
          .label=${this.hass.localize(
            "ui.dialogs.more_info_control.cover.close_cover"
          )}
          @click=${this._onCloseTap}
          .disabled=${!canClose(this.stateObj)}
          .path=${computeCloseIcon(this.stateObj)}
        >
        </ha-icon-button>
      </div>
    `;
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

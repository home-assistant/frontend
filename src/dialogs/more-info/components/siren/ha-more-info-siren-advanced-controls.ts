import { mdiClose, mdiPlay, mdiStop } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import { stopPropagation } from "../../../../common/dom/stop_propagation";
import { supportsFeature } from "../../../../common/entity/supports-feature";
import "../../../../components/ha-button";
import "../../../../components/ha-control-button";
import "../../../../components/ha-dialog-header";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-list-item";
import type { HaMdDialog } from "../../../../components/ha-md-dialog";
import {
  getMobileCloseToBottomAnimation,
  getMobileOpenFromBottomAnimation,
} from "../../../../components/ha-md-dialog";
import "../../../../components/ha-select";
import "../../../../components/ha-textfield";
import { SirenEntityFeature } from "../../../../data/siren";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";

@customElement("ha-more-info-siren-advanced-controls")
class MoreInfoSirenAdvancedControls extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() _stateObj?: HassEntity;

  @state() _tone?: string;

  @state() _volume?: number;

  @state() _duration?: number;

  @query("ha-md-dialog") private _dialog?: HaMdDialog;

  public showDialog({ stateObj }: { stateObj: HassEntity }) {
    this._stateObj = stateObj;
  }

  public closeDialog(): void {
    this._dialog?.close();
  }

  private _dialogClosed(): void {
    this._stateObj = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  render() {
    if (!this._stateObj) {
      return nothing;
    }
    const supportsTones =
      supportsFeature(this._stateObj, SirenEntityFeature.TONES) &&
      this._stateObj.attributes.available_tones;
    const supportsVolume = supportsFeature(
      this._stateObj,
      SirenEntityFeature.VOLUME_SET
    );
    const supportsDuration = supportsFeature(
      this._stateObj,
      SirenEntityFeature.DURATION
    );
    return html`
      <ha-md-dialog
        open
        @closed=${this._dialogClosed}
        aria-labelledby="dialog-light-color-favorite-title"
        .getOpenAnimation=${getMobileOpenFromBottomAnimation}
        .getCloseAnimation=${getMobileCloseToBottomAnimation}
      >
        <ha-dialog-header slot="headline">
          <ha-icon-button
            slot="navigationIcon"
            @click=${this.closeDialog}
            .label=${this.hass.localize("ui.common.close")}
            .path=${mdiClose}
          ></ha-icon-button>
          <span slot="title" id="dialog-light-color-favorite-title"
            >${this.hass.localize(
              "ui.components.siren.advanced_controls"
            )}</span
          >
        </ha-dialog-header>
        <div slot="content">
          <div class="options">
            ${supportsTones
              ? html`
                  <ha-select
                    .label=${this.hass.localize("ui.components.siren.tone")}
                    @closed=${stopPropagation}
                    @change=${this._handleToneChange}
                    .value=${this._tone}
                  >
                    ${Object.entries(
                      this._stateObj.attributes.available_tones
                    ).map(
                      ([toneId, toneName]) => html`
                        <ha-list-item
                          .value=${Array.isArray(
                            this._stateObj!.attributes.available_tones
                          )
                            ? toneName
                            : toneId}
                          >${toneName}</ha-list-item
                        >
                      `
                    )}
                  </ha-select>
                `
              : nothing}
            ${supportsVolume
              ? html`
                  <ha-textfield
                    type="number"
                    .label=${this.hass.localize("ui.components.siren.volume")}
                    .suffix=${"%"}
                    .value=${this._volume ? this._volume * 100 : undefined}
                    @change=${this._handleVolumeChange}
                    .min=${0}
                    .max=${100}
                    .step=${1}
                  ></ha-textfield>
                `
              : nothing}
            ${supportsDuration
              ? html`
                  <ha-textfield
                    type="number"
                    .label=${this.hass.localize("ui.components.siren.duration")}
                    .value=${this._duration}
                    suffix="s"
                    @change=${this._handleDurationChange}
                  ></ha-textfield>
                `
              : nothing}
          </div>
          <div class="controls">
            <ha-control-button
              .label=${this.hass.localize("ui.card.common.turn_on")}
              @click=${this._turnOn}
            >
              <ha-svg-icon .path=${mdiPlay}></ha-svg-icon>
            </ha-control-button>
            <ha-control-button
              .label=${this.hass.localize("ui.card.common.turn_off")}
              @click=${this._turnOff}
            >
              <ha-svg-icon .path=${mdiStop}></ha-svg-icon>
            </ha-control-button>
          </div>
        </div>
        <div slot="actions">
          <ha-button @click=${this.closeDialog}>
            ${this.hass.localize("ui.common.close")}
          </ha-button>
        </div>
      </ha-md-dialog>
    `;
  }

  private _handleToneChange(ev) {
    this._tone = ev.target.value;
  }

  private _handleVolumeChange(ev) {
    this._volume = parseFloat(ev.target.value) / 100;
    if (isNaN(this._volume)) {
      this._volume = undefined;
    }
  }

  private _handleDurationChange(ev) {
    this._duration = parseInt(ev.target.value);
    if (isNaN(this._duration)) {
      this._duration = undefined;
    }
  }

  private async _turnOn() {
    await this.hass.callService("siren", "turn_on", {
      entity_id: this._stateObj!.entity_id,
      tone: this._tone,
      volume_level: this._volume,
      duration: this._duration,
    });
  }

  private async _turnOff() {
    await this.hass.callService("siren", "turn_off", {
      entity_id: this._stateObj!.entity_id,
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .options {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .controls {
          display: flex;
          flex-direction: row;
          justify-content: center;
          gap: 16px;
          margin-top: 16px;
        }
        ha-control-button {
          --control-button-border-radius: var(--ha-border-radius-xl);
          --mdc-icon-size: 24px;
          width: 64px;
          height: 64px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-siren-advanced-controls": MoreInfoSirenAdvancedControls;
  }
}

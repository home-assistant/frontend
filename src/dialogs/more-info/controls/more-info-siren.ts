import "@material/mwc-button/mwc-button";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-duration-input";
import { UNAVAILABLE } from "../../../data/entity";
import { SirenEntity, SirenEntityFeature } from "../../../data/siren";
import { HomeAssistant } from "../../../types";

const DEFAULT_TONE_KEY = "_";

@customElement("more-info-siren")
class MoreInfoSiren extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: SirenEntity;

  @state() _selectedTone?: string;

  private _toneChanged(ev) {
    const newVal = ev.target.value;

    if (newVal === DEFAULT_TONE_KEY) {
      delete this._selectedTone;
      return;
    }

    this._selectedTone = newVal;

    if (this.stateObj?.state === "on") {
      this._turnOn();
    }
  }

  private _turnOn() {
    const data: Record<string, any> = {
      entity_id: this.stateObj!.entity_id,
    };
    if (this._selectedTone) {
      data.tone = this._selectedTone;
    }
    this.hass.callService("siren", "turn_on", data);
  }

  private _turnOff() {
    this.hass.callService("siren", "turn_off", {
      entity_id: this.stateObj!.entity_id,
    });
  }

  protected render(): TemplateResult {
    if (!this.hass || !this.stateObj) {
      return html``;
    }

    const stateObj = this.stateObj;

    return html`
      <hr />
      <div class="actions">
        ${supportsFeature(stateObj, SirenEntityFeature.TONES) &&
        this.stateObj.attributes.available_tones
          ? html`
              <ha-select
                .label=${this.hass!.localize(
                  "ui.dialogs.more_info_control.siren.tone"
                )}
                .disabled=${stateObj.state === UNAVAILABLE}
                .value=${this._selectedTone ?? DEFAULT_TONE_KEY}
                fixedMenuPosition
                naturalMenuWidth
                @selected=${this._toneChanged}
                @closed=${stopPropagation}
              >
                <mwc-list-item value=${DEFAULT_TONE_KEY}>
                  default
                </mwc-list-item>
                ${stateObj.attributes.available_tones!.map(
                  (tone) => html`
                    <mwc-list-item .value=${tone}>${tone}</mwc-list-item>
                  `
                )}
              </ha-select>
            `
          : ""}
        ${this.stateObj.state === "on"
          ? html`
              <mwc-button @click=${this._turnOff}>
                ${this.hass.localize(
                  "ui.dialogs.more_info_control.siren.turn_off"
                )}
              </mwc-button>
            `
          : html`
              <mwc-button @click=${this._turnOn}>
                ${this.hass.localize(
                  "ui.dialogs.more_info_control.siren.turn_on"
                )}
              </mwc-button>
            `}
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      hr {
        border-color: var(--divider-color);
        border-bottom: none;
        margin: 16px 0;
      }
      .actions {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      }
      .actions ha-select {
        margin-bottom: 8px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-siren": MoreInfoSiren;
  }
}

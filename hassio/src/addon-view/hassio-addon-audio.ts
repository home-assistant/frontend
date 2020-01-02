import "web-animations-js/web-animations-next-lite.min";

import "@material/mwc-button";
import "@polymer/paper-card/paper-card";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";

import { HomeAssistant } from "../../../src/types";
import {
  HassioAddonDetails,
  HassioHardwareAudioDevice,
  fetchHassioHardwareAudio,
  setHassioAddonOption,
  HassioAddonSetOptionParams,
} from "../../../src/data/hassio";
import { PolymerChangedEvent } from "../../../src/polymer-types";
import { hassioStyle } from "../resources/hassio-style";
import { haStyle } from "../../../src/resources/styles";
import { fireEvent } from "../../../src/common/dom/fire_event";

@customElement("hassio-addon-audio")
class HassioAddonAudio extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public addon!: HassioAddonDetails;
  @property() protected error?: string;
  @property() private _inputDevices?: HassioHardwareAudioDevice[];
  @property() private _outputDevices?: HassioHardwareAudioDevice[];
  @property() private _selectedInput?: string;
  @property() private _selectedOutput?: string;

  protected render(): TemplateResult | void {
    return html`
      <paper-card heading="Audio">
        <div class="card-content">
          ${this.error
            ? html`
                <div class="errors">${this.error}</div>
              `
            : ""}

          <paper-dropdown-menu
            label="Input"
            @value-changed="${this._setInputDevice}"
          >
            <paper-listbox
              slot="dropdown-content"
              attr-for-selected="device"
              selected="${this._selectedInput}"
            >
              ${this._inputDevices &&
                this._inputDevices.map((item) => {
                  return html`
                    <paper-item device="${item.device}"
                      >${item.name}</paper-item
                    >
                  `;
                })}
            </paper-listbox>
          </paper-dropdown-menu>
          <paper-dropdown-menu
            label="Output"
            @value-changed="${this._setOutputDevice}"
          >
            <paper-listbox
              slot="dropdown-content"
              attr-for-selected="device"
              selected="${this._selectedOutput}"
            >
              ${this._outputDevices &&
                this._outputDevices.map((item) => {
                  return html`
                    <paper-item device="${item.device}"
                      >${item.name}</paper-item
                    >
                  `;
                })}
            </paper-listbox>
          </paper-dropdown-menu>
        </div>
        <div class="card-actions">
          <mwc-button @click=${this._saveSettings}>Save</mwc-button>
        </div>
      </paper-card>
    `;
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      hassioStyle,
      css`
        :host,
        paper-card,
        paper-dropdown-menu {
          display: block;
        }
        .errors {
          color: var(--google-red-500);
          margin-bottom: 16px;
        }
        paper-item {
          width: 450px;
        }
        .card-actions {
          text-align: right;
        }
      `,
    ];
  }

  protected update(changedProperties: PropertyValues): void {
    super.update(changedProperties);
    if (changedProperties.has("addon")) {
      this._addonChanged();
    }
  }

  private _setInputDevice(ev: PolymerChangedEvent<string>): void {
    const value = ev.detail.value;
    let device: undefined | string;
    if (value) {
      this._inputDevices!.map((item) => {
        if (item.name === value) {
          device = item.device;
        }
      });
    }
    if (device && device !== this._selectedInput) {
      this._selectedInput = device;
    }
  }

  private _setOutputDevice(ev: PolymerChangedEvent<string>): void {
    const value = ev.detail.value;
    let device: undefined | string;
    if (value) {
      this._outputDevices!.map((item) => {
        if (item.name === value) {
          device = item.device;
        }
      });
    }
    if (device && device !== this._selectedOutput) {
      this._selectedOutput = device;
    }
  }

  private async _addonChanged() {
    this._selectedInput = this.addon.audio_input;
    this._selectedOutput = this.addon.audio_output;
    if (this._outputDevices) {
      return;
    }

    const { audio } = await fetchHassioHardwareAudio(this.hass).catch(() => {
      throw new Error("Failed to fetch audio hardware");
    });
    this._inputDevices = Object.keys(audio.input).map((key) => ({
      device: key,
      name: audio.input[key],
    }));
    this._outputDevices = Object.keys(audio.output).map((key) => ({
      device: key,
      name: audio.output[key],
    }));
  }

  private async _saveSettings() {
    this.error = undefined;
    const data: HassioAddonSetOptionParams = {
      audio_input: !this._selectedInput ? null : this._selectedInput,
      audio_output: !this._selectedOutput ? null : this._selectedOutput,
    };
    await setHassioAddonOption(this.hass, this.addon.slug, data).catch(() => {
      throw new Error("Failed to fetch audio hardware");
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-addon-audio": HassioAddonAudio;
  }
}

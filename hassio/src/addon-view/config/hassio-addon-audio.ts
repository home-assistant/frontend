import "@material/mwc-button";
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
import "web-animations-js/web-animations-next-lite.min";
import "../../../../src/components/ha-card";
import {
  HassioAddonDetails,
  HassioAddonSetOptionParams,
  setHassioAddonOption,
} from "../../../../src/data/hassio/addon";
import {
  fetchHassioHardwareAudio,
  HassioHardwareAudioDevice,
} from "../../../../src/data/hassio/hardware";
import { haStyle } from "../../../../src/resources/styles";
import { HomeAssistant } from "../../../../src/types";
import { suggestAddonRestart } from "../../dialogs/suggestAddonRestart";
import { hassioStyle } from "../../resources/hassio-style";

@customElement("hassio-addon-audio")
class HassioAddonAudio extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public addon!: HassioAddonDetails;

  @property() private _error?: string;

  @property() private _inputDevices?: HassioHardwareAudioDevice[];

  @property() private _outputDevices?: HassioHardwareAudioDevice[];

  @property() private _selectedInput!: null | string;

  @property() private _selectedOutput!: null | string;

  protected render(): TemplateResult {
    return html`
      <ha-card header="Audio">
        <div class="card-content">
          ${this._error ? html` <div class="errors">${this._error}</div> ` : ""}

          <paper-dropdown-menu
            label="Input"
            @iron-select=${this._setInputDevice}
          >
            <paper-listbox
              slot="dropdown-content"
              attr-for-selected="device"
              .selected=${this._selectedInput!}
            >
              ${this._inputDevices &&
              this._inputDevices.map((item) => {
                return html`
                  <paper-item device=${item.device || ""}
                    >${item.name}</paper-item
                  >
                `;
              })}
            </paper-listbox>
          </paper-dropdown-menu>
          <paper-dropdown-menu
            label="Output"
            @iron-select=${this._setOutputDevice}
          >
            <paper-listbox
              slot="dropdown-content"
              attr-for-selected="device"
              .selected=${this._selectedOutput!}
            >
              ${this._outputDevices &&
              this._outputDevices.map((item) => {
                return html`
                  <paper-item device=${item.device || ""}
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
      </ha-card>
    `;
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      hassioStyle,
      css`
        :host,
        ha-card,
        paper-dropdown-menu {
          display: block;
        }
        .errors {
          color: var(--error-color);
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

  private _setInputDevice(ev): void {
    const device = ev.detail.item.getAttribute("device");
    this._selectedInput = device;
  }

  private _setOutputDevice(ev): void {
    const device = ev.detail.item.getAttribute("device");
    this._selectedOutput = device;
  }

  private async _addonChanged(): Promise<void> {
    this._selectedInput =
      this.addon.audio_input === null ? "default" : this.addon.audio_input;
    this._selectedOutput =
      this.addon.audio_output === null ? "default" : this.addon.audio_output;
    if (this._outputDevices) {
      return;
    }

    const noDevice: HassioHardwareAudioDevice = {
      device: "default",
      name: "Default",
    };

    try {
      const { audio } = await fetchHassioHardwareAudio(this.hass);
      const input = Object.keys(audio.input).map((key) => ({
        device: key,
        name: audio.input[key],
      }));
      const output = Object.keys(audio.output).map((key) => ({
        device: key,
        name: audio.output[key],
      }));

      this._inputDevices = [noDevice, ...input];
      this._outputDevices = [noDevice, ...output];
    } catch {
      this._error = "Failed to fetch audio hardware";
      this._inputDevices = [noDevice];
      this._outputDevices = [noDevice];
    }
  }

  private async _saveSettings(): Promise<void> {
    this._error = undefined;
    const data: HassioAddonSetOptionParams = {
      audio_input:
        this._selectedInput === "default" ? null : this._selectedInput,
      audio_output:
        this._selectedOutput === "default" ? null : this._selectedOutput,
    };
    try {
      await setHassioAddonOption(this.hass, this.addon.slug, data);
    } catch {
      this._error = "Failed to set addon audio device";
    }
    if (!this._error && this.addon?.state === "started") {
      await suggestAddonRestart(this, this.hass, this.addon);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-addon-audio": HassioAddonAudio;
  }
}

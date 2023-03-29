import "@material/mwc-button";
import "@material/mwc-list/mwc-list-item";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { stopPropagation } from "../../../../src/common/dom/stop_propagation";
import "../../../../src/components/buttons/ha-progress-button";
import "../../../../src/components/ha-alert";
import "../../../../src/components/ha-card";
import "../../../../src/components/ha-select";
import {
  HassioAddonDetails,
  HassioAddonSetOptionParams,
  setHassioAddonOption,
} from "../../../../src/data/hassio/addon";
import {
  fetchHassioHardwareAudio,
  HassioHardwareAudioDevice,
} from "../../../../src/data/hassio/hardware";
import { Supervisor } from "../../../../src/data/supervisor/supervisor";
import { haStyle } from "../../../../src/resources/styles";
import { HomeAssistant } from "../../../../src/types";
import { suggestAddonRestart } from "../../dialogs/suggestAddonRestart";
import { hassioStyle } from "../../resources/hassio-style";

@customElement("hassio-addon-audio")
class HassioAddonAudio extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public supervisor!: Supervisor;

  @property({ attribute: false }) public addon!: HassioAddonDetails;

  @state() private _error?: string;

  @state() private _inputDevices?: HassioHardwareAudioDevice[];

  @state() private _outputDevices?: HassioHardwareAudioDevice[];

  @state() private _selectedInput!: null | string;

  @state() private _selectedOutput!: null | string;

  protected render(): TemplateResult {
    return html`
      <ha-card
        outlined
        .header=${this.supervisor.localize("addon.configuration.audio.header")}
      >
        <div class="card-content">
          ${this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : ""}
          ${this._inputDevices &&
          html`<ha-select
            .label=${this.supervisor.localize(
              "addon.configuration.audio.input"
            )}
            @selected=${this._setInputDevice}
            @closed=${stopPropagation}
            fixedMenuPosition
            naturalMenuWidth
            .value=${this._selectedInput!}
          >
            ${this._inputDevices.map(
              (item) => html`
                <mwc-list-item .value=${item.device || ""}>
                  ${item.name}
                </mwc-list-item>
              `
            )}
          </ha-select>`}
          ${this._outputDevices &&
          html`<ha-select
            .label=${this.supervisor.localize(
              "addon.configuration.audio.output"
            )}
            @selected=${this._setOutputDevice}
            @closed=${stopPropagation}
            fixedMenuPosition
            naturalMenuWidth
            .value=${this._selectedOutput!}
          >
            ${this._outputDevices.map(
              (item) => html`
                <mwc-list-item .value=${item.device || ""}
                  >${item.name}</mwc-list-item
                >
              `
            )}
          </ha-select>`}
        </div>
        <div class="card-actions">
          <ha-progress-button @click=${this._saveSettings}>
            ${this.supervisor.localize("common.save")}
          </ha-progress-button>
        </div>
      </ha-card>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      hassioStyle,
      css`
        :host,
        ha-card {
          display: block;
        }
        .card-actions {
          text-align: right;
        }
        ha-select {
          width: 100%;
        }
        ha-select:last-child {
          margin-top: 8px;
        }
      `,
    ];
  }

  protected willUpdate(changedProperties: PropertyValues): void {
    super.willUpdate(changedProperties);
    if (changedProperties.has("addon")) {
      this._addonChanged();
    }
  }

  private _setInputDevice(ev): void {
    const device = ev.target.value;
    this._selectedInput = device;
  }

  private _setOutputDevice(ev): void {
    const device = ev.target.value;
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
      name: this.supervisor.localize("addon.configuration.audio.default"),
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

  private async _saveSettings(ev: CustomEvent): Promise<void> {
    const button = ev.currentTarget as any;
    button.progress = true;

    this._error = undefined;
    const data: HassioAddonSetOptionParams = {
      audio_input:
        this._selectedInput === "default" ? null : this._selectedInput,
      audio_output:
        this._selectedOutput === "default" ? null : this._selectedOutput,
    };
    try {
      await setHassioAddonOption(this.hass, this.addon.slug, data);
      if (this.addon?.state === "started") {
        await suggestAddonRestart(this, this.hass, this.supervisor, this.addon);
      }
    } catch {
      this._error = "Failed to set addon audio device";
    }

    button.progress = false;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-addon-audio": HassioAddonAudio;
  }
}

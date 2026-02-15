import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../../components/buttons/ha-progress-button";
import "../../../../../components/ha-alert";
import "../../../../../components/ha-card";
import "../../../../../components/ha-select";
import type { HaSelectSelectEvent } from "../../../../../components/ha-select";
import type {
  HassioAddonDetails,
  HassioAddonSetOptionParams,
} from "../../../../../data/hassio/addon";
import { setHassioAddonOption } from "../../../../../data/hassio/addon";
import type { HassioHardwareAudioDevice } from "../../../../../data/hassio/hardware";
import { fetchHassioHardwareAudio } from "../../../../../data/hassio/hardware";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import { supervisorAppsStyle } from "../../resources/supervisor-apps-style";
import { suggestSupervisorAppRestart } from "../dialogs/suggestSupervisorAppRestart";

@customElement("supervisor-app-audio")
class SupervisorAppAudio extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public addon!: HassioAddonDetails;

  @property({ type: Boolean }) public disabled = false;

  @state() private _error?: string;

  @state() private _inputDevices?: HassioHardwareAudioDevice[];

  @state() private _outputDevices?: HassioHardwareAudioDevice[];

  @state() private _selectedInput!: null | string;

  @state() private _selectedOutput!: null | string;

  protected render(): TemplateResult {
    return html`
      <ha-card
        outlined
        .header=${this.hass.localize(
          "ui.panel.config.apps.configuration.audio.header"
        )}
      >
        <div class="card-content">
          ${this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : nothing}
          ${this._inputDevices &&
          html`<ha-select
            .label=${this.hass.localize(
              "ui.panel.config.apps.configuration.audio.input"
            )}
            @selected=${this._setInputDevice}
            .value=${this._selectedInput!}
            .disabled=${this.disabled}
            .options=${this._inputDevices.map((item) => ({
              value: item.device || "",
              label: item.name,
            }))}
          >
          </ha-select>`}
          ${this._outputDevices &&
          html`<ha-select
            .label=${this.hass.localize(
              "ui.panel.config.apps.configuration.audio.output"
            )}
            @selected=${this._setOutputDevice}
            .value=${this._selectedOutput!}
            .disabled=${this.disabled}
            .options=${this._outputDevices.map((item) => ({
              value: item.device || "",
              label: item.name,
            }))}
          >
          </ha-select>`}
        </div>
        <div class="card-actions">
          <ha-progress-button
            .disabled=${this.disabled}
            @click=${this._saveSettings}
          >
            ${this.hass.localize("ui.common.save")}
          </ha-progress-button>
        </div>
      </ha-card>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      supervisorAppsStyle,
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
          display: block;
        }
        ha-select:last-child {
          margin-top: var(--ha-space-2);
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

  private _setInputDevice(ev: HaSelectSelectEvent): void {
    const device = ev.detail.value;
    this._selectedInput = device ?? null;
  }

  private _setOutputDevice(ev: HaSelectSelectEvent): void {
    const device = ev.detail.value;
    this._selectedOutput = device ?? null;
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
      name: this.hass.localize(
        "ui.panel.config.apps.configuration.audio.default"
      ),
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
      this._error = this.hass.localize(
        "ui.panel.config.apps.configuration.audio.failed_to_load_hardware"
      );
      this._inputDevices = [noDevice];
      this._outputDevices = [noDevice];
    }
  }

  private async _saveSettings(ev: CustomEvent): Promise<void> {
    if (this.disabled) {
      return;
    }

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
        await suggestSupervisorAppRestart(this, this.hass, this.addon);
      }
    } catch {
      this._error = this.hass.localize(
        "ui.panel.config.apps.configuration.audio.failed_to_save"
      );
    }

    button.progress = false;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "supervisor-app-audio": SupervisorAppAudio;
  }
}

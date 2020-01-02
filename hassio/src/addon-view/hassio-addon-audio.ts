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
import { HassioAddonDetails } from "../../../src/data/hassio";
import { PolymerChangedEvent } from "../../../src/polymer-types";
import { hassioStyle } from "../resources/hassio-style";
import { haStyle } from "../../../src/resources/styles";
import { fireEvent } from "../../../src/common/dom/fire_event";

interface Device {
  device: string;
  name: string;
}

@customElement("hassio-addon-audio")
class HassioAddonAudio extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public addon!: HassioAddonDetails;
  @property() protected error?: string;
  @property() private _inputDevices!: Device[];
  @property() private _outputDevices!: Device[];
  @property() private _selectedInput!: string;
  @property() private _selectedOutput!: string;

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

  private _addonChanged(): void {
    this._selectedInput = this.addon.audio_input || "null";
    this._selectedOutput = this.addon.audio_output || "null";
    if (this._outputDevices) {
      return;
    }

    const noDevice = [{ device: "null", name: "-" }];
    this.hass.callApi("GET", "hassio/hardware/audio").then(
      (resp) => {
        const dev = (resp as any).data.audio;
        const input = Object.keys(dev.input).map((key) => ({
          device: key,
          name: dev.input[key],
        }));
        const output = Object.keys(dev.output).map((key) => ({
          device: key,
          name: dev.output[key],
        }));
        this._inputDevices = noDevice.concat(input);
        this._outputDevices = noDevice.concat(output);
      },
      () => {
        this._inputDevices = noDevice;
        this._outputDevices = noDevice;
      }
    );
  }

  private _saveSettings(): void {
    this.error = undefined;
    const path = `hassio/addons/${this.addon.slug}/options`;
    const eventData = {
      path,
      success: false,
      response: undefined,
    };
    this.hass
      .callApi("POST", path, {
        audio_input:
          this._selectedInput === "null" ? null : this._selectedInput,
        audio_output:
          this._selectedOutput === "null" ? null : this._selectedOutput,
      })
      .then(
        (resp) => {
          eventData.success = true;
          eventData.response = resp as any;
        },
        (resp) => {
          eventData.success = false;
          eventData.response = resp;
        }
      )
      .then(
        () => {
          fireEvent(this, "hass-api-called", eventData);
        },
        (resp) => {
          this.error = resp.body.message;
        }
      );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-addon-audio": HassioAddonAudio;
  }
}

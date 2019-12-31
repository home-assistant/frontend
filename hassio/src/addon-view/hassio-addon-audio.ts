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

  @property() public inputDevices!: Device[];
  @property() public outputDevices!: Device[];
  @property() public selectedInput!: string;
  @property() public selectedOutput!: string;

  @property() protected error?: string;

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
            @value-changed="${this.setInputDevice}"
          >
            <paper-listbox
              slot="dropdown-content"
              attr-for-selected="device"
              selected="${this.selectedInput}"
            >
              ${this.inputDevices &&
                this.inputDevices.map((item) => {
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
            @value-changed="${this.setOutputDevice}"
          >
            <paper-listbox
              slot="dropdown-content"
              attr-for-selected="device"
              selected="${this.selectedOutput}"
            >
              ${this.outputDevices &&
                this.outputDevices.map((item) => {
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

  protected update(changedProperties: PropertyValues) {
    super.update(changedProperties);
    if (changedProperties.has("addon")) {
      this.addonChanged();
    }
  }

  protected setInputDevice(ev: PolymerChangedEvent<string>): void {
    const value = ev.detail.value;
    let device: undefined | string;
    if (value) {
      this.inputDevices!.map((item) => {
        if (item.name === value) {
          device = item.device;
        }
      });
    }
    if (device && device !== this.selectedInput) {
      this.selectedInput = device;
    }
  }

  protected setOutputDevice(ev: PolymerChangedEvent<string>): void {
    const value = ev.detail.value;
    let device: undefined | string;
    if (value) {
      this.outputDevices!.map((item) => {
        if (item.name === value) {
          device = item.device;
        }
      });
    }
    if (device && device !== this.selectedOutput) {
      this.selectedOutput = device;
    }
  }

  protected addonChanged(): void {
    this.selectedInput = this.addon.audio_input || "null";
    this.selectedOutput = this.addon.audio_output || "null";
    if (this.outputDevices) {
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
        this.inputDevices = noDevice.concat(input);
        this.outputDevices = noDevice.concat(output);
      },
      () => {
        this.inputDevices = noDevice;
        this.outputDevices = noDevice;
      }
    );
  }

  protected _saveSettings(): void {
    this.error = undefined;
    const path = `hassio/addons/${this.addon.slug}/options`;
    const eventData = {
      path,
      success: false,
      response: undefined,
    };
    this.hass
      .callApi("POST", path, {
        audio_input: this.selectedInput === "null" ? null : this.selectedInput,
        audio_output:
          this.selectedOutput === "null" ? null : this.selectedOutput,
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

import "@material/mwc-button";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-area-picker";
import { DataEntryFlowStepCreateEntry } from "../../data/data_entry_flow";
import {
  computeDeviceName,
  DeviceRegistryEntry,
  updateDeviceRegistryEntry,
} from "../../data/device_registry";
import { HomeAssistant } from "../../types";
import { showAlertDialog } from "../generic/show-dialog-box";
import { FlowConfig } from "./show-dialog-data-entry-flow";
import { configFlowContentStyles } from "./styles";

@customElement("step-flow-create-entry")
class StepFlowCreateEntry extends LitElement {
  @property({ attribute: false }) public flowConfig!: FlowConfig;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public step!: DataEntryFlowStepCreateEntry;

  @property({ attribute: false }) public devices!: DeviceRegistryEntry[];

  protected render(): TemplateResult {
    const localize = this.hass.localize;

    return html`
      <h2>${localize("ui.panel.config.integrations.config_flow.success")}!</h2>
      <div class="content">
        ${this.flowConfig.renderCreateEntryDescription(this.hass, this.step)}
        ${this.step.result?.state === "not_loaded"
          ? html`<span class="error"
              >${localize(
                "ui.panel.config.integrations.config_flow.not_loaded"
              )}</span
            >`
          : ""}
        ${this.devices.length === 0
          ? ""
          : html`
              <p>
                ${localize(
                  "ui.panel.config.integrations.config_flow.found_following_devices"
                )}:
              </p>
              <div class="devices">
                ${this.devices.map(
                  (device) => html`
                    <div class="device">
                      <div>
                        <b>${computeDeviceName(device, this.hass)}</b><br />
                        ${!device.model && !device.manufacturer
                          ? html`&nbsp;`
                          : html`${device.model}
                            ${device.manufacturer
                              ? html`(${device.manufacturer})`
                              : ""}`}
                      </div>
                      <ha-area-picker
                        .hass=${this.hass}
                        .device=${device.id}
                        .value=${device.area_id ?? undefined}
                        @value-changed=${this._areaPicked}
                      ></ha-area-picker>
                    </div>
                  `
                )}
              </div>
            `}
      </div>
      <div class="buttons">
        <mwc-button @click=${this._flowDone}
          >${localize(
            "ui.panel.config.integrations.config_flow.finish"
          )}</mwc-button
        >
      </div>
    `;
  }

  private _flowDone(): void {
    fireEvent(this, "flow-update", { step: undefined });
  }

  private async _areaPicked(ev: CustomEvent) {
    const picker = ev.currentTarget as any;
    const device = picker.device;

    const area = ev.detail.value;
    try {
      await updateDeviceRegistryEntry(this.hass, device, {
        area_id: area,
      });
    } catch (err: any) {
      showAlertDialog(this, {
        text: this.hass.localize(
          "ui.panel.config.integrations.config_flow.error_saving_area",
          "error",
          err.message
        ),
      });
      picker.value = null;
    }
  }

  static get styles(): CSSResultGroup {
    return [
      configFlowContentStyles,
      css`
        .devices {
          display: flex;
          flex-wrap: wrap;
          margin: -4px;
          max-height: 600px;
          overflow-y: auto;
        }
        .device {
          border: 1px solid var(--divider-color);
          padding: 5px;
          border-radius: 4px;
          margin: 4px;
          display: inline-block;
          width: 250px;
        }
        .buttons > *:last-child {
          margin-left: auto;
        }
        @media all and (max-width: 450px), all and (max-height: 500px) {
          .device {
            width: 100%;
          }
        }
        .error {
          color: var(--error-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "step-flow-create-entry": StepFlowCreateEntry;
  }
}

import {
  LitElement,
  TemplateResult,
  html,
  customElement,
  property,
  CSSResultArray,
  css,
} from "lit-element";
import "@material/mwc-button";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu-light";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import "../../components/ha-area-picker";
import { HomeAssistant } from "../../types";
import { fireEvent } from "../../common/dom/fire_event";
import { configFlowContentStyles } from "./styles";
import {
  DeviceRegistryEntry,
  updateDeviceRegistryEntry,
} from "../../data/device_registry";
import { DataEntryFlowStepCreateEntry } from "../../data/data_entry_flow";
import { FlowConfig } from "./show-dialog-data-entry-flow";
import { showAlertDialog } from "../generic/show-dialog-box";

@customElement("step-flow-create-entry")
class StepFlowCreateEntry extends LitElement {
  public flowConfig!: FlowConfig;

  @property()
  public hass!: HomeAssistant;

  @property()
  public step!: DataEntryFlowStepCreateEntry;

  @property()
  public devices!: DeviceRegistryEntry[];

  protected render(): TemplateResult | void {
    const localize = this.hass.localize;

    return html`
      <h2>Success!</h2>
      <div class="content">
        ${this.flowConfig.renderCreateEntryDescription(this.hass, this.step)}
        ${this.devices.length === 0
          ? ""
          : html`
              <p>We found the following devices:</p>
              <div class="devices">
                ${this.devices.map(
                  (device) =>
                    html`
                      <div class="device">
                        <div>
                          <b>${device.name}</b><br />
                          ${device.model} (${device.manufacturer})
                        </div>
                        <ha-area-picker
                          .hass=${this.hass}
                          .device=${device.id}
                          @value-changed=${this._areaPicked}
                        ></ha-area-picker>
                      </div>
                    `
                )}
              </div>
            `}
      </div>
      <div class="buttons">
        <mwc-button @click="${this._flowDone}"
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
    } catch (err) {
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

  static get styles(): CSSResultArray {
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
          width: 210px;
          flex-grow: 1;
        }
        .buttons > *:last-child {
          margin-left: auto;
        }
        paper-dropdown-menu-light {
          cursor: pointer;
        }
        paper-item {
          cursor: pointer;
          white-space: nowrap;
        }
        @media all and (max-width: 450px), all and (max-height: 500px) {
          .device {
            width: 100%;
          }
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

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

import { HomeAssistant } from "../../types";
import { fireEvent } from "../../common/dom/fire_event";
import { configFlowContentStyles } from "./styles";
import {
  DeviceRegistryEntry,
  updateDeviceRegistryEntry,
} from "../../data/device_registry";
import {
  AreaRegistryEntry,
  createAreaRegistryEntry,
} from "../../data/area_registry";
import { DataEntryFlowStepCreateEntry } from "../../data/data_entry_flow";
import { FlowConfig } from "./show-dialog-data-entry-flow";

@customElement("step-flow-create-entry")
class StepFlowCreateEntry extends LitElement {
  public flowConfig!: FlowConfig;

  @property()
  public hass!: HomeAssistant;

  @property()
  public step!: DataEntryFlowStepCreateEntry;

  @property()
  public devices!: DeviceRegistryEntry[];

  @property()
  public areas!: AreaRegistryEntry[];

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
                        <paper-dropdown-menu-light
                          label="${localize(
                            "ui.panel.config.integrations.config_flow.area_picker_label"
                          )}"
                          .device=${device.id}
                          @selected-item-changed=${this._handleAreaChanged}
                        >
                          <paper-listbox slot="dropdown-content" selected="0">
                            <paper-item>
                              ${localize(
                                "ui.panel.config.integrations.config_entry.no_area"
                              )}
                            </paper-item>
                            ${this.areas.map(
                              (area) => html`
                                <paper-item .area=${area.area_id}>
                                  ${area.name}
                                </paper-item>
                              `
                            )}
                          </paper-listbox>
                        </paper-dropdown-menu-light>
                      </div>
                    `
                )}
              </div>
            `}
      </div>
      <div class="buttons">
        ${this.devices.length > 0
          ? html`
              <mwc-button @click="${this._addArea}"
                >${localize(
                  "ui.panel.config.integrations.config_flow.add_area"
                )}</mwc-button
              >
            `
          : ""}

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

  private async _addArea() {
    const name = prompt(
      this.hass.localize(
        "ui.panel.config.integrations.config_flow.name_new_area"
      )
    );
    if (!name) {
      return;
    }
    try {
      const area = await createAreaRegistryEntry(this.hass, {
        name,
      });
      this.areas = [...this.areas, area];
    } catch (err) {
      alert(
        this.hass.localize(
          "ui.panel.config.integrations.config_flow.failed_create_area"
        )
      );
    }
  }

  private async _handleAreaChanged(ev: Event) {
    const dropdown = ev.currentTarget as any;
    const device = dropdown.device;

    // Item first becomes null, then new item.
    if (!dropdown.selectedItem) {
      return;
    }

    const area = dropdown.selectedItem.area;
    try {
      await updateDeviceRegistryEntry(this.hass, device, {
        area_id: area,
      });
    } catch (err) {
      alert(
        this.hass.localize(
          "ui.panel.config.integrations.config_flow.error_saving_area",
          "error",
          "err.message"
        )
      );
      dropdown.value = null;
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
          width: 200px;
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

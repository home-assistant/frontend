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

import { ConfigFlowStepCreateEntry } from "../../data/config_entries";
import { HomeAssistant } from "../../types";
import { localizeKey } from "../../common/translations/localize";
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

@customElement("step-flow-create-entry")
class StepFlowCreateEntry extends LitElement {
  @property()
  public hass!: HomeAssistant;

  @property()
  public step!: ConfigFlowStepCreateEntry;

  @property()
  public devices!: DeviceRegistryEntry[];

  @property()
  public areas!: AreaRegistryEntry[];

  protected render(): TemplateResult | void {
    const localize = this.hass.localize;
    const step = this.step;

    const description = localizeKey(
      localize,
      `component.${step.handler}.config.create_entry.${step.description ||
        "default"}`,
      step.description_placeholders
    );

    return html`
        <h2>Success!</h2>
        <div class="content">
          ${
            description
              ? html`
                  <ha-markdown .content=${description} allow-svg></ha-markdown>
                `
              : ""
          }
          <p>Created config for ${step.title}.</p>
          ${
            this.devices.length === 0
              ? ""
              : html`
                  <p>We found the following devices:</p>
                  <div class="devices">
                    ${this.devices.map(
                      (device) =>
                        html`
                          <div class="device">
                            <b>${device.name}</b><br />
                            ${device.model} (${device.manufacturer})

                            <paper-dropdown-menu-light
                              label="Area"
                              .device=${device.id}
                              @selected-item-changed=${this._handleAreaChanged}
                            >
                              <paper-listbox
                                slot="dropdown-content"
                                selected="0"
                              >
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
                `
          }
        </div>
        <div class="buttons">
          ${
            this.devices.length > 0
              ? html`
                  <mwc-button @click="${this._addArea}">Add Area</mwc-button>
                `
              : ""
          }

          <mwc-button @click="${this._flowDone}">Finish</mwc-button>
        </div>
      </paper-dialog>
    `;
  }

  private _flowDone(): void {
    fireEvent(this, "flow-update", { step: undefined });
  }

  private async _addArea() {
    const name = prompt("Name of the new area?");
    if (!name) {
      return;
    }
    try {
      const area = await createAreaRegistryEntry(this.hass, {
        name,
      });
      this.areas = [...this.areas, area];
    } catch (err) {
      alert("Failed to create area.");
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
      alert(`Error saving area: ${err.message}`);
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "step-flow-create-entry": StepFlowCreateEntry;
  }
}

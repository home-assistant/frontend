import "@material/mwc-button";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import { computeDomain } from "../../common/entity/compute_domain";
import "../../components/ha-area-picker";
import { assistSatelliteSupportsSetupFlow } from "../../data/assist_satellite";
import type { DataEntryFlowStepCreateEntry } from "../../data/data_entry_flow";
import type { DeviceRegistryEntry } from "../../data/device_registry";
import {
  computeDeviceName,
  updateDeviceRegistryEntry,
} from "../../data/device_registry";
import type { EntityRegistryDisplayEntry } from "../../data/entity_registry";
import type { HomeAssistant } from "../../types";
import { showAlertDialog } from "../generic/show-dialog-box";
import { showVoiceAssistantSetupDialog } from "../voice-assistant-setup/show-voice-assistant-setup-dialog";
import type { FlowConfig } from "./show-dialog-data-entry-flow";
import { configFlowContentStyles } from "./styles";

@customElement("step-flow-create-entry")
class StepFlowCreateEntry extends LitElement {
  @property({ attribute: false }) public flowConfig!: FlowConfig;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public step!: DataEntryFlowStepCreateEntry;

  private _devices = memoizeOne(
    (
      showDevices: boolean,
      devices: DeviceRegistryEntry[],
      entry_id?: string
    ) =>
      showDevices && entry_id
        ? devices.filter((device) => device.config_entries.includes(entry_id))
        : []
  );

  private _deviceEntities = memoizeOne(
    (
      deviceId: string,
      entities: EntityRegistryDisplayEntry[],
      domain?: string
    ): EntityRegistryDisplayEntry[] =>
      entities.filter(
        (entity) =>
          entity.device_id === deviceId &&
          (!domain || computeDomain(entity.entity_id) === domain)
      )
  );

  protected willUpdate(changedProps: PropertyValues) {
    if (!changedProps.has("devices") && !changedProps.has("hass")) {
      return;
    }

    const devices = this._devices(
      this.flowConfig.showDevices,
      Object.values(this.hass.devices),
      this.step.result?.entry_id
    );

    if (
      devices.length !== 1 ||
      devices[0].primary_config_entry !== this.step.result?.entry_id
    ) {
      return;
    }

    const assistSatellites = this._deviceEntities(
      devices[0].id,
      Object.values(this.hass.entities),
      "assist_satellite"
    );
    if (
      assistSatellites.length &&
      assistSatellites.some((satellite) =>
        assistSatelliteSupportsSetupFlow(this.hass.states[satellite.entity_id])
      )
    ) {
      this._flowDone();
      showVoiceAssistantSetupDialog(this, {
        deviceId: devices[0].id,
      });
    }
  }

  protected render(): TemplateResult {
    const localize = this.hass.localize;
    const devices = this._devices(
      this.flowConfig.showDevices,
      Object.values(this.hass.devices),
      this.step.result?.entry_id
    );
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
          : nothing}
        ${devices.length === 0
          ? nothing
          : html`
              <p>
                ${localize(
                  "ui.panel.config.integrations.config_flow.found_following_devices"
                )}:
              </p>
              <div class="devices">
                ${devices.map(
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
          { error: err.message }
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
          margin-inline-start: auto;
          margin-inline-end: initial;
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

import "@material/mwc-button";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import {
  computeDeviceName,
  computeDeviceNameDisplay,
} from "../../common/entity/compute_device_name";
import { computeDomain } from "../../common/entity/compute_domain";
import { navigate } from "../../common/navigate";
import { slugify } from "../../common/string/slugify";
import "../../components/ha-area-picker";
import { assistSatelliteSupportsSetupFlow } from "../../data/assist_satellite";
import type { DataEntryFlowStepCreateEntry } from "../../data/data_entry_flow";
import type { DeviceRegistryEntry } from "../../data/device_registry";
import { updateDeviceRegistryEntry } from "../../data/device_registry";
import {
  updateEntityRegistryEntry,
  type EntityRegistryDisplayEntry,
} from "../../data/entity_registry";
import { domainToName } from "../../data/integration";
import type { HomeAssistant } from "../../types";
import { brandsUrl } from "../../util/brands-url";
import { showAlertDialog } from "../generic/show-dialog-box";
import { showVoiceAssistantSetupDialog } from "../voice-assistant-setup/show-voice-assistant-setup-dialog";
import type { FlowConfig } from "./show-dialog-data-entry-flow";
import { configFlowContentStyles } from "./styles";

@customElement("step-flow-create-entry")
class StepFlowCreateEntry extends LitElement {
  @property({ attribute: false }) public flowConfig!: FlowConfig;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public step!: DataEntryFlowStepCreateEntry;

  public navigateToResult = false;

  @state() private _deviceUpdate: Record<
    string,
    { name?: string; area?: string }
  > = {};

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
      devices[0].primary_config_entry !== this.step.result?.entry_id ||
      this.step.result.domain === "voip"
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
      this.navigateToResult = false;
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
      <h2>
        ${devices.length
          ? localize("ui.panel.config.integrations.config_flow.assign_area", {
              number: devices.length,
            })
          : `${localize("ui.panel.config.integrations.config_flow.success")}!`}
      </h2>
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
          ? html`<p>
              ${localize(
                "ui.panel.config.integrations.config_flow.created_config",
                { name: this.step.title }
              )}
            </p>`
          : html`
              <div class="devices">
                ${devices.map(
                  (device) => html`
                    <div class="device">
                      <div class="device-info">
                        ${this.step.result?.domain
                          ? html`<img
                              slot="graphic"
                              alt=${domainToName(
                                this.hass.localize,
                                this.step.result.domain
                              )}
                              src=${brandsUrl({
                                domain: this.step.result.domain,
                                type: "icon",
                                darkOptimized: this.hass.themes?.darkMode,
                              })}
                              crossorigin="anonymous"
                              referrerpolicy="no-referrer"
                            />`
                          : nothing}
                        <div class="device-info-details">
                          <span>${device.model || device.manufacturer}</span>
                          ${device.model
                            ? html`<span class="secondary">
                                ${device.manufacturer}
                              </span>`
                            : nothing}
                        </div>
                      </div>
                      <ha-textfield
                        .label=${localize(
                          "ui.panel.config.integrations.config_flow.device_name"
                        )}
                        .placeholder=${computeDeviceNameDisplay(
                          device,
                          this.hass
                        )}
                        .value=${this._deviceUpdate[device.id]?.name ??
                        computeDeviceName(device)}
                        @change=${this._deviceNameChanged}
                        .device=${device.id}
                      ></ha-textfield>
                      <ha-area-picker
                        .hass=${this.hass}
                        .device=${device.id}
                        .value=${this._deviceUpdate[device.id]?.area ??
                        device.area_id ??
                        undefined}
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
            `ui.panel.config.integrations.config_flow.${!devices.length || Object.keys(this._deviceUpdate).length ? "finish" : "finish_skip"}`
          )}</mwc-button
        >
      </div>
    `;
  }

  private async _flowDone(): Promise<void> {
    if (Object.keys(this._deviceUpdate).length) {
      const renamedDevices: {
        deviceId: string;
        oldDeviceName: string | null | undefined;
        newDeviceName: string;
      }[] = [];
      const deviceUpdates = Object.entries(this._deviceUpdate).map(
        ([deviceId, update]) => {
          if (update.name) {
            renamedDevices.push({
              deviceId,
              oldDeviceName: computeDeviceName(this.hass.devices[deviceId]),
              newDeviceName: update.name,
            });
          }
          return updateDeviceRegistryEntry(this.hass, deviceId, {
            name_by_user: update.name,
            area_id: update.area,
          }).catch((err: any) => {
            showAlertDialog(this, {
              text: this.hass.localize(
                "ui.panel.config.integrations.config_flow.error_saving_device",
                { error: err.message }
              ),
            });
          });
        }
      );
      const entityUpdates: Promise<any>[] = [];
      renamedDevices.forEach(({ deviceId, oldDeviceName, newDeviceName }) => {
        if (!oldDeviceName) {
          return;
        }
        const entities = this._deviceEntities(
          deviceId,
          Object.values(this.hass.entities)
        );
        const oldDeviceSlug = slugify(oldDeviceName);
        const newDeviceSlug = slugify(newDeviceName);
        entities.forEach((entity) => {
          const oldId = entity.entity_id;

          if (oldId.includes(oldDeviceSlug)) {
            const newEntityId = oldId.replace(oldDeviceSlug, newDeviceSlug);
            entityUpdates.push(
              updateEntityRegistryEntry(this.hass, entity.entity_id, {
                new_entity_id: newEntityId,
              }).catch((err) =>
                showAlertDialog(this, {
                  text: this.hass.localize(
                    "ui.panel.config.integrations.config_flow.error_saving_entity",
                    { error: err.message }
                  ),
                })
              )
            );
          }
        });
      });
      await Promise.allSettled([...deviceUpdates, ...entityUpdates]);
    }

    fireEvent(this, "flow-update", { step: undefined });
    if (this.step.result && this.navigateToResult) {
      navigate(
        `/config/integrations/integration/${this.step.result.domain}#config_entry=${this.step.result.entry_id}`
      );
    }
  }

  private async _areaPicked(ev: CustomEvent) {
    const picker = ev.currentTarget as any;
    const device = picker.device;
    const area = ev.detail.value;

    if (!(device in this._deviceUpdate)) {
      this._deviceUpdate[device] = {};
    }
    this._deviceUpdate[device].area = area;
    this.requestUpdate("_deviceUpdate");
  }

  private _deviceNameChanged(ev): void {
    const picker = ev.currentTarget as any;
    const device = picker.device;
    const name = picker.value;

    if (!(device in this._deviceUpdate)) {
      this._deviceUpdate[device] = {};
    }
    this._deviceUpdate[device].name = name;
    this.requestUpdate("_deviceUpdate");
  }

  static get styles(): CSSResultGroup {
    return [
      configFlowContentStyles,
      css`
        .devices {
          display: flex;
          margin: -4px;
          max-height: 600px;
          overflow-y: auto;
          flex-direction: column;
        }
        .device {
          border: 1px solid var(--divider-color);
          padding: 6px;
          border-radius: 4px;
          margin: 4px;
          display: inline-block;
        }
        .device-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .device-info img {
          width: 40px;
          height: 40px;
        }
        .device-info-details {
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .secondary {
          color: var(--secondary-text-color);
        }
        ha-textfield,
        ha-area-picker {
          display: block;
        }
        ha-textfield {
          margin: 8px 0;
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

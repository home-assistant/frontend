import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { ContextSubscriptionController } from "../../common/decorators/consume";
import { fireEvent } from "../../common/dom/fire_event";
import {
  computeDeviceName,
  computeDeviceNameDisplay,
} from "../../common/entity/compute_device_name";
import { computeDomain } from "../../common/entity/compute_domain";
import { navigate } from "../../common/navigate";
import "../../components/ha-area-picker";
import "../../components/input/ha-input";
import type { HaInput } from "../../components/input/ha-input";
import { assistSatelliteSupportsSetupFlow } from "../../data/assist_satellite";
import { getConfigEntries } from "../../data/config_entries";
import type { DataEntryFlowStepCreateEntry } from "../../data/data_entry_flow";
import type { ConfigEntry } from "../../data/config_entries";
import { fullEntitiesContext, manifestsContext } from "../../data/context";
import type { DeviceRegistryEntry } from "../../data/device/device_registry";
import { updateDeviceRegistryEntry } from "../../data/device/device_registry";
import {
  getAutomaticEntityIds,
  updateEntityRegistryEntry,
  type EntityRegistryDisplayEntry,
  type EntityRegistryEntry,
} from "../../data/entity/entity_registry";
import {
  domainToName,
  type DomainManifestLookup,
  type IntegrationManifest,
} from "../../data/integration";
import type { HomeAssistant, ValueChangedEvent } from "../../types";
import { brandsUrl } from "../../util/brands-url";
import { showAlertDialog } from "../generic/show-dialog-box";
import { showVoiceAssistantSetupDialog } from "../voice-assistant-setup/show-voice-assistant-setup-dialog";
import type { FlowConfig } from "./show-dialog-data-entry-flow";
import { configFlowContentStyles } from "./styles";

interface DeviceTarget {
  device: string;
}

/**
 * The entity of a new config entry that can get an area in the success step:
 * the only entity of the entry without a device. Entities with a device take
 * the area of their device, and several entities would need one picker each.
 */
export const getSingleEntityWithoutDevice = (
  entities: EntityRegistryEntry[],
  entryId: string
): EntityRegistryEntry | undefined => {
  const entryEntities = entities.filter(
    (entity) => entity.config_entry_id === entryId && !entity.device_id
  );
  return entryEntities.length === 1 ? entryEntities[0] : undefined;
};

@customElement("step-flow-create-entry")
class StepFlowCreateEntry extends LitElement {
  @property({ attribute: false }) public flowConfig!: FlowConfig;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false })
  public step!: DataEntryFlowStepCreateEntry<ConfigEntry>;

  @property({ attribute: false }) public devices!: DeviceRegistryEntry[];

  @property({ attribute: false }) public manifest?: IntegrationManifest | null;

  private _domains: Record<string, string> = {};

  public navigateToResult = false;

  @state() private _deviceUpdate: Record<
    string,
    { name?: string; area?: string }
  > = {};

  // Area picked for the entity of a new helper, undefined until picked.
  @state() private _entityArea?: string | null;

  @state() private _manifests?: DomainManifestLookup;

  @state() private _entityRegistry?: EntityRegistryEntry[];

  // Subscribed only when a helper entity can get an area, so other flows do
  // not load all manifests or the full entity registry.
  private _manifestsSubscription?: ContextSubscriptionController<DomainManifestLookup>;

  private _entityRegistrySubscription?: ContextSubscriptionController<
    EntityRegistryEntry[]
  >;

  private _singleEntityWithoutDevice = memoizeOne(getSingleEntityWithoutDevice);

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

  protected firstUpdated(changedProps: PropertyValues<this>) {
    super.firstUpdated(changedProps);
    this._loadDomains();
  }

  protected willUpdate(changedProps: PropertyValues<this>) {
    this._subscribeHelperEntity();

    if (!changedProps.has("devices") && !changedProps.has("hass")) {
      return;
    }

    if (
      this.devices.length !== 1 ||
      this.devices[0].primary_config_entry !== this.step.result?.entry_id ||
      this.step.result?.domain === "voip"
    ) {
      return;
    }

    const assistSatellites = this._deviceEntities(
      this.devices[0].id,
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
        deviceId: this.devices[0].id,
      });
    }
  }

  protected render(): TemplateResult {
    const localize = this.hass.localize;
    const domains = this.step.result
      ? {
          ...this._domains,
          [this.step.result.entry_id]: this.step.result.domain,
        }
      : this._domains;
    const helperEntity = this._helperEntity();
    return html`
      <div class="content">
        ${this.flowConfig.renderCreateEntryDescription(this.hass, this.step)}
        ${
          this.step.result?.state === "not_loaded"
            ? html`<span class="error"
                >${localize(
                  "ui.panel.config.integrations.config_flow.not_loaded"
                )}</span
              >`
            : nothing
        }
        ${
          this.devices.length === 0 &&
          ["options_flow", "repair_flow"].includes(this.flowConfig.flowType)
            ? nothing
            : this.devices.length === 0
              ? html`<p>
                    ${localize(
                      "ui.panel.config.integrations.config_flow.created_config",
                      { name: this.step.title }
                    )}
                  </p>
                  ${
                    helperEntity
                      ? html`<ha-area-picker
                          .value=${
                            (this._entityArea === undefined
                              ? helperEntity.area_id
                              : this._entityArea) ?? undefined
                          }
                          @value-changed=${this._entityAreaPicked}
                        ></ha-area-picker>`
                      : nothing
                  }`
              : html`
                  <div class="devices">
                    ${this.devices.map(
                      (device) => html`
                        <div class="device">
                          <div class="device-info">
                            ${
                              device.primary_config_entry &&
                              domains[device.primary_config_entry]
                                ? html`<img
                                    slot="graphic"
                                    alt=${domainToName(
                                      this.hass.localize,
                                      domains[device.primary_config_entry]
                                    )}
                                    src=${brandsUrl(
                                      {
                                        domain:
                                          domains[device.primary_config_entry],
                                        type: "icon",
                                        darkOptimized:
                                          this.hass.themes?.darkMode,
                                      },
                                      this.hass.auth.data.hassUrl
                                    )}
                                    crossorigin="anonymous"
                                    referrerpolicy="no-referrer"
                                  />`
                                : nothing
                            }
                            <div class="device-info-details">
                              <span
                                >${device.model || device.manufacturer}</span
                              >
                              ${
                                device.model
                                  ? html`<span class="secondary">
                                      ${device.manufacturer}
                                    </span>`
                                  : nothing
                              }
                            </div>
                          </div>
                          <ha-input
                            .label=${localize(
                              "ui.panel.config.integrations.config_flow.device_name"
                            )}
                            .placeholder=${computeDeviceNameDisplay(device, this.hass.localize)}
                            .value=${
                              this._deviceUpdate[device.id]?.name ??
                              computeDeviceName(device)
                            }
                            @change=${this._deviceNameChanged}
                            .device=${device.id}
                          ></ha-input>
                          <ha-area-picker
                            .device=${device.id}
                            .value=${
                              this._deviceUpdate[device.id]?.area ??
                              device.area_id ??
                              undefined
                            }
                            @value-changed=${this._areaPicked}
                          ></ha-area-picker>
                        </div>
                      `
                    )}
                  </div>
                `
        }
      </div>
    `;
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (changedProps.has("_deviceUpdate") || changedProps.has("_entityArea")) {
      fireEvent(this, "flow-step-footer-state-changed", {
        hasPendingUpdates:
          Object.keys(this._deviceUpdate).length > 0 ||
          this._entityArea !== undefined,
      });
    }
  }

  private _mayHaveHelperEntity(): boolean {
    return (
      this.flowConfig.flowType === "config_flow" && this.devices.length === 0
    );
  }

  private _isHelperEntry(domain: string): boolean {
    const manifest =
      this.manifest?.domain === domain
        ? this.manifest
        : this._manifests?.[domain];
    return manifest?.integration_type === "helper";
  }

  private _helperEntity(): EntityRegistryEntry | undefined {
    const entry = this.step.result;
    if (
      !entry ||
      !this._entityRegistry ||
      !this._mayHaveHelperEntity() ||
      !this._isHelperEntry(entry.domain)
    ) {
      return undefined;
    }
    return this._singleEntityWithoutDevice(
      this._entityRegistry,
      entry.entry_id
    );
  }

  private _subscribeHelperEntity(): void {
    const entry = this.step.result;
    if (!entry || !this._mayHaveHelperEntity()) {
      return;
    }
    if (
      this.manifest?.domain !== entry.domain &&
      !this._manifestsSubscription
    ) {
      // A chained flow is opened without the manifest of its integration.
      this._manifestsSubscription = new ContextSubscriptionController(
        this,
        manifestsContext,
        (manifests) => {
          this._manifests = manifests;
        }
      );
    }
    if (
      this._isHelperEntry(entry.domain) &&
      !this._entityRegistrySubscription
    ) {
      this._entityRegistrySubscription = new ContextSubscriptionController(
        this,
        fullEntitiesContext,
        (entities) => {
          this._entityRegistry = entities;
        }
      );
    }
  }

  private async _loadDomains() {
    const entries = await getConfigEntries(this.hass);
    this._domains = Object.fromEntries(
      entries.map((entry) => [entry.entry_id, entry.domain])
    );
  }

  private async _flowDone(): Promise<void> {
    if (Object.keys(this._deviceUpdate).length) {
      const deviceUpdates = Object.entries(this._deviceUpdate).map(
        ([deviceId, update]) =>
          updateDeviceRegistryEntry(this.hass, deviceId, {
            name_by_user: update.name,
            area_id: update.area,
          }).catch((err: unknown) => {
            const message =
              err instanceof Error ? err.message : "Unknown error";
            showAlertDialog(this, {
              text: this.hass.localize(
                "ui.panel.config.integrations.config_flow.error_saving_device",
                { error: message }
              ),
            });
          })
      );
      await Promise.allSettled(deviceUpdates);

      // Entity IDs include the device's name and, depending on the user's
      // entity ID format, its area, so regenerate them for every device
      // whose name or area was edited.
      const entityUpdates: Promise<unknown>[] = [];
      const entityIds: string[] = [];
      Object.keys(this._deviceUpdate).forEach((deviceId) => {
        const entities = this._deviceEntities(
          deviceId,
          Object.values(this.hass.entities)
        );
        entityIds.push(...entities.map((entity) => entity.entity_id));
      });

      const entityIdsMapping = await getAutomaticEntityIds(
        this.hass,
        entityIds
      );

      Object.entries(entityIdsMapping).forEach(([oldEntityId, newEntityId]) => {
        if (newEntityId) {
          entityUpdates.push(
            updateEntityRegistryEntry(this.hass, oldEntityId, {
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
      await Promise.allSettled(entityUpdates);
    }

    const helperEntity = this._helperEntity();
    if (helperEntity && this._entityArea !== undefined) {
      await this._saveEntityArea(helperEntity.entity_id, this._entityArea);
    }

    fireEvent(this, "flow-update", { step: undefined });
    if (this.step.result && this.navigateToResult) {
      if (this.devices.length === 1) {
        navigate(`/config/devices/device/${this.devices[0].id}`);
      } else {
        navigate(
          `/config/integrations/integration/${this.step.result.domain}#config_entry=${this.step.result.entry_id}`
        );
      }
    }
  }

  private async _saveEntityArea(
    entityId: string,
    areaId: string | null
  ): Promise<void> {
    try {
      await updateEntityRegistryEntry(this.hass, entityId, {
        area_id: areaId,
      });
      // Depending on the user's entity ID format, the entity ID includes the
      // area, so regenerate it like for the entities of a device.
      const entityIdsMapping = await getAutomaticEntityIds(this.hass, [
        entityId,
      ]);
      const newEntityId = entityIdsMapping[entityId];
      if (newEntityId) {
        await updateEntityRegistryEntry(this.hass, entityId, {
          new_entity_id: newEntityId,
        });
      }
    } catch (err: unknown) {
      // WebSocket errors are plain objects with a message, not Error instances.
      showAlertDialog(this, {
        text: this.hass.localize(
          "ui.panel.config.integrations.config_flow.error_saving_entity",
          {
            error:
              (err as { message?: string } | undefined)?.message ??
              "Unknown error",
          }
        ),
      });
    }
  }

  public finish(): Promise<void> {
    return this._flowDone();
  }

  private _entityAreaPicked(ev: ValueChangedEvent<string | undefined>): void {
    this._entityArea = ev.detail.value || null;
  }

  private async _areaPicked(ev: ValueChangedEvent<string>) {
    const picker = ev.currentTarget as DeviceTarget | null;
    if (!picker) {
      return;
    }
    const device = picker.device;
    const area = ev.detail.value;

    if (!(device in this._deviceUpdate)) {
      this._deviceUpdate[device] = {};
    }
    this._deviceUpdate[device].area = area;
    this.requestUpdate("_deviceUpdate");
  }

  private _deviceNameChanged(ev: InputEvent): void {
    const picker = ev.currentTarget as (HaInput & DeviceTarget) | null;
    if (!picker) {
      return;
    }
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
          gap: var(--ha-space-2);
          flex-direction: column;
        }
        .device {
          border: 1px solid var(--divider-color);
          padding: 6px;
          border-radius: var(--ha-border-radius-sm);
          display: inline-block;
        }
        .device-info {
          display: flex;
          align-items: center;
          gap: var(--ha-space-2);
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
        ha-area-picker {
          display: block;
        }
        ha-input {
          margin: var(--ha-space-2) 0;
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

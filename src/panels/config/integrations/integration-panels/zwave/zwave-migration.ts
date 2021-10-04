import "@material/mwc-button/mwc-button";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../../../../common/config/is_component_loaded";
import { computeStateName } from "../../../../../common/entity/compute_state_name";
import "../../../../../components/buttons/ha-call-api-button";
import "../../../../../components/buttons/ha-call-service-button";
import "../../../../../components/ha-card";
import "../../../../../components/ha-circular-progress";
import "../../../../../components/ha-icon";
import "../../../../../components/ha-icon-button";
import {
  computeDeviceName,
  DeviceRegistryEntry,
  fetchDeviceRegistry,
  subscribeDeviceRegistry,
} from "../../../../../data/device_registry";
import {
  migrateZwave,
  ZWaveJsMigrationData,
  fetchNetworkStatus as fetchZwaveJsNetworkStatus,
  fetchNodeStatus,
  getIdentifiersFromDevice,
  subscribeNodeReady,
} from "../../../../../data/zwave_js";
import {
  fetchMigrationConfig,
  startZwaveJsConfigFlow,
  ZWaveMigrationConfig,
  ZWaveNetworkStatus,
  ZWAVE_NETWORK_STATE_STOPPED,
  fetchNetworkStatus,
} from "../../../../../data/zwave";
import { showConfigFlowDialog } from "../../../../../dialogs/config-flow/show-dialog-config-flow";
import { showAlertDialog } from "../../../../../dialogs/generic/show-dialog-box";
import "../../../../../layouts/hass-subpage";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";
import "../../../ha-config-section";
import { computeStateDomain } from "../../../../../common/entity/compute_state_domain";
import "../../../../../components/ha-alert";

@customElement("zwave-migration")
export class ZwaveMigration extends LitElement {
  @property({ type: Object }) public hass!: HomeAssistant;

  @property({ type: Object }) public route!: Route;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ type: Boolean }) public isWide!: boolean;

  @state() private _networkStatus?: ZWaveNetworkStatus;

  @state() private _step = 0;

  @state() private _stoppingNetwork = false;

  @state() private _migrationConfig?: ZWaveMigrationConfig;

  @state() private _migrationData?: ZWaveJsMigrationData;

  @state() private _migratedZwaveEntities?: string[];

  @state() private _deviceNameLookup: { [id: string]: string } = {};

  @state() private _waitingOnDevices?: DeviceRegistryEntry[];

  private _zwaveJsEntryId?: string;

  private _nodeReadySubscriptions?: Promise<UnsubscribeFunc>[];

  private _unsub?: Promise<UnsubscribeFunc>;

  private _unsubDevices?: UnsubscribeFunc;

  public disconnectedCallback(): void {
    this._unsubscribe();
    if (this._unsubDevices) {
      this._unsubDevices();
      this._unsubDevices = undefined;
    }
  }

  protected render(): TemplateResult {
    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        back-path="/config/zwave"
      >
        <ha-config-section .narrow=${this.narrow} .isWide=${this.isWide}>
          <div slot="header">
            ${this.hass.localize(
              "ui.panel.config.zwave.migration.zwave_js.header"
            )}
          </div>

          <div slot="introduction">
            ${this.hass.localize(
              "ui.panel.config.zwave.migration.zwave_js.introduction"
            )}
          </div>
          ${html`
            ${this._step === 0
              ? html`
                  <ha-card class="content" header="Introduction">
                    <div class="card-content">
                      <p>
                        This wizard will walk through the following steps to
                        migrate from the legacy Z-Wave integration to Z-Wave JS.
                      </p>
                      <ol>
                        <li>Stop the Z-Wave network</li>
                        ${!isComponentLoaded(this.hass, "hassio")
                          ? html`<li>Configure and start Z-Wave JS</li>`
                          : ""}
                        <li>Set up the Z-Wave JS integration</li>
                        <li>
                          Migrate entities and devices to the new integration
                        </li>
                        <li>Remove legacy Z-Wave integration</li>
                      </ol>
                      <p>
                        <b>
                          ${isComponentLoaded(this.hass, "hassio")
                            ? html`Please
                                <a href="/hassio/backups">make a backup</a>
                                before proceeding.`
                            : "Please make a backup of your installation before proceeding."}
                        </b>
                      </p>
                    </div>
                    <div class="card-actions">
                      <mwc-button @click=${this._continue}>
                        Continue
                      </mwc-button>
                    </div>
                  </ha-card>
                `
              : this._step === 1
              ? html`
                  <ha-card class="content" header="Stop Z-Wave Network">
                    <div class="card-content">
                      <p>
                        We need to stop the Z-Wave network to perform the
                        migration. Home Assistant will not be able to control
                        Z-Wave devices while the network is stopped.
                      </p>
                      ${Object.values(this.hass.states)
                        .filter(
                          (entityState) =>
                            computeStateDomain(entityState) === "zwave" &&
                            entityState.state !== "ready"
                        )
                        .map(
                          (entityState) =>
                            html`<ha-alert alert-type="warning">
                              Device ${computeStateName(entityState)}
                              (${entityState.entity_id}) is not ready yet! For
                              the best result, wake the device up if it is
                              battery powered and wait for this device to become
                              ready.
                            </ha-alert>`
                        )}
                      ${this._stoppingNetwork
                        ? html`
                            <div class="flex-container">
                              <ha-circular-progress
                                active
                              ></ha-circular-progress>
                              <div><p>Stopping Z-Wave Network...</p></div>
                            </div>
                          `
                        : ``}
                    </div>
                    <div class="card-actions">
                      <mwc-button @click=${this._stopNetwork}>
                        Stop Network
                      </mwc-button>
                    </div>
                  </ha-card>
                `
              : this._step === 2
              ? html`
                  <ha-card class="content" header="Set up Z-Wave JS">
                    <div class="card-content">
                      <p>Now it's time to set up the Z-Wave JS integration.</p>
                      ${isComponentLoaded(this.hass, "hassio")
                        ? html`
                            <p>
                              Z-Wave JS runs as a Home Assistant add-on that
                              will be setup next. Make sure to check the
                              checkbox to use the add-on.
                            </p>
                          `
                        : html`
                            <p>
                              You are not running Home Assistant OS (the default
                              installation type) or Home Assistant Supervised,
                              so we can not setup Z-Wave JS automaticaly. Follow
                              the
                              <a
                                href="https://www.home-assistant.io/integrations/zwave_js/#advanced-installation-instructions"
                                target="_blank"
                                rel="noreferrer"
                                >advanced installation instructions</a
                              >
                              to install Z-Wave JS.
                            </p>
                            <p>
                              Here's the current Z-Wave configuration. You'll
                              need these values when setting up Z-Wave JS.
                            </p>
                            ${this._migrationConfig
                              ? html`<blockquote>
                                  USB Path: ${this._migrationConfig.usb_path}<br />
                                  Network Key:
                                  ${this._migrationConfig.network_key}
                                </blockquote>`
                              : ``}
                            <p>
                              Once Z-Wave JS is installed and running, click
                              'Continue' to set up the Z-Wave JS integration and
                              migrate your devices and entities.
                            </p>
                          `}
                    </div>
                    <div class="card-actions">
                      <mwc-button @click=${this._setupZwaveJs}>
                        Continue
                      </mwc-button>
                    </div>
                  </ha-card>
                `
              : this._step === 3
              ? html`
                  <ha-card
                    class="content"
                    header="Migrate devices and entities"
                  >
                    <div class="card-content">
                      <p>
                        Now it's time to migrate your devices and entities from
                        the legacy Z-Wave integration to the Z-Wave JS
                        integration, to make sure all your UI's and automations
                        keep working.
                      </p>
                      ${this._waitingOnDevices?.map(
                        (device) =>
                          html`<ha-alert alert-type="warning">
                            Device ${computeDeviceName(device, this.hass)} is
                            not ready yet! For the best result, wake the device
                            up if it is battery powered and wait for this device
                            to become ready.
                          </ha-alert>`
                      )}
                      ${this._migrationData
                        ? html`
                            <p>Below is a list of what will be migrated.</p>
                            ${this._migratedZwaveEntities!.length !==
                            this._migrationData.zwave_entity_ids.length
                              ? html`<ha-alert
                                    alert-type="warning"
                                    title="Not all entities can be migrated!"
                                  >
                                    The following entities will not be migrated
                                    and might need manual adjustments to your
                                    config:
                                  </ha-alert>
                                  <ul>
                                    ${this._migrationData.zwave_entity_ids.map(
                                      (entity_id) =>
                                        !this._migratedZwaveEntities!.includes(
                                          entity_id
                                        )
                                          ? html`<li>
                                              ${entity_id in this.hass.states
                                                ? computeStateName(
                                                    this.hass.states[entity_id]
                                                  )
                                                : ""}
                                              (${entity_id})
                                            </li>`
                                          : ""
                                    )}
                                  </ul>`
                              : ""}
                            ${Object.keys(
                              this._migrationData.migration_device_map
                            ).length
                              ? html`<h3>Devices that will be migrated:</h3>
                                  <ul>
                                    ${Object.keys(
                                      this._migrationData.migration_device_map
                                    ).map(
                                      (device_id) =>
                                        html`<li>
                                          ${this._deviceNameLookup[device_id] ||
                                          device_id}
                                        </li>`
                                    )}
                                  </ul>`
                              : ""}
                            ${Object.keys(
                              this._migrationData.migration_entity_map
                            ).length
                              ? html`<h3>Entities that will be migrated:</h3>
                                  <ul>
                                    ${Object.keys(
                                      this._migrationData.migration_entity_map
                                    ).map(
                                      (entity_id) => html`<li>
                                        ${entity_id in this.hass.states
                                          ? computeStateName(
                                              this.hass.states[entity_id]
                                            )
                                          : ""}
                                        (${entity_id})
                                      </li>`
                                    )}
                                  </ul>`
                              : ""}
                          `
                        : html` <div class="flex-container">
                            <p>Loading migration data...</p>
                            <ha-circular-progress active>
                            </ha-circular-progress>
                          </div>`}
                    </div>
                    <div class="card-actions">
                      <mwc-button @click=${this._doMigrate}>
                        Migrate
                      </mwc-button>
                    </div>
                  </ha-card>
                `
              : this._step === 4
              ? html`<ha-card class="content" header="Done!">
                  <div class="card-content">
                    That was all! You are now migrated to the new Z-Wave JS
                    integration, check if all your devices and entities are back
                    the way they where, if not all entities could be migrated
                    you might have to change those manually.
                    <p>
                      If you have 'zwave' in your configurtion.yaml file, you
                      should remove it now.
                    </p>
                  </div>
                  <div class="card-actions">
                    <a
                      href=${`/config/zwave_js?config_entry=${this._zwaveJsEntryId}`}
                    >
                      <mwc-button> Go to Z-Wave JS config panel </mwc-button>
                    </a>
                  </div>
                </ha-card>`
              : ""}
          `}
        </ha-config-section>
      </hass-subpage>
    `;
  }

  private async _getMigrationConfig(): Promise<void> {
    this._migrationConfig = await fetchMigrationConfig(this.hass!);
  }

  private async _unsubscribe(): Promise<void> {
    if (this._unsub) {
      (await this._unsub)();
      this._unsub = undefined;
    }
  }

  private _continue(): void {
    this._step++;
  }

  private async _stopNetwork(): Promise<void> {
    this._stoppingNetwork = true;
    await this._getNetworkStatus();
    if (this._networkStatus?.state === ZWAVE_NETWORK_STATE_STOPPED) {
      this._networkStopped();
      return;
    }

    this._unsub = this.hass!.connection.subscribeEvents(
      () => this._networkStopped(),
      "zwave.network_stop"
    );
    this.hass!.callService("zwave", "stop_network");
  }

  private async _setupZwaveJs() {
    const zwaveJsConfigFlow = await startZwaveJsConfigFlow(this.hass);
    showConfigFlowDialog(this, {
      continueFlowId: zwaveJsConfigFlow.flow_id,
      dialogClosedCallback: (params) => {
        if (params.entryId) {
          this._zwaveJsEntryId = params.entryId;
          this._getZwaveJSNodesStatus();
          this._step = 3;
        }
      },
      showAdvanced: this.hass.userData?.showAdvanced,
    });
    this.hass.loadBackendTranslation("title", "zwave_js", true);
  }

  private async _getZwaveJSNodesStatus() {
    if (this._nodeReadySubscriptions?.length) {
      const unsubs = await Promise.all(this._nodeReadySubscriptions);
      unsubs.forEach((unsub) => {
        unsub();
      });
    }
    this._nodeReadySubscriptions = [];
    const networkStatus = await fetchZwaveJsNetworkStatus(
      this.hass,
      this._zwaveJsEntryId!
    );
    const nodeStatePromisses = networkStatus.controller.nodes.map((nodeId) =>
      fetchNodeStatus(this.hass, this._zwaveJsEntryId!, nodeId)
    );
    const nodesNotReady = (await Promise.all(nodeStatePromisses)).filter(
      (node) => !node.ready
    );
    this._getMigrationData();
    if (nodesNotReady.length === 0) {
      this._waitingOnDevices = [];
      return;
    }
    this._nodeReadySubscriptions = nodesNotReady.map((node) =>
      subscribeNodeReady(this.hass, this._zwaveJsEntryId!, node.node_id, () => {
        this._getZwaveJSNodesStatus();
      })
    );
    const deviceReg = await fetchDeviceRegistry(this.hass);
    this._waitingOnDevices = deviceReg
      .map((device) => getIdentifiersFromDevice(device))
      .filter(Boolean);
  }

  private async _getMigrationData() {
    try {
      this._migrationData = await migrateZwave(
        this.hass,
        this._zwaveJsEntryId!,
        true
      );
    } catch (err: any) {
      showAlertDialog(this, {
        title: "Failed to get migration data!",
        text:
          err.code === "unknown_command"
            ? "Restart Home Assistant and try again."
            : err.message,
      });
      return;
    }
    this._migratedZwaveEntities = Object.keys(
      this._migrationData.migration_entity_map
    );
    if (Object.keys(this._migrationData.migration_device_map).length) {
      this._fetchDevices();
    }
  }

  private _fetchDevices() {
    this._unsubDevices = subscribeDeviceRegistry(
      this.hass.connection,
      (devices) => {
        if (!this._migrationData) {
          return;
        }
        const migrationDevices = Object.keys(
          this._migrationData.migration_device_map
        );
        const deviceNameLookup = {};
        devices.forEach((device) => {
          if (migrationDevices.includes(device.id)) {
            deviceNameLookup[device.id] = computeDeviceName(device, this.hass);
          }
        });
        this._deviceNameLookup = deviceNameLookup;
      }
    );
  }

  private async _doMigrate() {
    const data = await migrateZwave(this.hass, this._zwaveJsEntryId!, false);
    if (!data.migrated) {
      showAlertDialog(this, { title: "Migration failed!" });
      return;
    }
    this._step = 4;
  }

  private _networkStopped(): void {
    this._unsubscribe();
    this._getMigrationConfig();
    this._stoppingNetwork = false;
    this._step = 2;
  }

  private async _getNetworkStatus(): Promise<void> {
    this._networkStatus = await fetchNetworkStatus(this.hass!);
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .content {
          margin-top: 24px;
        }

        .flex-container {
          display: flex;
          align-items: center;
        }

        .flex-container ha-circular-progress {
          margin-right: 20px;
        }

        blockquote {
          display: block;
          background-color: var(--secondary-background-color);
          color: var(--primary-text-color);
          padding: 8px;
          margin: 8px 0;
          font-size: 0.9em;
          font-family: monospace;
        }

        ha-card {
          margin: 0 auto;
          max-width: 600px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zwave-migration": ZwaveMigration;
  }
}

import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import "@material/mwc-button/mwc-button";
import "../../../../../components/ha-icon-button";
import "../../../../../components/ha-circular-progress";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  internalProperty,
  TemplateResult,
} from "lit-element";
import "../../../../../components/buttons/ha-call-api-button";
import "../../../../../components/buttons/ha-call-service-button";
import "../../../../../components/ha-card";
import "../../../../../components/ha-icon";
import {
  fetchNetworkStatus,
  ZWaveNetworkStatus,
  ZWAVE_NETWORK_STATE_STOPPED,
  fetchMigrationConfig,
  ZWaveMigrationConfig,
  startOzwConfigFlow,
} from "../../../../../data/zwave";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";
import "../../../ha-config-section";
import "../../../../../layouts/hass-subpage";
import { showConfigFlowDialog } from "../../../../../dialogs/config-flow/show-dialog-config-flow";
import { migrateZwave, OZWMigrationData } from "../../../../../data/ozw";
import { navigate } from "../../../../../common/navigate";
import { showAlertDialog } from "../../../../../dialogs/generic/show-dialog-box";
import { computeStateName } from "../../../../../common/entity/compute_state_name";
import {
  computeDeviceName,
  subscribeDeviceRegistry,
} from "../../../../../data/device_registry";
import { isComponentLoaded } from "../../../../../common/config/is_component_loaded";

@customElement("zwave-migration")
export class ZwaveMigration extends LitElement {
  @property({ type: Object }) public hass!: HomeAssistant;

  @property({ type: Object }) public route!: Route;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ type: Boolean }) public isWide!: boolean;

  @internalProperty() private _networkStatus?: ZWaveNetworkStatus;

  @internalProperty() private _step = 0;

  @internalProperty() private _stoppingNetwork = false;

  @internalProperty() private _migrationConfig?: ZWaveMigrationConfig;

  @internalProperty() private _migrationData?: OZWMigrationData;

  @internalProperty() private _migratedZwaveEntities?: string[];

  @internalProperty() private _deviceNameLookup: { [id: string]: string } = {};

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
            ${this.hass.localize("ui.panel.config.zwave.migration.ozw.header")}
          </div>

          <div slot="introduction">
            ${this.hass.localize(
              "ui.panel.config.zwave.migration.ozw.introduction"
            )}
          </div>
          ${!isComponentLoaded(this.hass, "hassio") &&
          !isComponentLoaded(this.hass, "mqtt")
            ? html`
                <ha-card class="content" header="MQTT Required">
                  <div class="card-content">
                    <p>
                      OpenZWave requires MQTT. Please setup an MQTT broker and
                      the MQTT integration to proceed with the migration.
                    </p>
                  </div>
                </ha-card>
              `
            : html`
                ${this._step === 0
                  ? html`
                      <ha-card class="content" header="Introduction">
                        <div class="card-content">
                          <p>
                            This wizard will walk through the following steps to
                            migrate from the legacy Z-Wave integration to
                            OpenZWave.
                          </p>
                          <ol>
                            <li>Stop the Z-Wave network</li>
                            <li>
                              <i
                                >If running Home Assistant Core in Docker or in
                                Python venv:</i
                              >
                              Configure and start OZWDaemon
                            </li>
                            <li>Set up the OpenZWave integration</li>
                            <li>
                              Migrate entities and devices to the new
                              integration
                            </li>
                            <li>Remove legacy Z-Wave integration</li>
                          </ol>
                          <p>
                            <b>
                              Please take a backup or a snapshot of your
                              environment before proceeding.
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
                  : ``}
                ${this._step === 1
                  ? html`
                      <ha-card class="content" header="Stop Z-Wave Network">
                        <div class="card-content">
                          <p>
                            We need to stop the Z-Wave network to perform the
                            migration. Home Assistant will not be able to
                            control Z-Wave devices while the network is stopped.
                          </p>
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
                  : ``}
                ${this._step === 2
                  ? html`
                      <ha-card class="content" header="Set up OZWDaemon">
                        <div class="card-content">
                          <p>
                            Now it's time to set up the OZW integration.
                          </p>
                          ${isComponentLoaded(this.hass, "hassio")
                            ? html`
                                <p>
                                  The OZWDaemon runs in a Home Assistant addon
                                  that will be setup next. Make sure to check
                                  the checkbox for the addon.
                                </p>
                              `
                            : html`
                                <p>
                                  If you're using Home Assistant Core in Docker
                                  or a Python venv, see the
                                  <a
                                    href="https://github.com/OpenZWave/qt-openzwave/blob/master/README.md"
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    OZWDaemon readme
                                  </a>
                                  for setup instructions.
                                </p>
                                <p>
                                  Here's the current Z-Wave configuration.
                                  You'll need these values when setting up OZW
                                  daemon.
                                </p>
                                ${this._migrationConfig
                                  ? html` <blockquote>
                                      USB Path:
                                      ${this._migrationConfig.usb_path}<br />
                                      Network Key:
                                      ${this._migrationConfig.network_key}
                                    </blockquote>`
                                  : ``}
                                <p>
                                  Once OZWDaemon is installed, running, and
                                  connected to the MQTT broker click Continue to
                                  set up the OpenZWave integration and migrate
                                  your devices and entities.
                                </p>
                              `}
                        </div>
                        <div class="card-actions">
                          <mwc-button @click=${this._setupOzw}>
                            Continue
                          </mwc-button>
                        </div>
                      </ha-card>
                    `
                  : ``}
                ${this._step === 3
                  ? html`
                      <ha-card
                        class="content"
                        header="Migrate devices and entities"
                      >
                        <div class="card-content">
                          <p>
                            Now it's time to migrate your devices and entities
                            from the legacy Z-Wave integration to the OZW
                            integration, to make sure all your UI and
                            automations keep working.
                          </p>
                          ${this._migrationData
                            ? html`
                                <p>Below is a list of what will be migrated.</p>
                                ${this._migratedZwaveEntities!.length !==
                                this._migrationData.zwave_entity_ids.length
                                  ? html`<h3 class="warning">
                                        Not all entities can be migrated! The
                                        following entities will not be migrated
                                        and might need manual adjustments to
                                        your config:
                                      </h3>
                                      <ul>
                                        ${this._migrationData.zwave_entity_ids.map(
                                          (entity_id) =>
                                            !this._migratedZwaveEntities!.includes(
                                              entity_id
                                            )
                                              ? html`<li>
                                                  ${computeStateName(
                                                    this.hass.states[entity_id]
                                                  )}
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
                                          this._migrationData
                                            .migration_device_map
                                        ).map(
                                          (device_id) =>
                                            html`<li>
                                              ${this._deviceNameLookup[
                                                device_id
                                              ] || device_id}
                                            </li>`
                                        )}
                                      </ul>`
                                  : ""}
                                ${Object.keys(
                                  this._migrationData.migration_entity_map
                                ).length
                                  ? html`<h3>
                                        Entities that will be migrated:
                                      </h3>
                                      <ul>
                                        ${Object.keys(
                                          this._migrationData
                                            .migration_entity_map
                                        ).map(
                                          (entity_id) => html`<li>
                                            ${computeStateName(
                                              this.hass.states[entity_id]
                                            )}
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
                  : ``}
                ${this._step === 4
                  ? html`<ha-card class="content" header="Done!">
                      <div class="card-content">
                        That was all! You are now migrated to the new OZW
                        integration, check if all your devices and entities are
                        back the way they where, if not all entities could be
                        migrated you might have to change those manually.
                      </div>
                      <div class="card-actions">
                        <mwc-button @click=${this._navigateOzw}>
                          Go to OZW config panel
                        </mwc-button>
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

  private async _setupOzw() {
    const ozwConfigFlow = await startOzwConfigFlow(this.hass);
    if (isComponentLoaded(this.hass, "ozw")) {
      this._getMigrationData();
      this._step = 3;
      return;
    }
    showConfigFlowDialog(this, {
      continueFlowId: ozwConfigFlow.flow_id,
      dialogClosedCallback: () => {
        if (isComponentLoaded(this.hass, "ozw")) {
          this._getMigrationData();
          this._step = 3;
        }
      },
      showAdvanced: this.hass.userData?.showAdvanced,
    });
    this.hass.loadBackendTranslation("title", "ozw", true);
  }

  private async _getMigrationData() {
    try {
      this._migrationData = await migrateZwave(this.hass, true);
    } catch (err) {
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
    const data = await migrateZwave(this.hass, false);
    if (!data.migrated) {
      showAlertDialog(this, { title: "Migration failed!" });
      return;
    }
    this._step = 4;
  }

  private _navigateOzw() {
    navigate(this, "/config/ozw");
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

  static get styles(): CSSResult[] {
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

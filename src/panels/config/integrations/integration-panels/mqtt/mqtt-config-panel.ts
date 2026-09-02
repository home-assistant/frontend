import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import {
  mdiAlertCircleOutline,
  mdiCheck,
  mdiDevices,
  mdiShape,
  mdiTune,
} from "@mdi/js";
import { storage } from "../../../../../common/decorators/storage";
import "../../../../../components/ha-button";
import "../../../../../components/ha-card";
import "../../../../../components/ha-code-editor";
import "../../../../../components/ha-formfield";
import "../../../../../components/ha-icon-next";
import "../../../../../components/ha-md-list";
import "../../../../../components/ha-md-list-item";
import "../../../../../components/ha-svg-icon";
import type { HaSelectSelectEvent } from "../../../../../components/ha-select";
import "../../../../../components/ha-switch";
import "../../../../../components/input/ha-input";
import type { ConfigEntry } from "../../../../../data/config_entries";
import { getConfigEntries } from "../../../../../data/config_entries";
import type { Action } from "../../../../../data/script";
import { callExecuteScript } from "../../../../../data/service";
import { showOptionsFlowDialog } from "../../../../../dialogs/config-flow/show-dialog-options-flow";
import "../../../../../layouts/hass-subpage";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import { showToast } from "../../../../../util/toast";
import "./mqtt-subscribe-card";
import { brandsUrl } from "../../../../../util/brands-url";
import { showConfigFlowDialog } from "../../../../../dialogs/config-flow/show-dialog-config-flow";
import { fetchIntegrationManifest } from "../../../../../data/integration";
import { mdiMqttLogo } from "../../../../../resources/mqtt-logo-svg";

const qosLevel = ["0", "1", "2"];

@customElement("mqtt-config-panel")
export class MQTTConfigPanel extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @state()
  @storage({
    key: "panel-dev-mqtt-topic-ls",
    state: true,
    subscribe: false,
  })
  private _topic = "";

  @state()
  @storage({
    key: "panel-dev-mqtt-payload-ls",
    state: true,
    subscribe: false,
  })
  private _payload = "";

  @state()
  @storage({
    key: "panel-dev-mqtt-qos-ls",
    state: true,
    subscribe: false,
  })
  private _qos = "0";

  @state()
  @storage({
    key: "panel-dev-mqtt-retain-ls",
    state: true,
    subscribe: false,
  })
  private _retain = false;

  @state() private _configEntry?: ConfigEntry;

  protected firstUpdated(changedProperties: PropertyValues<this>) {
    super.firstUpdated(changedProperties);
    if (this.hass) {
      this._fetchConfigEntry();
    }
  }

  private _MQTTDeviceIds = memoizeOne(
    (
      devices: HomeAssistant["devices"],
      configEntryId?: string
    ): Set<string> => {
      if (!configEntryId) {
        return new Set();
      }
      return new Set(
        Object.values(devices)
          .filter((device) => device.config_entries.includes(configEntryId))
          .map((device) => device.id)
      );
    }
  );

  private _entityCount = memoizeOne(
    (entities: HomeAssistant["entities"], deviceIds: Set<string>): number =>
      Object.values(entities).filter(
        (entity) => entity.device_id && deviceIds.has(entity.device_id)
      ).length
  );

  protected render(): TemplateResult | typeof nothing {
    if (!this._configEntry) {
      return nothing;
    }
    const isOnline = this._configEntry.state === "loaded";
    const deviceIds = this._MQTTDeviceIds(
      this.hass.devices,
      this._configEntry.entry_id
    );
    const entityCount = this._entityCount(this.hass.entities, deviceIds);

    return html`
      <hass-subpage
        .narrow=${this.narrow}
        .hass=${this.hass}
        header="MQTT"
        back-path="/config/integrations/integration/mqtt"
        has-fab
      >
        <div class="content">
          <div class="container">
            ${this._renderNetworkStatus(isOnline, deviceIds.size)}
            ${this._renderMyNetworkCard(deviceIds.size, entityCount)}
            ${this._renderNavigationCard()} ${this._renderPublishCard()}
            <mqtt-subscribe-card .hass=${this.hass}></mqtt-subscribe-card>
          </div>
        </div>
      </hass-subpage>
    `;
  }

  private _renderNetworkStatus(isOnline: boolean, deviceCount: number) {
    return html`
      <ha-card class="content network-status">
        <div class="card-content">
          <div class="heading">
            <div class="icon ${isOnline ? "success" : "error"}">
              <ha-svg-icon
                .path=${isOnline ? mdiCheck : mdiAlertCircleOutline}
              ></ha-svg-icon>
            </div>
            <div class="details">
              ${this.hass.localize(
                `ui.panel.config.mqtt.status_${isOnline ? "online" : "offline"}`
              )}<br />
              <small>
                ${this.hass.localize("ui.panel.config.mqtt.devices", {
                  count: deviceCount,
                })}
              </small>
            </div>
            <img
              class="logo"
              alt="MQTT"
              crossorigin="anonymous"
              referrerpolicy="no-referrer"
              src=${brandsUrl(
                {
                  domain: "mqtt",
                  type: "icon",
                  darkOptimized: this.hass.themes?.darkMode,
                },
                this.hass.auth.data.hassUrl
              )}
            />
          </div>
        </div>
      </ha-card>
    `;
  }

  private _renderMyNetworkCard(deviceCount: number, entityCount: number) {
    return html`
      <ha-card class="nav-card">
        <div class="card-header">
          ${this.hass.localize("ui.panel.config.mqtt.my_network_title")}
        </div>
        <div class="card-content">
          <ha-md-list>
            <ha-md-list-item
              type="link"
              href=${`/config/devices/dashboard?historyBack=1&config_entry=${this._configEntry?.entry_id}`}
            >
              <ha-svg-icon slot="start" .path=${mdiDevices}></ha-svg-icon>
              <div slot="headline">
                ${this.hass.localize("ui.panel.config.mqtt.device_count", {
                  count: deviceCount,
                })}
              </div>
              <ha-icon-next slot="end"></ha-icon-next>
            </ha-md-list-item>
            <ha-md-list-item
              type="link"
              href=${`/config/entities/dashboard?historyBack=1&config_entry=${this._configEntry?.entry_id}`}
            >
              <ha-svg-icon slot="start" .path=${mdiShape}></ha-svg-icon>
              <div slot="headline">
                ${this.hass.localize("ui.panel.config.mqtt.entity_count", {
                  count: entityCount,
                })}
              </div>
              <ha-icon-next slot="end"></ha-icon-next>
            </ha-md-list-item>
          </ha-md-list>
        </div>
      </ha-card>
    `;
  }

  private _renderNavigationCard() {
    return html`
      <ha-card class="nav-card">
        <div class="card-content">
          <ha-md-list>
            <ha-md-list-item type="link" @click=${this._openOptionFlow}>
              <ha-svg-icon slot="start" .path=${mdiTune}></ha-svg-icon>
              <div slot="headline">
                ${this.hass.localize("ui.panel.config.mqtt.option_flow")}
              </div>
              <div slot="supporting-text">
                ${this.hass.localize(
                  "ui.panel.config.mqtt.option_flow_description"
                )}
              </div>
              <ha-icon-next slot="end"></ha-icon-next>
            </ha-md-list-item>
            <ha-md-list-item type="link" @click=${this._openConfigFlow}>
              <ha-svg-icon slot="start" .path=${mdiMqttLogo}></ha-svg-icon>
              <div slot="headline">
                ${this.hass.localize("ui.panel.config.mqtt.config_flow")}
              </div>
              <div slot="supporting-text">
                ${this.hass.localize(
                  "ui.panel.config.mqtt.config_flow_description"
                )}
              </div>
              <ha-icon-next slot="end"></ha-icon-next>
            </ha-md-list-item>
          </ha-md-list>
        </div>
      </ha-card>
    `;
  }

  private _renderPublishCard() {
    return html`
      <ha-card
        .header=${this.hass.localize(
          "ui.panel.config.mqtt.description_publish"
        )}
      >
        <div class="card-content">
          <div class="panel-dev-mqtt-fields">
            <ha-input
              .label=${this.hass.localize("ui.panel.config.mqtt.topic")}
              .value=${this._topic}
              @change=${this._handleTopic}
            ></ha-input>
            <ha-select
              .label=${this.hass.localize("ui.panel.config.mqtt.qos")}
              .value=${this._qos}
              @selected=${this._handleQos}
              .options=${qosLevel}
            >
            </ha-select>
            <ha-formfield
              label=${this.hass!.localize("ui.panel.config.mqtt.retain")}
            >
              <ha-switch
                @change=${this._handleRetain}
                .checked=${this._retain}
              ></ha-switch>
            </ha-formfield>
          </div>
          <p>${this.hass.localize("ui.panel.config.mqtt.payload")}</p>
          <ha-code-editor
            mode="jinja2"
            autocomplete-entities
            autocomplete-icons
            .value=${this._payload}
            @value-changed=${this._handlePayload}
            dir="ltr"
          ></ha-code-editor>
        </div>
        <div class="card-actions">
          <ha-button appearance="plain" @click=${this._publish}
            >${this.hass.localize("ui.panel.config.mqtt.publish")}</ha-button
          >
        </div>
      </ha-card>
    `;
  }

  private async _fetchConfigEntry(): Promise<void> {
    const configEntries = await getConfigEntries(this.hass, {
      domain: "mqtt",
    });
    this._configEntry = configEntries.find(
      (entry) => entry.disabled_by === null && entry.source !== "ignore"
    );
  }

  private _handleTopic(ev: InputEvent) {
    this._topic = (ev.target as HTMLInputElement).value;
  }

  private _handlePayload(ev: CustomEvent) {
    this._payload = ev.detail.value;
  }

  private _handleQos(ev: HaSelectSelectEvent) {
    const newValue = ev.detail.value;
    if (Number(newValue) >= 0 && newValue !== this._qos) {
      this._qos = newValue;
    }
  }

  private _handleRetain(ev: CustomEvent) {
    this._retain = (ev.target! as any).checked;
  }

  private _publish(): void {
    if (!this.hass) {
      return;
    }

    const script: Action[] = [
      {
        action: "mqtt.publish",
        data: {
          topic: this._topic,
          payload: this._payload,
          qos: parseInt(this._qos),
          retain: this._retain,
        },
      },
    ];

    callExecuteScript(this.hass, script).catch((err) =>
      showToast(this, {
        message: err.message,
      })
    );
  }

  private async _openOptionFlow() {
    showOptionsFlowDialog(this, this._configEntry!);
  }

  private _openConfigFlow = async () => {
    if (!this._configEntry) {
      return;
    }
    showConfigFlowDialog(this, {
      startFlowHandler: this._configEntry.domain,
      manifest: await fetchIntegrationManifest(
        this.hass,
        this._configEntry.domain
      ),
      entryId: this._configEntry.entry_id,
      navigateToResult: true,
    });
  };

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          user-select: initial;
        }

        .nav-card {
          overflow: hidden;
        }

        .nav-card .card-content {
          padding: 0;
        }

        .nav-card .card-header {
          padding-bottom: var(--ha-space-2);
        }
        .content {
          margin-top: var(--ha-space-6);
        }

        .panel-dev-mqtt-fields {
          display: flex;
          justify-content: space-between;
          flex-wrap: wrap;
        }
        ha-card {
          margin: 0 auto var(--ha-space-4);
          max-width: 600px;
        }
        ha-md-list {
          background: none;
          padding: 0;
        }
        ha-md-list-item {
          --md-item-overflow: visible;
        }
        ha-select {
          width: 96px;
          margin: 0 8px;
        }
        ha-input {
          flex: 1;
        }
        @media screen and (max-width: 600px) {
          ha-select {
            margin-left: 0px;
            margin-inline-start: 0px;
            margin-inline-end: initial;
            margin-top: 8px;
          }
          ha-input {
            flex: auto;
            width: 100%;
          }
        }
        ha-card:first-child {
          margin-bottom: 16px;
        }
        mqtt-subscribe-card {
          display: block;
          margin: 16px auto;
        }
        .network-status div.heading {
          display: flex;
          align-items: center;
          column-gap: var(--ha-space-4);
        }

        .network-status div.heading .logo {
          height: 40px;
          width: 40px;
          margin-inline-start: auto;
          object-fit: contain;
        }

        .network-status div.heading .icon {
          position: relative;
          border-radius: var(--ha-border-radius-2xl);
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
          --icon-color: var(--primary-color);
        }

        .network-status div.heading .icon.success {
          --icon-color: var(--success-color);
        }

        .network-status div.heading .icon.error {
          --icon-color: var(--error-color);
        }

        .network-status div.heading .icon::before {
          display: block;
          content: "";
          position: absolute;
          inset: 0;
          background-color: var(--icon-color);
          opacity: 0.2;
        }

        .network-status div.heading .icon ha-svg-icon {
          color: var(--icon-color);
          width: 24px;
          height: 24px;
        }

        .network-status div.heading .details {
          font-size: var(--ha-font-size-xl);
          font-weight: var(--ha-font-weight-normal);
          line-height: var(--ha-line-height-condensed);
          color: var(--primary-text-color);
        }

        .network-status small {
          font-size: var(--ha-font-size-m);
          font-weight: var(--ha-font-weight-normal);
          line-height: var(--ha-line-height-condensed);
          letter-spacing: 0.25px;
          color: var(--secondary-text-color);
        }

        .container {
          padding: var(--ha-space-2) var(--ha-space-4)
            calc(var(--ha-space-16) + var(--safe-area-inset-bottom, 0px));
        }

        a[slot="fab"] {
          text-decoration: none;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "mqtt-config-panel": MQTTConfigPanel;
  }
}

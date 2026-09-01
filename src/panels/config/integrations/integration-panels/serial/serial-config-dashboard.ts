import {
  mdiAlertCircleOutline,
  mdiCableData,
  mdiCheck,
  mdiConnection,
  mdiInformationOutline,
  mdiMemory,
  mdiPowerPlugOff,
  mdiPuzzle,
  mdiRefresh,
  mdiUsb,
} from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { caseInsensitiveStringCompare } from "../../../../../common/string/compare";
import "../../../../../components/ha-alert";
import "../../../../../components/ha-card";
import "../../../../../components/ha-icon-button";
import "../../../../../components/ha-icon-next";
import "../../../../../components/ha-md-list";
import "../../../../../components/ha-md-list-item";
import "../../../../../components/ha-spinner";
import "../../../../../components/ha-svg-icon";
import { domainToName } from "../../../../../data/integration";
import type {
  SerialPort,
  SerialPortConsumer,
  SerialPortDiscoveryFlow,
  SerialPortUsage,
} from "../../../../../data/usb";
import { listSerialPortsWithUsage } from "../../../../../data/usb";
import { showConfigFlowDialog } from "../../../../../dialogs/config-flow/show-dialog-config-flow";
import { mdiEsphomeLogo } from "../../../../../resources/esphome-logo-svg";
import { showSerialPortInfoDialog } from "./show-dialog-serial-port-info";
import "../../../../../layouts/hass-subpage";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";
import { brandsUrl } from "../../../../../util/brands-url";

const ESPHOME_HASS_SCHEME = "esphome-hass://";

type SerialPortType =
  "serial_proxy" | "integration" | "usb" | "embedded" | "unnamed";

const TYPE_ICONS: Record<SerialPortType, string> = {
  serial_proxy: mdiEsphomeLogo,
  integration: mdiConnection,
  usb: mdiUsb,
  embedded: mdiMemory,
  unnamed: mdiMemory,
};

const getPortType = (port: SerialPort): SerialPortType => {
  if (port.device.startsWith(ESPHOME_HASS_SCHEME)) {
    return "serial_proxy";
  }
  if (port.device.includes("://")) {
    return "integration";
  }
  if (port.vid || port.pid) {
    return "usb";
  }
  if (port.description || port.manufacturer) {
    return "embedded";
  }
  return "unnamed";
};

interface PortListItem {
  icon: string;
  primary: string;
  serialNumber?: string;
  matchingIntegrations: string[];
  consumers: SerialPortConsumer[];
  discoveryFlows: SerialPortDiscoveryFlow[];
  port: SerialPortUsage;
}

@customElement("serial-config-dashboard")
export class SerialConfigDashboard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @state() private _ports?: SerialPortUsage[];

  @state() private _error?: string;

  protected firstUpdated(): void {
    this._fetchPorts();
  }

  private async _fetchPorts(): Promise<void> {
    try {
      this._ports = await listSerialPortsWithUsage(this.hass);
      this._error = undefined;
    } catch (err: any) {
      this._error = err.message;
    }
  }

  private _portListItem(
    port: SerialPortUsage,
    localize: HomeAssistant["localize"]
  ): PortListItem {
    const type = getPortType(port);

    const productManufacturer =
      port.description && port.manufacturer
        ? `${port.description} — ${port.manufacturer}`
        : port.description || port.manufacturer;

    let primary: string;
    if (
      port.interface_description &&
      port.interface_description !== port.description
    ) {
      primary = port.interface_description;
    } else {
      primary = productManufacturer || port.device;
    }

    return {
      icon: port.present ? TYPE_ICONS[type] : mdiPowerPlugOff,
      primary,
      // The full port details are shown in the info dialog
      serialNumber: port.serial_number
        ? localize("ui.panel.config.serial.serial_number", {
            serial_number: port.serial_number,
          })
        : undefined,
      matchingIntegrations: port.matching_integrations,
      consumers: port.consumers,
      discoveryFlows: port.discovery_flows,
      port,
    };
  }

  private _sortedPorts = memoizeOne(
    (
      ports: SerialPortUsage[],
      localize: HomeAssistant["localize"],
      language: string
    ): {
      available: PortListItem[];
      connected: PortListItem[];
      disconnected: PortListItem[];
    } => {
      const available: PortListItem[] = [];
      const connected: PortListItem[] = [];
      const disconnected: PortListItem[] = [];

      for (const port of ports) {
        let bucket: PortListItem[];
        if (!port.present) {
          bucket = disconnected;
        } else if (port.consumers.length) {
          bucket = connected;
        } else {
          bucket = available;
        }
        bucket.push(this._portListItem(port, localize));
      }

      const byPrimary = (a: PortListItem, b: PortListItem) =>
        caseInsensitiveStringCompare(a.primary, b.primary, language);
      available.sort(byPrimary);
      connected.sort(byPrimary);
      disconnected.sort(byPrimary);

      return { available, connected, disconnected };
    }
  );

  private _consumerName(consumer: SerialPortConsumer): string {
    const name =
      consumer.title ||
      (consumer.domain
        ? domainToName(this.hass.localize, consumer.domain)
        : consumer.slug!);

    return consumer.active
      ? name
      : this.hass.localize("ui.panel.config.serial.consumer_not_running", {
          name,
        });
  }

  private _renderConsumerIcon(src: string, alt: string): TemplateResult {
    return html`<img
      slot="start"
      .src=${src}
      crossorigin="anonymous"
      referrerpolicy="no-referrer"
      alt=${alt}
    />`;
  }

  private _renderConsumer(consumer: SerialPortConsumer): TemplateResult {
    const href =
      consumer.kind === "config_entry"
        ? `/config/integrations/integration/${consumer.domain}#config_entry=${consumer.config_entry_id}`
        : `/config/app/${consumer.slug}/info`;

    return html`
      <ha-md-list-item type="link" href=${href} class="consumer">
        ${
          consumer.kind === "config_entry"
            ? this._renderConsumerIcon(
                brandsUrl(
                  {
                    domain: consumer.domain!,
                    type: "icon",
                    darkOptimized: this.hass.themes?.darkMode,
                  },
                  this.hass.auth.data.hassUrl
                ),
                consumer.domain!
              )
            : consumer.kind === "app"
              ? this._renderConsumerIcon(
                  `/api/hassio/addons/${consumer.slug}/icon`,
                  consumer.slug!
                )
              : html`<ha-svg-icon
                  slot="start"
                  .path=${mdiPuzzle}
                ></ha-svg-icon>`
        }
        <div slot="headline">${this._consumerName(consumer)}</div>
        <ha-icon-next slot="end"></ha-icon-next>
      </ha-md-list-item>
    `;
  }

  private _renderDiscoveryFlow(flow: SerialPortDiscoveryFlow): TemplateResult {
    return html`
      <ha-md-list-item
        type="button"
        class="consumer"
        .flowId=${flow.flow_id}
        @click=${this._continueFlow}
      >
        <img
          slot="start"
          .src=${brandsUrl(
            {
              domain: flow.domain,
              type: "icon",
              darkOptimized: this.hass.themes?.darkMode,
            },
            this.hass.auth.data.hassUrl
          )}
          crossorigin="anonymous"
          referrerpolicy="no-referrer"
          alt=${flow.domain}
        />
        <div slot="headline">
          ${this.hass.localize("ui.panel.config.serial.discovered_by", {
            integration: domainToName(this.hass.localize, flow.domain),
          })}
        </div>
        <ha-icon-next slot="end"></ha-icon-next>
      </ha-md-list-item>
    `;
  }

  private _continueFlow(ev: Event): void {
    showConfigFlowDialog(this, {
      continueFlowId: (ev.currentTarget as any).flowId,
      dialogClosedCallback: () => {
        this._fetchPorts();
      },
    });
  }

  private _renderPortItem(item: PortListItem): TemplateResult {
    const discoveredDomains = new Set(
      item.discoveryFlows.map((flow) => flow.domain)
    );
    const remainingIntegrations = item.matchingIntegrations.filter(
      (domain) => !discoveredDomains.has(domain)
    );

    const matchingIntegrations =
      !item.consumers.length && remainingIntegrations.length
        ? remainingIntegrations
            .map((domain) => domainToName(this.hass.localize, domain))
            .join(", ")
        : undefined;

    return html`
      <ha-md-list-item class="port">
        <ha-svg-icon
          slot="start"
          class=${item.port.present ? "" : "disconnected"}
          .path=${item.icon}
        ></ha-svg-icon>
        <div slot="headline">${item.primary}</div>
        ${
          item.serialNumber
            ? html`<div slot="supporting-text">${item.serialNumber}</div>`
            : nothing
        }
        ${
          matchingIntegrations
            ? html`<div slot="supporting-text">
                ${this.hass.localize(
                  "ui.panel.config.serial.can_be_used_with",
                  {
                    integrations: matchingIntegrations,
                  }
                )}
              </div>`
            : nothing
        }
        ${
          item.port.present
            ? html`<ha-icon-button
                slot="end"
                .label=${this.hass.localize(
                  "ui.panel.config.serial.port_information"
                )}
                .path=${mdiInformationOutline}
                .port=${item.port}
                @click=${this._showPortInfo}
              ></ha-icon-button>`
            : nothing
        }
      </ha-md-list-item>
      ${item.consumers.map((consumer) => this._renderConsumer(consumer))}
      ${item.discoveryFlows.map((flow) => this._renderDiscoveryFlow(flow))}
    `;
  }

  private _showPortInfo(ev: Event): void {
    showSerialPortInfoDialog(this, {
      port: (ev.currentTarget as any).port,
    });
  }

  private _renderPortsCard(
    header: string,
    description: string,
    items: PortListItem[]
  ): TemplateResult {
    return html`
      <ha-card class="ports">
        <div class="card-header">${header}</div>
        <div class="card-content">
          <div class="description">${description}</div>
          <ha-md-list>
            ${items.map((item) => this._renderPortItem(item))}
          </ha-md-list>
        </div>
      </ha-card>
    `;
  }

  private _renderStatusCard(
    inUse: number,
    available: number,
    disconnected: number
  ): TemplateResult {
    const status = disconnected ? "disconnected" : "ok";

    let summary = this.hass.localize("ui.panel.config.serial.status_summary", {
      in_use: inUse,
      total: inUse + available,
    });

    if (disconnected) {
      summary += ` · ${this.hass.localize(
        "ui.panel.config.serial.status_summary_disconnected",
        { count: disconnected }
      )}`;
    }

    return html`
      <ha-card class="status">
        <div class="card-content">
          <div class="heading">
            <div class="icon ${status}">
              <ha-svg-icon
                .path=${disconnected ? mdiAlertCircleOutline : mdiCheck}
              ></ha-svg-icon>
            </div>
            <div class="details">
              ${this.hass.localize(`ui.panel.config.serial.status_${status}`)}
              <br />
              <small>${summary}</small>
            </div>
            <ha-svg-icon class="logo" .path=${mdiCableData}></ha-svg-icon>
          </div>
        </div>
      </ha-card>
    `;
  }

  protected render(): TemplateResult {
    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.hass.localize("ui.panel.config.serial.title")}
        back-path="/config/connectivity"
      >
        <ha-icon-button
          slot="toolbar-icon"
          .label=${this.hass.localize("ui.common.refresh")}
          .path=${mdiRefresh}
          @click=${this._handleRefresh}
        ></ha-icon-button>
        <div class="container">${this._renderContent()}</div>
      </hass-subpage>
    `;
  }

  private _renderContent(): TemplateResult {
    if (this._error !== undefined) {
      return html`
        <ha-alert
          alert-type="error"
          .title=${this.hass.localize("ui.panel.config.serial.loading_error")}
        >
          ${this._error}
        </ha-alert>
      `;
    }

    if (!this._ports) {
      return html`
        <div class="loading">
          <ha-spinner></ha-spinner>
        </div>
      `;
    }

    const { available, connected, disconnected } = this._sortedPorts(
      this._ports,
      this.hass.localize,
      this.hass.locale.language
    );

    if (!available.length && !connected.length && !disconnected.length) {
      return html`
        <ha-card>
          <div class="card-content">
            <div class="empty">
              ${this.hass.localize("ui.panel.config.serial.no_ports")}
            </div>
          </div>
        </ha-card>
      `;
    }

    return html`
      ${this._renderStatusCard(
        connected.length,
        available.length,
        disconnected.length
      )}
      ${
        connected.length
          ? this._renderPortsCard(
              this.hass.localize("ui.panel.config.serial.connected"),
              this.hass.localize(
                "ui.panel.config.serial.connected_description"
              ),
              connected
            )
          : nothing
      }
      ${
        available.length
          ? this._renderPortsCard(
              this.hass.localize("ui.panel.config.serial.available"),
              this.hass.localize(
                "ui.panel.config.serial.available_description"
              ),
              available
            )
          : nothing
      }
      ${
        disconnected.length
          ? this._renderPortsCard(
              this.hass.localize("ui.panel.config.serial.disconnected"),
              this.hass.localize(
                "ui.panel.config.serial.disconnected_description"
              ),
              disconnected
            )
          : nothing
      }
    `;
  }

  private _handleRefresh(): void {
    this._fetchPorts();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .container {
          padding: var(--ha-space-2) var(--ha-space-4) var(--ha-space-4);
        }

        ha-card,
        ha-alert {
          display: block;
          margin: 0px auto var(--ha-space-4);
          max-width: 600px;
        }

        ha-card:first-child {
          margin-top: var(--ha-space-6);
        }

        .loading {
          display: flex;
          justify-content: center;
          padding: var(--ha-space-12) 0;
        }

        ha-card.ports {
          overflow: hidden;
        }

        ha-card.ports .card-content {
          padding: 0;
        }

        ha-card.ports .card-header {
          padding-bottom: var(--ha-space-2);
        }

        .status div.heading {
          display: flex;
          align-items: center;
          column-gap: var(--ha-space-4);
        }

        .status div.heading .logo {
          margin-inline-start: auto;
          --mdc-icon-size: 40px;
        }

        .status div.heading .icon {
          position: relative;
          border-radius: var(--ha-border-radius-2xl);
          width: var(--ha-space-10);
          height: var(--ha-space-10);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
          --icon-color: var(--primary-color);
        }

        .status div.heading .icon.ok {
          --icon-color: var(--success-color);
        }

        .status div.heading .icon.disconnected {
          --icon-color: var(--warning-color);
        }

        .status div.heading .icon::before {
          display: block;
          content: "";
          position: absolute;
          inset: 0;
          background-color: var(--icon-color);
          opacity: 0.2;
        }

        .status div.heading .icon ha-svg-icon {
          color: var(--icon-color);
          width: var(--ha-space-6);
          height: var(--ha-space-6);
        }

        .status div.heading .details {
          font-size: var(--ha-font-size-xl);
          font-weight: var(--ha-font-weight-normal);
          line-height: var(--ha-line-height-condensed);
          color: var(--primary-text-color);
        }

        .status small {
          font-size: var(--ha-font-size-m);
          font-weight: var(--ha-font-weight-normal);
          line-height: var(--ha-line-height-condensed);
          letter-spacing: 0.25px;
          color: var(--secondary-text-color);
        }

        ha-md-list {
          background: none;
          padding: 0;
        }

        ha-md-list-item {
          --md-list-item-top-space: var(--ha-space-2);
          --md-list-item-bottom-space: var(--ha-space-2);
          --md-list-item-one-line-container-height: 0;
          --md-list-item-two-line-container-height: 0;
          --md-list-item-three-line-container-height: 0;
        }

        ha-md-list-item.port:not(:first-child) {
          border-top: 1px solid var(--divider-color);
          margin-top: var(--ha-space-2);
          --md-list-item-top-space: var(--ha-space-4);
        }

        ha-md-list-item .disconnected {
          color: var(--disabled-text-color);
        }

        ha-md-list-item.consumer {
          --md-list-item-leading-space: var(--ha-space-14);
        }

        ha-md-list-item.consumer img[slot="start"] {
          width: 24px;
          height: 24px;
        }

        .description {
          padding: 0 var(--ha-space-4) var(--ha-space-2);
          color: var(--secondary-text-color);
        }

        .empty {
          padding: var(--ha-space-4);
          color: var(--secondary-text-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "serial-config-dashboard": SerialConfigDashboard;
  }
}

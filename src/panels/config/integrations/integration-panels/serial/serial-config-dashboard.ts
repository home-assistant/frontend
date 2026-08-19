import { mdiConnection, mdiMemory, mdiRefresh, mdiUsb } from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { computeDeviceName } from "../../../../../common/entity/compute_device_name";
import { caseInsensitiveStringCompare } from "../../../../../common/string/compare";
import "../../../../../components/ha-alert";
import "../../../../../components/ha-card";
import "../../../../../components/ha-icon-button";
import "../../../../../components/ha-md-list";
import "../../../../../components/ha-md-list-item";
import "../../../../../components/ha-spinner";
import "../../../../../components/ha-svg-icon";
import { domainToName } from "../../../../../data/integration";
import type { SerialPortWithConsumers } from "../../../../../data/usb";
import { listSerialPortsWithConsumers } from "../../../../../data/usb";
import { mdiEsphomeLogo } from "../../../../../resources/esphome-logo-svg";
import "../../../../../layouts/hass-subpage";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";

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

const getPortType = (port: SerialPortWithConsumers): SerialPortType => {
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
  port: SerialPortWithConsumers;
  icon: string;
  primary: string;
  secondary?: string;
}

@customElement("serial-config-dashboard")
export class SerialConfigDashboard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @state() private _ports?: SerialPortWithConsumers[];

  @state() private _error?: string;

  protected firstUpdated(): void {
    this._fetchPorts();
  }

  private async _fetchPorts(): Promise<void> {
    try {
      this._ports = await listSerialPortsWithConsumers(this.hass);
      this._error = undefined;
    } catch (err: any) {
      this._error = err.message;
    }
  }

  private _portListItem(
    port: SerialPortWithConsumers,
    devices: HomeAssistant["devices"],
    localize: HomeAssistant["localize"]
  ): PortListItem {
    const type = getPortType(port);

    if (type === "serial_proxy") {
      let primary = port.device;
      let secondary: string | undefined;
      try {
        const url = new URL(port.device);
        primary = url.searchParams.get("port_name") || port.device;
        const configEntryId = url.pathname.replace(/^\/+/, "");
        const device = Object.values(devices).find(
          (d) => d.primary_config_entry === configEntryId
        );
        secondary = device ? computeDeviceName(device) : undefined;
      } catch (_err) {
        // Fall back to showing the raw device URL
      }
      return { port, icon: TYPE_ICONS[type], primary, secondary };
    }

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

    const parts: string[] = [];
    if (primary !== port.device) {
      parts.push(port.device);
    }
    if (port.vid && port.pid) {
      parts.push(`${port.vid}:${port.pid}`);
    }
    if (port.serial_number) {
      parts.push(
        localize("ui.panel.config.serial.serial_number", {
          serial_number: port.serial_number,
        })
      );
    }

    return {
      port,
      icon: TYPE_ICONS[type],
      primary,
      secondary: parts.join(" · ") || undefined,
    };
  }

  private _sortedPorts = memoizeOne(
    (
      ports: SerialPortWithConsumers[],
      devices: HomeAssistant["devices"],
      localize: HomeAssistant["localize"],
      language: string
    ): { present: PortListItem[]; absent: PortListItem[] } => {
      const present: PortListItem[] = [];
      const absent: PortListItem[] = [];

      for (const port of ports) {
        (port.present ? present : absent).push(
          this._portListItem(port, devices, localize)
        );
      }

      const byPrimary = (a: PortListItem, b: PortListItem) =>
        caseInsensitiveStringCompare(a.primary, b.primary, language);
      present.sort(byPrimary);
      absent.sort(byPrimary);

      return { present, absent };
    }
  );

  private _usageLine(port: SerialPortWithConsumers): string {
    if (port.consumers.length) {
      const consumers = port.consumers
        .map((consumer) =>
          consumer.active
            ? consumer.title
            : this.hass.localize(
                "ui.panel.config.serial.consumer_not_running",
                { name: consumer.title }
              )
        )
        .join(", ");
      return this.hass.localize("ui.panel.config.serial.used_by", {
        consumers,
      });
    }

    if (port.matching_integrations.length) {
      const integrations = port.matching_integrations
        .map((domain) => domainToName(this.hass.localize, domain))
        .join(", ");
      return this.hass.localize("ui.panel.config.serial.can_be_used_with", {
        integrations,
      });
    }

    return this.hass.localize("ui.panel.config.serial.not_used");
  }

  private _renderPortItem(item: PortListItem): TemplateResult {
    return html`
      <ha-md-list-item>
        <ha-svg-icon slot="start" .path=${item.icon}></ha-svg-icon>
        <div slot="headline">${item.primary}</div>
        ${
          item.secondary
            ? html`<div slot="supporting-text">${item.secondary}</div>`
            : nothing
        }
        <div slot="supporting-text">${this._usageLine(item.port)}</div>
      </ha-md-list-item>
    `;
  }

  protected render(): TemplateResult {
    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.hass.localize("ui.panel.config.serial.title")}
        back-path="/config"
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

    const { present, absent } = this._sortedPorts(
      this._ports,
      this.hass.devices,
      this.hass.localize,
      this.hass.locale.language
    );

    return html`
      <ha-card class="content">
        <div class="card-header">
          ${this.hass.localize("ui.panel.config.serial.ports")}
        </div>
        <div class="card-content">
          ${
            present.length
              ? html`
                  <ha-md-list>
                    ${present.map((item) => this._renderPortItem(item))}
                  </ha-md-list>
                `
              : html`
                  <div class="empty">
                    ${this.hass.localize("ui.panel.config.serial.no_ports")}
                  </div>
                `
          }
        </div>
      </ha-card>
      ${
        absent.length
          ? html`
              <ha-card>
                <div class="card-header">
                  ${this.hass.localize("ui.panel.config.serial.not_connected")}
                </div>
                <div class="card-content">
                  <ha-md-list>
                    ${absent.map((item) => this._renderPortItem(item))}
                  </ha-md-list>
                </div>
              </ha-card>
            `
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

        .content {
          margin-top: var(--ha-space-6);
        }

        .loading {
          display: flex;
          justify-content: center;
          padding: var(--ha-space-12) 0;
        }

        ha-card {
          overflow: hidden;
        }

        ha-card .card-content {
          padding: 0;
        }

        ha-card .card-header {
          padding-bottom: var(--ha-space-2);
        }

        ha-md-list {
          background: none;
          padding: 0;
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

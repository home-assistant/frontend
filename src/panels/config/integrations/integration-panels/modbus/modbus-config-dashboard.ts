import {
  mdiCableData,
  mdiLan,
  mdiPuzzle,
  mdiRefresh,
  mdiTransitConnectionVariant,
} from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../../../../common/config/is_component_loaded";
import { caseInsensitiveStringCompare } from "../../../../../common/string/compare";
import "../../../../../components/ha-alert";
import "../../../../../components/ha-card";
import "../../../../../components/ha-icon-button";
import "../../../../../components/ha-icon-next";
import "../../../../../components/ha-md-list";
import "../../../../../components/ha-md-list-item";
import "../../../../../components/ha-spinner";
import "../../../../../components/ha-svg-icon";
import type { ConfigEntry } from "../../../../../data/config_entries";
import { getConfigEntries } from "../../../../../data/config_entries";
import { domainToName } from "../../../../../data/integration";
import type { ModbusConnection } from "../../../../../data/modbus";
import {
  listModbusConnections,
  modbusEndpointTarget,
  modbusSerialDevice,
  modbusUnitCount,
} from "../../../../../data/modbus";
import "../../../../../layouts/hass-subpage";
import { panelIsReady } from "../../../../../layouts/panel-ready";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";
import { brandsUrl } from "../../../../../util/brands-url";

const TRANSPORTS = ["tcp", "udp", "serial"] as const;

type ModbusTransport = (typeof TRANSPORTS)[number];

const isKnownTransport = (transport: string): transport is ModbusTransport =>
  (TRANSPORTS as readonly string[]).includes(transport);

interface ConnectionHolder {
  entryId: string;
  entry?: ConfigEntry;
  units: number[];
}

interface ConnectionListItem {
  icon: string;
  primary: string;
  transport: string;
  serialDevice?: string;
  holders: ConnectionHolder[];
  connection: ModbusConnection;
}

@customElement("modbus-config-dashboard")
export class ModbusConfigDashboard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @state() private _connections?: ModbusConnection[];

  @state() private _entries?: Record<string, ConfigEntry>;

  @state() private _error?: string;

  protected async firstUpdated(): Promise<void> {
    await this._fetchConnections();
    await panelIsReady(this);
  }

  private async _fetchConnections(): Promise<void> {
    try {
      const [connections, entries] = await Promise.all([
        listModbusConnections(this.hass),
        getConfigEntries(this.hass),
      ]);
      this._connections = connections;
      this._entries = Object.fromEntries(
        entries.map((entry) => [entry.entry_id, entry])
      );
      this._error = undefined;
    } catch (err: any) {
      this._error = err.message;
    }
  }

  private _transportName(transport: string): string {
    return isKnownTransport(transport)
      ? this.hass.localize(`ui.panel.config.modbus.transport.${transport}`)
      : transport;
  }

  private _connectionListItem(
    connection: ModbusConnection,
    entries: Record<string, ConfigEntry>
  ): ConnectionListItem {
    const [transport] = connection.endpoint;
    const serialDevice = modbusSerialDevice(connection.endpoint);

    return {
      icon: serialDevice ? mdiCableData : mdiLan,
      primary: modbusEndpointTarget(connection.endpoint),
      transport: this._transportName(transport),
      serialDevice,
      holders: Object.entries(connection.units).map(([entryId, units]) => ({
        entryId,
        entry: entries[entryId],
        units,
      })),
      connection,
    };
  }

  private _sortedConnections = memoizeOne(
    (
      connections: ModbusConnection[],
      entries: Record<string, ConfigEntry>,
      _localize: HomeAssistant["localize"],
      language: string
    ): ConnectionListItem[] =>
      connections
        .map((connection) => this._connectionListItem(connection, entries))
        .sort((a, b) =>
          caseInsensitiveStringCompare(a.primary, b.primary, language)
        )
  );

  private _renderUnits(holder: ConnectionHolder): TemplateResult {
    return html`
      <div slot="supporting-text">
        ${this.hass.localize("ui.panel.config.modbus.units", {
          count: holder.units.length,
          ids: holder.units.join(", "),
        })}
      </div>
    `;
  }

  private _renderHolder(holder: ConnectionHolder): TemplateResult {
    // An entry removed while the connection was listed has nowhere to link to
    if (!holder.entry) {
      return html`
        <ha-md-list-item class="holder">
          <ha-svg-icon slot="start" .path=${mdiPuzzle}></ha-svg-icon>
          <div slot="headline">${holder.entryId}</div>
          ${this._renderUnits(holder)}
        </ha-md-list-item>
      `;
    }

    const { domain, title } = holder.entry;

    return html`
      <ha-md-list-item
        type="link"
        class="holder"
        href=${`/config/integrations/integration/${domain}#config_entry=${holder.entryId}`}
      >
        <img
          slot="start"
          .src=${brandsUrl(
            {
              domain,
              type: "icon",
              darkOptimized: this.hass.themes?.darkMode,
            },
            this.hass.auth.data.hassUrl
          )}
          crossorigin="anonymous"
          referrerpolicy="no-referrer"
          alt=${domain}
        />
        <div slot="headline">
          ${title || domainToName(this.hass.localize, domain)}
        </div>
        ${this._renderUnits(holder)}
        <ha-icon-next slot="end"></ha-icon-next>
      </ha-md-list-item>
    `;
  }

  private _renderSerialPortLink(): TemplateResult {
    return html`
      <ha-md-list-item type="link" class="holder" href="/config/serial">
        <ha-svg-icon slot="start" .path=${mdiCableData}></ha-svg-icon>
        <div slot="headline">
          ${this.hass.localize("ui.panel.config.modbus.view_serial_port")}
        </div>
        <ha-icon-next slot="end"></ha-icon-next>
      </ha-md-list-item>
    `;
  }

  // A closed link is not a fault: the library opens one when an integration
  // next polls, and a device may drop an idle one in the meantime
  private _renderState(connected: boolean): TemplateResult {
    return html`
      <div slot="end" class="state">
        <span class="dot ${connected ? "online" : "offline"}"></span>
        ${this.hass.localize(
          `ui.panel.config.modbus.state_${connected ? "connected" : "not_connected"}`
        )}
      </div>
    `;
  }

  private _renderConnectionItem(item: ConnectionListItem): TemplateResult {
    return html`
      <ha-md-list-item class="connection">
        <ha-svg-icon slot="start" .path=${item.icon}></ha-svg-icon>
        <div slot="headline">${item.primary}</div>
        <div slot="supporting-text">${item.transport}</div>
        ${this._renderState(item.connection.connected)}
      </ha-md-list-item>
      ${item.holders.map((holder) => this._renderHolder(holder))}
      ${
        item.serialDevice && isComponentLoaded(this.hass.config, "usb")
          ? this._renderSerialPortLink()
          : nothing
      }
    `;
  }

  private _renderConnectionsCard(items: ConnectionListItem[]): TemplateResult {
    return html`
      <ha-card class="connections">
        <div class="card-header">
          ${this.hass.localize("ui.panel.config.modbus.connections")}
        </div>
        <div class="card-content">
          <div class="description">
            ${this.hass.localize(
              "ui.panel.config.modbus.connections_description"
            )}
          </div>
          <ha-md-list>
            ${items.map((item) => this._renderConnectionItem(item))}
          </ha-md-list>
        </div>
      </ha-card>
    `;
  }

  // No health verdict: the summary is a count, since a closed link is normal
  private _renderStatusCard(items: ConnectionListItem[]): TemplateResult {
    return html`
      <ha-card class="status">
        <div class="card-content">
          <div class="heading">
            <div class="icon">
              <ha-svg-icon .path=${mdiTransitConnectionVariant}></ha-svg-icon>
            </div>
            <div class="details">
              ${this.hass.localize("ui.panel.config.modbus.status_summary", {
                units: items.reduce(
                  (total, item) => total + modbusUnitCount(item.connection),
                  0
                ),
                total: items.length,
              })}
            </div>
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
        .header=${this.hass.localize("ui.panel.config.modbus.title")}
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
          .title=${this.hass.localize("ui.panel.config.modbus.loading_error")}
        >
          ${this._error}
        </ha-alert>
      `;
    }

    if (!this._connections || !this._entries) {
      return html`
        <div class="loading">
          <ha-spinner></ha-spinner>
        </div>
      `;
    }

    const items = this._sortedConnections(
      this._connections,
      this._entries,
      this.hass.localize,
      this.hass.locale.language
    );

    if (!items.length) {
      return html`
        <ha-card>
          <div class="card-content">
            <div class="empty">
              ${this.hass.localize("ui.panel.config.modbus.no_connections")}
              <br />
              <small>
                ${this.hass.localize(
                  "ui.panel.config.modbus.no_connections_description"
                )}
              </small>
            </div>
          </div>
        </ha-card>
      `;
    }

    return html`
      ${this._renderStatusCard(items)} ${this._renderConnectionsCard(items)}
    `;
  }

  private _handleRefresh(): void {
    this._fetchConnections();
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

        ha-card.connections {
          overflow: hidden;
        }

        ha-card.connections .card-content {
          padding: 0;
        }

        ha-card.connections .card-header {
          padding-bottom: var(--ha-space-2);
        }

        .status div.heading {
          display: flex;
          align-items: center;
          column-gap: var(--ha-space-4);
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

        ha-md-list-item.connection:not(:first-child) {
          border-top: 1px solid var(--divider-color);
          margin-top: var(--ha-space-2);
          --md-list-item-top-space: var(--ha-space-4);
        }

        .state {
          display: flex;
          align-items: center;
          column-gap: var(--ha-space-2);
          font-size: var(--ha-font-size-m);
          color: var(--secondary-text-color);
        }

        .state .dot {
          width: var(--ha-space-2);
          height: var(--ha-space-2);
          border-radius: var(--ha-border-radius-circle);
          background-color: var(--disabled-text-color);
        }

        .state .dot.online {
          background-color: var(--success-color);
        }

        ha-md-list-item.holder {
          --md-list-item-leading-space: var(--ha-space-14);
        }

        ha-md-list-item.holder img[slot="start"] {
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

        .empty small {
          color: var(--secondary-text-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "modbus-config-dashboard": ModbusConfigDashboard;
  }
}

import type { CSSResultGroup, TemplateResult, PropertyValues } from "lit";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { LocalizeFunc } from "../../../../../common/translations/localize";
import type { DataTableColumnContainer } from "../../../../../components/data-table/ha-data-table";
import { extractSearchParamsObject } from "../../../../../common/url/search-params";
import "../../../../../components/ha-fab";
import "../../../../../components/ha-icon-button";
import "../../../../../layouts/hass-tabs-subpage-data-table";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";
import type { DHCPDiscoveryData } from "../../../../../data/dhcp";
import { SubscribeMixin } from "../../../../../mixins/subscribe-mixin";

import { subscribeDHCPDiscovery } from "../../../../../data/dhcp";

@customElement("dhcp-config-panel")
export class DHCPConfigPanel extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @state() private _macAddress?: string;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @state() private _data: DHCPDiscoveryData[] = [];

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      subscribeDHCPDiscovery(this.hass.connection, (data) => {
        this._data = data;
      }),
    ];
  }

  private _columns = memoizeOne(
    (localize: LocalizeFunc): DataTableColumnContainer => {
      const columns: DataTableColumnContainer<DHCPDiscoveryData> = {
        mac_address: {
          title: localize("ui.panel.config.dhcp.mac_address"),
          sortable: true,
          filterable: true,
          showNarrow: true,
          main: true,
          hideable: false,
          moveable: false,
          direction: "asc",
        },
        hostname: {
          title: localize("ui.panel.config.dhcp.hostname"),
          filterable: true,
          sortable: true,
        },
        ip_address: {
          title: localize("ui.panel.config.dhcp.ip_address"),
          filterable: true,
          sortable: true,
          type: "ipv4",
        },
      };

      return columns;
    }
  );

  private _dataWithIds = memoizeOne((data) =>
    data.map((row) => ({
      ...row,
      id: row.mac_address,
    }))
  );

  protected willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);

    if (this.hasUpdated) {
      return;
    }

    const searchParams = extractSearchParamsObject();
    const macAddress = searchParams.mac_address;
    if (macAddress) {
      this._macAddress = macAddress.toUpperCase();
    }
  }

  protected render(): TemplateResult {
    return html`
      <hass-tabs-subpage-data-table
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .columns=${this._columns(this.hass.localize)}
        .data=${this._dataWithIds(this._data)}
        .noDataText=${this.hass.localize(
          "ui.panel.config.dhcp.no_devices_found"
        )}
        filter=${this._macAddress || ""}
      ></hass-tabs-subpage-data-table>
    `;
  }

  static styles: CSSResultGroup = haStyle;
}

declare global {
  interface HTMLElementTagNameMap {
    "dhcp-config-panel": DHCPConfigPanel;
  }
}

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

import { subscribeDHCPDiscovery } from "../../../../../data/dhcp";

@customElement("dhcp-config-panel")
export class DHCPConfigPanel extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ attribute: false }) public mac_address?: string;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @state() private _data: DHCPDiscoveryData[] = [];

  private _unsub?: UnsubscribeFunc;

  public connectedCallback(): void {
    super.connectedCallback();
    if (this.hass) {
      this._unsub = subscribeDHCPDiscovery(this.hass.connection, (data) => {
        this._data = data;
      });
    }
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    if (this._unsub) {
      this._unsub();
      this._unsub = undefined;
    }
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
        },
      };

      return columns;
    }
  );

  private _dataWithIds = memoizeOne((data) =>
    data.map((row) => ({
      ...row,
      id: row.address,
    }))
  );

  protected willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);

    if (this.hasUpdated) {
      return;
    }

    const searchParams = extractSearchParamsObject();
    const mac_address = searchParams.mac_address;
    if (mac_address) {
      this.mac_address = mac_address;
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
        filter=${this.mac_address || ""}
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

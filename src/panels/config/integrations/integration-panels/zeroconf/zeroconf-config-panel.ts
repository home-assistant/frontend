import type { CSSResultGroup, TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { LocalizeFunc } from "../../../../../common/translations/localize";
import type { DataTableColumnContainer } from "../../../../../components/data-table/ha-data-table";
import "../../../../../components/ha-fab";
import "../../../../../components/ha-icon-button";
import "../../../../../layouts/hass-tabs-subpage-data-table";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";
import type { ZeroconfDiscoveryData } from "../../../../../data/zeroconf";
import { SubscribeMixin } from "../../../../../mixins/subscribe-mixin";

import { subscribeZeroconfDiscovery } from "../../../../../data/zeroconf";

@customElement("zeroconf-config-panel")
export class ZeroconfConfigPanel extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @state() private _data: ZeroconfDiscoveryData[] = [];

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      subscribeZeroconfDiscovery(this.hass.connection, (data) => {
        this._data = data;
      }),
    ];
  }

  private _columns = memoizeOne(
    (localize: LocalizeFunc): DataTableColumnContainer => {
      const columns: DataTableColumnContainer<ZeroconfDiscoveryData> = {
        name: {
          title: localize("ui.panel.config.zeroconf.name"),
          sortable: true,
          filterable: true,
          showNarrow: true,
          main: true,
          hideable: false,
          moveable: false,
          direction: "asc",
        },
        type: {
          title: localize("ui.panel.config.zeroconf.type"),
          filterable: true,
          sortable: true,
        },
        port: {
          title: localize("ui.panel.config.zeroconf.port"),
          filterable: true,
          sortable: true,
        },
        ip_addresses: {
          title: localize("ui.panel.config.zeroconf.ip_addresses"),
          filterable: true,
          sortable: false,
        },
        properties: {
          title: localize("ui.panel.config.zeroconf.properties"),
          filterable: true,
          sortable: false,
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

  protected render(): TemplateResult {
    return html`
      <hass-tabs-subpage-data-table
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .columns=${this._columns(this.hass.localize)}
        .data=${this._dataWithIds(this._data)}
      ></hass-tabs-subpage-data-table>
    `;
  }

  static styles: CSSResultGroup = haStyle;
}

declare global {
  interface HTMLElementTagNameMap {
    "zeroconf-config-panel": ZeroconfConfigPanel;
  }
}

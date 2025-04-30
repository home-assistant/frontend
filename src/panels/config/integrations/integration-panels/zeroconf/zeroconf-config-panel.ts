import type { CSSResultGroup, TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { LocalizeFunc } from "../../../../../common/translations/localize";
import type {
  RowClickedEvent,
  DataTableColumnContainer,
} from "../../../../../components/data-table/ha-data-table";
import "../../../../../components/ha-fab";
import "../../../../../components/ha-icon-button";
import "../../../../../layouts/hass-tabs-subpage-data-table";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";
import type { ZeroconfDiscoveryData } from "../../../../../data/zeroconf";
import { SubscribeMixin } from "../../../../../mixins/subscribe-mixin";
import { storage } from "../../../../../common/decorators/storage";
import type { HASSDomEvent } from "../../../../../common/dom/fire_event";
import { subscribeZeroconfDiscovery } from "../../../../../data/zeroconf";
import { showZeroconfDiscoveryInfoDialog } from "./show-dialog-zeroconf-discovery-info";

@customElement("zeroconf-config-panel")
export class ZeroconfConfigPanel extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @state() private _data: ZeroconfDiscoveryData[] = [];

  @storage({
    key: "zeroconf-discovery-table-grouping",
    state: false,
    subscribe: false,
  })
  private _activeGrouping?: string = "type";

  @storage({
    key: "zeroconf-discovery-table-collapsed",
    state: false,
    subscribe: false,
  })
  private _activeCollapsed: string[] = [];

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
          template: (data) =>
            html`${data.name.slice(0, -data.type.length - 1)}`,
        },
        type: {
          title: localize("ui.panel.config.zeroconf.type"),
          filterable: true,
          sortable: true,
          groupable: true,
        },
        ip_addresses: {
          title: localize("ui.panel.config.zeroconf.ip_addresses"),
          showNarrow: true,
          filterable: true,
          sortable: false,
          template: (data) => html`${data.ip_addresses.join(", ")}`,
        },
        port: {
          title: localize("ui.panel.config.zeroconf.port"),
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
      id: row.name,
    }))
  );

  protected render(): TemplateResult {
    return html`
      <hass-tabs-subpage-data-table
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .columns=${this._columns(this.hass.localize)}
        .initialGroupColumn=${this._activeGrouping}
        .initialCollapsedGroups=${this._activeCollapsed}
        @grouping-changed=${this._handleGroupingChanged}
        @collapsed-changed=${this._handleCollapseChanged}
        .data=${this._dataWithIds(this._data)}
        .noDataText=${this.hass.localize(
          "ui.panel.config.zeroconf.no_devices_found"
        )}
        @row-click=${this._handleRowClicked}
        clickable
      ></hass-tabs-subpage-data-table>
    `;
  }

  private _handleRowClicked(ev: HASSDomEvent<RowClickedEvent>) {
    const entry = this._data.find((ent) => ent.name === ev.detail.id);
    showZeroconfDiscoveryInfoDialog(this, {
      entry: entry!,
    });
  }

  private _handleGroupingChanged(ev: CustomEvent) {
    this._activeGrouping = ev.detail.value;
  }

  private _handleCollapseChanged(ev: CustomEvent) {
    this._activeCollapsed = ev.detail.value;
  }

  static styles: CSSResultGroup = haStyle;
}

declare global {
  interface HTMLElementTagNameMap {
    "zeroconf-config-panel": ZeroconfConfigPanel;
  }
}

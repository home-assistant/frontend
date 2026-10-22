import type { CSSResultGroup, TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import { DataTableSettingsController } from "../../../../../common/controllers/data-table-settings-controller";
import type { LocalizeFunc } from "../../../../../common/translations/localize";
import type {
  RowClickedEvent,
  DataTableColumnContainer,
} from "../../../../../components/data-table/ha-data-table";

import "../../../../../components/ha-icon-button";
import "../../../../../layouts/hass-tabs-subpage-data-table";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";
import type { SSDPDiscoveryData } from "../../../../../data/ssdp";
import { SubscribeMixin } from "../../../../../mixins/subscribe-mixin";
import { storage } from "../../../../../common/decorators/storage";
import type { HASSDomEvent } from "../../../../../common/dom/fire_event";
import { subscribeSSDPDiscovery } from "../../../../../data/ssdp";
import { showSSDPDiscoveryInfoDialog } from "./show-dialog-ssdp-discovery-info";

@customElement("ssdp-config-panel")
export class SSDPConfigPanel extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @state() private _data: SSDPDiscoveryData[] = [];

  private _tableSettings = new DataTableSettingsController(
    this,
    { grouping: "ssdp-discovery-table-grouping" },
    { defaultGrouping: "ssdp_location" }
  );

  @storage({
    key: "ssdp-discovery-table-collapsed",
    state: false,
    subscribe: false,
  })
  private _activeCollapsed: string[] = [];

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      subscribeSSDPDiscovery(this.hass.connection, (data) => {
        this._data = data;
      }),
    ];
  }

  private _columns = memoizeOne(
    (localize: LocalizeFunc): DataTableColumnContainer => {
      const columns: DataTableColumnContainer<SSDPDiscoveryData> = {
        name: {
          title: localize("ui.panel.config.ssdp.name"),
          sortable: true,
          filterable: true,
          showNarrow: true,
          main: true,
          hideable: false,
          moveable: false,
        },
        ssdp_st: {
          title: localize("ui.panel.config.ssdp.ssdp_st"),
          sortable: true,
          filterable: true,
          showNarrow: true,
          hideable: false,
          direction: "asc",
        },
        ssdp_location: {
          title: localize("ui.panel.config.ssdp.ssdp_location"),
          filterable: true,
          sortable: true,
          groupable: true,
          urlName: "location",
        },
      };

      return columns;
    }
  );

  private _dataWithIds = memoizeOne((data) =>
    data.map((row) => ({
      ...row,
      name: row.name || row.ssdp_usn,
      id: [row.ssdp_st, row.ssdp_location].filter(Boolean).join("|"),
    }))
  );

  protected render(): TemplateResult {
    return html`
      <hass-tabs-subpage-data-table
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        back-path="/config/integrations/integration/ssdp"
        .columns=${this._columns(this.hass.localize)}
        .initialGroupColumn=${this._tableSettings.grouping}
        .initialCollapsedGroups=${this._activeCollapsed}
        @grouping-changed=${this._tableSettings.groupingChanged}
        @collapsed-changed=${this._handleCollapseChanged}
        .filter=${this._tableSettings.search}
        @search-changed=${this._tableSettings.searchChanged}
        .data=${this._dataWithIds(this._data)}
        .noDataText=${this.hass.localize(
          "ui.panel.config.ssdp.no_devices_found"
        )}
        @row-click=${this._handleRowClicked}
        clickable
        sync-url
      ></hass-tabs-subpage-data-table>
    `;
  }

  private _handleRowClicked(ev: HASSDomEvent<RowClickedEvent>) {
    const entry = this._data.find(
      (ent) =>
        [ent.ssdp_st, ent.ssdp_location].filter(Boolean).join("|") ===
        ev.detail.id
    );
    showSSDPDiscoveryInfoDialog(this, {
      entry: entry!,
    });
  }

  private _handleCollapseChanged(ev: CustomEvent) {
    this._activeCollapsed = ev.detail.value;
  }

  static styles: CSSResultGroup = haStyle;
}

declare global {
  interface HTMLElementTagNameMap {
    "ssdp-config-panel": SSDPConfigPanel;
  }
}

import "@material/mwc-button";
import "@material/mwc-fab";
import "../../../../../components/ha-icon-button";
import memoizeOne from "memoize-one";
import {
  customElement,
  html,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
  CSSResultArray,
  css,
} from "lit-element";
import { HASSDomEvent } from "../../../../../common/dom/fire_event";
import { navigate } from "../../../../../common/navigate";
import {
  DataTableColumnContainer,
  RowClickedEvent,
} from "../../../../../components/data-table/ha-data-table";
import { fetchGroups, ZHAGroup, ZHADevice } from "../../../../../data/zha";
import "../../../../../layouts/hass-tabs-subpage-data-table";
import { HomeAssistant, Route } from "../../../../../types";
import { sortZHAGroups, formatAsPaddedHex } from "./functions";
import { zhaTabs } from "./zha-config-dashboard";
import { computeRTL } from "../../../../../common/util/compute_rtl";
import { mdiPlus } from "@mdi/js";
import { haStyle } from "../../../../../resources/styles";

export interface GroupRowData extends ZHAGroup {
  group?: GroupRowData;
  id?: string;
}

@customElement("zha-groups-dashboard")
export class ZHAGroupsDashboard extends LitElement {
  @property() public hass!: HomeAssistant;

  @property({ type: Object }) public route!: Route;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ type: Boolean }) public isWide!: boolean;

  @property() public _groups: ZHAGroup[] = [];

  private _firstUpdatedCalled = false;

  public connectedCallback(): void {
    super.connectedCallback();
    if (this.hass && this._firstUpdatedCalled) {
      this._fetchGroups();
    }
  }

  protected firstUpdated(changedProperties: PropertyValues): void {
    super.firstUpdated(changedProperties);
    if (this.hass) {
      this._fetchGroups();
    }
    this._firstUpdatedCalled = true;
  }

  private _formattedGroups = memoizeOne((groups: ZHAGroup[]) => {
    let outputGroups: GroupRowData[] = groups;

    outputGroups = outputGroups.map((group) => {
      return {
        ...group,
        id: String(group.group_id),
      };
    });

    return outputGroups;
  });

  private _columns = memoizeOne(
    (narrow: boolean): DataTableColumnContainer =>
      narrow
        ? {
            name: {
              title: "Group",
              sortable: true,
              filterable: true,
              direction: "asc",
              grows: true,
            },
          }
        : {
            name: {
              title: this.hass.localize("ui.panel.config.zha.groups.groups"),
              sortable: true,
              filterable: true,
              direction: "asc",
              grows: true,
            },
            group_id: {
              title: this.hass.localize("ui.panel.config.zha.groups.group_id"),
              type: "numeric",
              width: "15%",
              template: (groupId: number) => {
                return html` ${formatAsPaddedHex(groupId)} `;
              },
              sortable: true,
            },
            members: {
              title: this.hass.localize("ui.panel.config.zha.groups.members"),
              type: "numeric",
              width: "15%",
              template: (members: ZHADevice[]) => {
                return html` ${members.length} `;
              },
              sortable: true,
            },
          }
  );

  protected render(): TemplateResult {
    return html`
      <hass-tabs-subpage-data-table
        .tabs=${zhaTabs}
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .columns=${this._columns(this.narrow)}
        .data=${this._formattedGroups(this._groups)}
        @row-click=${this._handleRowClicked}
      >
      </hass-tabs-subpage-data-table>
      <a href="/config/zha/group-add">
        <mwc-fab
          ?is-wide=${this.isWide}
          ?narrow=${this.narrow}
          title=${this.hass!.localize("ui.panel.config.zha.groups.add_group")}
          ?rtl=${computeRTL(this.hass)}
        >
          <ha-svg-icon slot="icon" path=${mdiPlus}></ha-svg-icon>
        </mwc-fab>
      </a>
    `;
  }

  private async _fetchGroups() {
    this._groups = (await fetchGroups(this.hass!)).sort(sortZHAGroups);
  }

  private _handleRowClicked(ev: HASSDomEvent<RowClickedEvent>) {
    const groupId = ev.detail.id;
    navigate(this, `/config/zha/group/${groupId}`);
  }

  static get styles(): CSSResultArray {
    return [
      haStyle,
      css`
        mwc-fab {
          position: fixed;
          bottom: 16px;
          right: 16px;
          z-index: 1;
        }

        mwc-fab[is-wide] {
          bottom: 24px;
          right: 24px;
        }
        mwc-fab[narrow] {
          bottom: 84px;
        }
        mwc-fab[rtl] {
          right: auto;
          left: 16px;
        }

        mwc-fab[rtl][is-wide] {
          bottom: 24px;
          right: auto;
          left: 24px;
        }

        a {
          color: var(--primary-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-groups-dashboard": ZHAGroupsDashboard;
  }
}

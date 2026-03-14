import { mdiPlus } from "@mdi/js";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import type { HASSDomEvent } from "../../../../../common/dom/fire_event";
import { navigate } from "../../../../../common/navigate";
import type { LocalizeFunc } from "../../../../../common/translations/localize";
import type {
  DataTableColumnContainer,
  RowClickedEvent,
} from "../../../../../components/data-table/ha-data-table";
import "../../../../../components/ha-fab";
import "../../../../../components/ha-icon-button";
import type { ZHAGroup } from "../../../../../data/zha";
import { fetchGroups } from "../../../../../data/zha";
import "../../../../../layouts/hass-tabs-subpage-data-table";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";
import { formatAsPaddedHex, sortZHAGroups } from "./functions";
import { zhaTabs } from "./zha-config-dashboard";

export interface GroupRowData extends ZHAGroup {
  group?: GroupRowData;
  id?: string;
}

@customElement("zha-groups-dashboard")
export class ZHAGroupsDashboard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @state() private _groups: ZHAGroup[] = [];

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

    outputGroups = outputGroups.map((group) => ({
      ...group,
      id: String(group.group_id),
    }));

    return outputGroups;
  });

  private _columns = memoizeOne(
    (localize: LocalizeFunc): DataTableColumnContainer => {
      const columns: DataTableColumnContainer<GroupRowData> = {
        name: {
          title: localize("ui.panel.config.zha.groups.groups"),
          sortable: true,
          filterable: true,
          showNarrow: true,
          main: true,
          hideable: false,
          moveable: false,
          direction: "asc",
          flex: 2,
        },
        group_id: {
          title: localize("ui.panel.config.zha.groups.group_id"),
          type: "numeric",
          template: (group) => html` ${formatAsPaddedHex(group.group_id)} `,
          sortable: true,
        },
        members: {
          title: localize("ui.panel.config.zha.groups.members"),
          type: "numeric",
          template: (group) => html` ${group.members.length} `,
          sortable: true,
        },
      };

      return columns;
    }
  );

  protected render(): TemplateResult {
    return html`
      <hass-tabs-subpage-data-table
        .tabs=${zhaTabs}
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .columns=${this._columns(this.hass.localize)}
        .data=${this._formattedGroups(this._groups)}
        @row-click=${this._handleRowClicked}
        clickable
        has-fab
      >
        <a href="/config/zha/group-add" slot="fab">
          <ha-fab
            .label=${this.hass!.localize(
              "ui.panel.config.zha.groups.add_group"
            )}
            extended
          >
            <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
          </ha-fab>
        </a>
      </hass-tabs-subpage-data-table>
    `;
  }

  private async _fetchGroups() {
    this._groups = (await fetchGroups(this.hass!)).sort(sortZHAGroups);
  }

  private _handleRowClicked(ev: HASSDomEvent<RowClickedEvent>) {
    const groupId = ev.detail.id;
    navigate(`/config/zha/group/${groupId}`);
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
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

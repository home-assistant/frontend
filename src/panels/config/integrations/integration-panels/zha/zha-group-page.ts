import { mdiDelete } from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import type { HASSDomEvent } from "../../../../../common/dom/fire_event";
import { navigate } from "../../../../../common/navigate";
import type { SelectionChangedEvent } from "../../../../../components/data-table/ha-data-table";
import "../../../../../components/ha-button";
import "../../../../../components/ha-card";
import "../../../../../components/ha-icon-button";
import "../../../../../components/ha-list";
import "../../../../../components/ha-list-item";
import type { ZHADeviceEndpoint, ZHAGroup } from "../../../../../data/zha";
import {
  addMembersToGroup,
  fetchGroup,
  fetchGroupableDevices,
  removeGroups,
  removeMembersFromGroup,
} from "../../../../../data/zha";
import "../../../../../layouts/hass-error-screen";
import "../../../../../layouts/hass-subpage";
import type { HomeAssistant } from "../../../../../types";
import "../../../ha-config-section";
import { formatAsPaddedHex } from "./functions";
import "./zha-device-endpoint-data-table";
import type { ZHADeviceEndpointDataTable } from "./zha-device-endpoint-data-table";

@customElement("zha-group-page")
export class ZHAGroupPage extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Object }) public group?: ZHAGroup;

  @property({ attribute: false, type: Number }) public groupId!: number;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ attribute: false, type: Array })
  public deviceEndpoints: ZHADeviceEndpoint[] = [];

  @state() private _processingAdd = false;

  @state() private _processingRemove = false;

  @state()
  private _filteredDeviceEndpoints: ZHADeviceEndpoint[] = [];

  @state() private _selectedDevicesToAdd: string[] = [];

  @state() private _selectedDevicesToRemove: string[] = [];

  @query("#addMembers", true)
  private _zhaAddMembersDataTable!: ZHADeviceEndpointDataTable;

  @query("#removeMembers")
  private _zhaRemoveMembersDataTable!: ZHADeviceEndpointDataTable;

  private _firstUpdatedCalled = false;

  public connectedCallback(): void {
    super.connectedCallback();
    if (this.hass && this._firstUpdatedCalled) {
      this._fetchData();
    }
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._processingAdd = false;
    this._processingRemove = false;
    this._selectedDevicesToRemove = [];
    this._selectedDevicesToAdd = [];
    this.deviceEndpoints = [];
    this._filteredDeviceEndpoints = [];
  }

  protected firstUpdated(changedProperties: PropertyValues): void {
    super.firstUpdated(changedProperties);
    if (this.hass) {
      this._fetchData();
    }
    this._firstUpdatedCalled = true;
  }

  protected render() {
    if (!this.group) {
      return html`
        <hass-error-screen
          .hass=${this.hass}
          .error=${this.hass.localize(
            "ui.panel.config.zha.groups.group_not_found"
          )}
        ></hass-error-screen>
      `;
    }

    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.group.name}
      >
        <ha-icon-button
          slot="toolbar-icon"
          .path=${mdiDelete}
          @click=${this._deleteGroup}
          .label=${this.hass.localize("ui.panel.config.zha.groups.delete")}
        ></ha-icon-button>
        <ha-config-section .isWide=${this.isWide}>
          <div class="header">
            ${this.hass.localize("ui.panel.config.zha.groups.group_info")}
          </div>

          <p slot="introduction">
            ${this.hass.localize("ui.panel.config.zha.groups.group_details")}
          </p>

          <p><b>Name:</b> ${this.group.name}</p>
          <p><b>Group Id:</b> ${formatAsPaddedHex(this.group.group_id)}</p>

          <div class="header">
            ${this.hass.localize("ui.panel.config.zha.groups.members")}
          </div>
          <ha-card>
            <ha-list>
              ${this.group.members.length
                ? this.group.members.map(
                    (member) =>
                      html`<a
                        href="/config/devices/device/${member.device
                          .device_reg_id}"
                      >
                        <ha-list-item
                          >${member.device.user_given_name ||
                          member.device.name}</ha-list-item
                        >
                      </a>`
                  )
                : html`
                    <ha-list-item> This group has no members </ha-list-item>
                  `}
            </ha-list>
          </ha-card>
          ${this.group.members.length
            ? html`
                <div class="header">
                  ${this.hass.localize(
                    "ui.panel.config.zha.groups.remove_members"
                  )}
                </div>

                <zha-device-endpoint-data-table
                  id="removeMembers"
                  .hass=${this.hass}
                  .deviceEndpoints=${this.group.members}
                  .narrow=${this.narrow}
                  selectable
                  @selection-changed=${this._handleRemoveSelectionChanged}
                >
                </zha-device-endpoint-data-table>

                <div class="buttons">
                  <ha-button
                    appearance="plain"
                    size="small"
                    variant="danger"
                    .disabled=${!this._selectedDevicesToRemove.length ||
                    this._processingRemove}
                    @click=${this._removeMembersFromGroup}
                    class="button"
                    .loading=${this._processingRemove}
                  >
                    ${this.hass!.localize(
                      "ui.panel.config.zha.groups.remove_members"
                    )}</ha-button
                  >
                </div>
              `
            : nothing}

          <div class="header">
            ${this.hass.localize("ui.panel.config.zha.groups.add_members")}
          </div>

          <zha-device-endpoint-data-table
            id="addMembers"
            .hass=${this.hass}
            .deviceEndpoints=${this._filteredDeviceEndpoints}
            .narrow=${this.narrow}
            selectable
            @selection-changed=${this._handleAddSelectionChanged}
          >
          </zha-device-endpoint-data-table>

          <div class="buttons">
            <ha-button
              appearance="plain"
              size="small"
              .disabled=${!this._selectedDevicesToAdd.length ||
              this._processingAdd}
              @click=${this._addMembersToGroup}
              class="button"
              .loading=${this._processingAdd}
            >
              ${this.hass!.localize(
                "ui.panel.config.zha.groups.add_members"
              )}</ha-button
            >
          </div>
        </ha-config-section>
      </hass-subpage>
    `;
  }

  private async _fetchData() {
    if (this.groupId !== null && this.groupId !== undefined) {
      this.group = await fetchGroup(this.hass!, this.groupId);
    }
    this.deviceEndpoints = await fetchGroupableDevices(this.hass!);
    // filter the groupable devices so we only show devices that aren't already in the group
    this._filterDevices();
  }

  private _filterDevices() {
    // filter the groupable devices so we only show devices that aren't already in the group
    this._filteredDeviceEndpoints = this.deviceEndpoints.filter(
      (deviceEndpoint) =>
        !this.group!.members.some(
          (member) =>
            member.device.ieee === deviceEndpoint.device.ieee &&
            member.endpoint_id === deviceEndpoint.endpoint_id
        )
    );
  }

  private _handleAddSelectionChanged(
    ev: HASSDomEvent<SelectionChangedEvent>
  ): void {
    this._selectedDevicesToAdd = ev.detail.value;
  }

  private _handleRemoveSelectionChanged(
    ev: HASSDomEvent<SelectionChangedEvent>
  ): void {
    this._selectedDevicesToRemove = ev.detail.value;
  }

  private async _addMembersToGroup(): Promise<void> {
    this._processingAdd = true;
    const members = this._selectedDevicesToAdd.map((member) => {
      const memberParts = member.split("_");
      return { ieee: memberParts[0], endpoint_id: memberParts[1] };
    });
    this.group = await addMembersToGroup(this.hass, this.groupId, members);
    this._filterDevices();
    this._selectedDevicesToAdd = [];
    this._zhaAddMembersDataTable.clearSelection();
    this._processingAdd = false;
  }

  private async _removeMembersFromGroup(): Promise<void> {
    this._processingRemove = true;
    const members = this._selectedDevicesToRemove.map((member) => {
      const memberParts = member.split("_");
      return { ieee: memberParts[0], endpoint_id: memberParts[1] };
    });
    this.group = await removeMembersFromGroup(this.hass, this.groupId, members);
    this._filterDevices();
    this._selectedDevicesToRemove = [];
    this._zhaRemoveMembersDataTable.clearSelection();
    this._processingRemove = false;
  }

  private async _deleteGroup(): Promise<void> {
    await removeGroups(this.hass, [this.groupId]);
    navigate(`/config/zha/groups`, { replace: true });
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        hass-subpage {
          --app-header-text-color: var(--sidebar-icon-color);
        }
        .header {
          font-family: var(--ha-font-family-body);
          -webkit-font-smoothing: var(--ha-font-smoothing);
          -moz-osx-font-smoothing: var(--ha-moz-osx-font-smoothing);
          font-size: var(--ha-font-size-4xl);
          font-weight: var(--ha-font-weight-normal);
          line-height: var(--ha-line-height-condensed);
          opacity: var(--dark-primary-opacity);
        }

        .button {
          float: right;
        }

        a {
          color: var(--primary-color);
          text-decoration: none;
        }
        .buttons {
          align-items: flex-end;
          padding: 16px;
        }
        .buttons .warning {
          --mdc-theme-primary: var(--error-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-group-page": ZHAGroupPage;
  }
}

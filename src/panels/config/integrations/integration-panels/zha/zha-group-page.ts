import { mdiDelete } from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import type { HASSDomEvent } from "../../../../../common/dom/fire_event";
import { navigate } from "../../../../../common/navigate";
import "../../../../../components/ha-button";
import "../../../../../components/ha-card";
import "../../../../../components/ha-icon-button";
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
import { formatAsPaddedHex } from "./functions";
import "./zha-device-endpoint-list";
import type {
  DeviceEndpointSelectionChangedEvent,
  ZHADeviceEndpointList,
} from "./zha-device-endpoint-list";

@customElement("zha-group-page")
export class ZHAGroupPage extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Object }) public group?: ZHAGroup;

  @property({ attribute: false }) public groupId!: number;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ attribute: false })
  public deviceEndpoints: ZHADeviceEndpoint[] = [];

  @state() private _processingAdd = false;

  @state() private _processingRemove = false;

  @state()
  private _filteredDeviceEndpoints: ZHADeviceEndpoint[] = [];

  @state() private _selectedDevicesToAdd: string[] = [];

  @state() private _selectedDevicesToRemove: string[] = [];

  @query("#addMembers", true)
  private _zhaAddMembersList!: ZHADeviceEndpointList;

  @query("#removeMembers")
  private _zhaRemoveMembersList!: ZHADeviceEndpointList;

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

  protected firstUpdated(changedProperties: PropertyValues<this>): void {
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
        back-path="/config/zha/groups"
      >
        <ha-icon-button
          slot="toolbar-icon"
          .path=${mdiDelete}
          @click=${this._deleteGroup}
          .label=${this.hass.localize("ui.panel.config.zha.groups.delete")}
        ></ha-icon-button>
        <div class="container">
          <ha-card>
            <div class="card-header">
              ${this.hass.localize("ui.panel.config.zha.groups.group_info")}
            </div>
            <div class="summary-grid">
              <div>
                <span class="summary-label"
                  >${this.hass.localize("ui.common.name")}</span
                >
                <span class="summary-value">${this.group.name}</span>
              </div>
              <div>
                <span class="summary-label"
                  >${this.hass.localize(
                    "ui.panel.config.zha.groups.group_id"
                  )}</span
                >
                <span class="summary-value"
                  >${formatAsPaddedHex(this.group.group_id)}</span
                >
              </div>
              <div>
                <span class="summary-label"
                  >${this.hass.localize(
                    "ui.panel.config.zha.groups.members"
                  )}</span
                >
                <span class="summary-value">${this.group.members.length}</span>
              </div>
            </div>
          </ha-card>

          <div class="device-sections">
            <section>
              <h2>
                ${this.hass.localize("ui.panel.config.zha.groups.members")}
              </h2>
              ${this.group.members.length
                ? html`
                    <zha-device-endpoint-list
                      id="removeMembers"
                      scrollable
                      show-device-link
                      selectable
                      .hass=${this.hass}
                      .deviceEndpoints=${this.group.members}
                      .narrow=${this.narrow}
                      .emptyText=${this.hass.localize(
                        "ui.panel.config.zha.groups.no_members"
                      )}
                      @selection-changed=${this._handleRemoveSelectionChanged}
                    ></zha-device-endpoint-list>

                    <div class="buttons">
                      <ha-button
                        appearance="plain"
                        size="small"
                        variant="danger"
                        .disabled=${!this._selectedDevicesToRemove.length ||
                        this._processingRemove}
                        @click=${this._removeMembersFromGroup}
                        .loading=${this._processingRemove}
                      >
                        ${this.hass!.localize(
                          "ui.panel.config.zha.groups.remove_members"
                        )}</ha-button
                      >
                    </div>
                  `
                : html`
                    <ha-card class="empty-card">
                      ${this.hass.localize(
                        "ui.panel.config.zha.groups.no_members"
                      )}
                    </ha-card>
                  `}
            </section>

            <section>
              <h2>
                ${this.hass.localize("ui.panel.config.zha.groups.add_members")}
              </h2>

              <zha-device-endpoint-list
                id="addMembers"
                scrollable
                show-device-link
                selectable
                .hass=${this.hass}
                .deviceEndpoints=${this._filteredDeviceEndpoints}
                .narrow=${this.narrow}
                .emptyText=${this.hass.localize(
                  "ui.panel.config.zha.groups.no_devices_to_add"
                )}
                @selection-changed=${this._handleAddSelectionChanged}
              ></zha-device-endpoint-list>

              <div class="buttons">
                <ha-button
                  .disabled=${!this._selectedDevicesToAdd.length ||
                  this._processingAdd}
                  @click=${this._addMembersToGroup}
                  .loading=${this._processingAdd}
                >
                  ${this.hass!.localize(
                    "ui.panel.config.zha.groups.add_members"
                  )}</ha-button
                >
              </div>
            </section>
          </div>
        </div>
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
    ev: HASSDomEvent<DeviceEndpointSelectionChangedEvent>
  ): void {
    this._selectedDevicesToAdd = ev.detail.value;
  }

  private _handleRemoveSelectionChanged(
    ev: HASSDomEvent<DeviceEndpointSelectionChangedEvent>
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
    this._zhaAddMembersList.clearSelection();
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
    this._zhaRemoveMembersList.clearSelection();
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

        .container {
          box-sizing: border-box;
          max-width: 1120px;
          margin: 0 auto;
          padding: var(--ha-space-4) var(--ha-space-4)
            calc(var(--ha-space-20) + var(--safe-area-inset-bottom, 0px));
        }

        .card-header {
          padding: var(--ha-space-4) var(--ha-space-4) 0;
          font-size: var(--ha-font-size-xl);
          font-weight: var(--ha-font-weight-medium);
          line-height: var(--ha-line-height-condensed);
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: var(--ha-space-4);
          padding: var(--ha-space-4);
        }

        .summary-label,
        .summary-value {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .summary-label {
          color: var(--secondary-text-color);
          font-size: var(--ha-font-size-s);
          line-height: var(--ha-line-height-condensed);
        }

        .summary-value {
          margin-top: var(--ha-space-1);
          font-size: var(--ha-font-size-l);
          line-height: var(--ha-line-height-condensed);
        }

        zha-device-endpoint-list {
          display: block;
          min-width: 0;
        }

        .device-sections {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: var(--ha-space-6);
          margin-top: var(--ha-space-8);
        }

        .device-sections section {
          min-width: 0;
        }

        h2 {
          margin: 0 0 var(--ha-space-3);
          font-size: var(--ha-font-size-2xl);
          font-weight: var(--ha-font-weight-medium);
          line-height: var(--ha-line-height-condensed);
        }

        .buttons {
          display: flex;
          justify-content: flex-end;
          padding: var(--ha-space-4) 0 0;
        }

        .empty-card {
          padding: var(--ha-space-6);
          color: var(--secondary-text-color);
          text-align: center;
        }

        @media (max-width: 600px) {
          .container {
            padding-inline: var(--ha-space-2);
          }

          .device-sections {
            grid-template-columns: 1fr;
            gap: var(--ha-space-6);
            margin-top: var(--ha-space-6);
          }

          .summary-grid {
            grid-template-columns: 1fr;
            gap: var(--ha-space-2);
          }
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

import "@material/mwc-button";
import { mdiDelete } from "@mdi/js";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  nothing,
} from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { HASSDomEvent } from "../../../../../common/dom/fire_event";
import { navigate } from "../../../../../common/navigate";
import { SelectionChangedEvent } from "../../../../../components/data-table/ha-data-table";
import "../../../../../components/ha-circular-progress";
import "../../../../../components/ha-icon-button";
import {
  addMembersToGroup,
  fetchGroup,
  fetchGroupableDevices,
  removeGroups,
  removeMembersFromGroup,
  ZHADeviceEndpoint,
  ZHAGroup,
} from "../../../../../data/zha";
import "../../../../../layouts/hass-error-screen";
import "../../../../../layouts/hass-subpage";
import { HomeAssistant } from "../../../../../types";
import "../../../ha-config-section";
import { formatAsPaddedHex } from "./functions";
import "./zha-device-endpoint-data-table";
import type { ZHADeviceEndpointDataTable } from "./zha-device-endpoint-data-table";

@customElement("zha-group-page")
export class ZHAGroupPage extends LitElement {
  @property({ type: Object }) public hass!: HomeAssistant;

  @property({ type: Object }) public group?: ZHAGroup;

  @property({ type: Number }) public groupId!: number;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ type: Boolean }) public isWide!: boolean;

  @property({ type: Array }) public deviceEndpoints: ZHADeviceEndpoint[] = [];

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
            ${this.group.members.length
              ? this.group.members.map(
                  (member) =>
                    html`<a
                      href="/config/devices/device/${member.device
                        .device_reg_id}"
                    >
                      <paper-item
                        >${member.device.user_given_name ||
                        member.device.name}</paper-item
                      >
                    </a>`
                )
              : html` <paper-item> This group has no members </paper-item> `}
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
                  <mwc-button
                    .disabled=${!this._selectedDevicesToRemove.length ||
                    this._processingRemove}
                    @click=${this._removeMembersFromGroup}
                    class="button"
                  >
                    <ha-circular-progress
                      ?active=${this._processingRemove}
                      alt=${this.hass.localize(
                        "ui.panel.config.zha.groups.removing_members"
                      )}
                    ></ha-circular-progress>
                    ${this.hass!.localize(
                      "ui.panel.config.zha.groups.remove_members"
                    )}</mwc-button
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
            <mwc-button
              .disabled=${!this._selectedDevicesToAdd.length ||
              this._processingAdd}
              @click=${this._addMembersToGroup}
              class="button"
            >
              ${this._processingAdd
                ? html`<ha-circular-progress
                    active
                    size="small"
                    title="Saving"
                  ></ha-circular-progress>`
                : ""}
              ${this.hass!.localize(
                "ui.panel.config.zha.groups.add_members"
              )}</mwc-button
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
          font-family: var(--paper-font-display1_-_font-family);
          -webkit-font-smoothing: var(
            --paper-font-display1_-_-webkit-font-smoothing
          );
          font-size: var(--paper-font-display1_-_font-size);
          font-weight: var(--paper-font-display1_-_font-weight);
          letter-spacing: var(--paper-font-display1_-_letter-spacing);
          line-height: var(--paper-font-display1_-_line-height);
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
          padding: 8px;
        }
        .buttons .warning {
          --mdc-theme-primary: var(--error-color);
        }
      `,
    ];
  }
}

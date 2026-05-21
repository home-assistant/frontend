import { mdiClose } from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-button";
import "../../../../../components/ha-check-list-item";
import "../../../../../components/ha-dialog";
import "../../../../../components/ha-dialog-footer";
import "../../../../../components/ha-icon-button";
import "../../../../../components/input/ha-input-search";
import "../../../../../components/ha-list";
import "../../../../../components/ha-spinner";
import type { ZHADeviceEndpoint, ZHAGroup } from "../../../../../data/zha";
import {
  addMembersToGroup,
  fetchGroup,
  fetchGroupableDevices,
} from "../../../../../data/zha";
import type { HassDialog } from "../../../../../dialogs/make-dialog-manager";
import type { HomeAssistant } from "../../../../../types";
import type { ZHAAddGroupMembersDialogParams } from "./show-dialog-zha-add-group-members";

@customElement("dialog-zha-add-group-members")
class DialogZHAAddGroupMembers
  extends LitElement
  implements HassDialog<ZHAAddGroupMembersDialogParams>
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _deviceEndpoints: ZHADeviceEndpoint[] = [];

  @state() private _filter = "";

  @state() private _group?: ZHAGroup;

  @state() private _loading = false;

  @state() private _open = false;

  @state() private _params?: ZHAAddGroupMembersDialogParams;

  @state() private _processingAdd = false;

  @state() private _selectedDevicesToAdd: string[] = [];

  private _fetchDataToken = 0;

  public showDialog(params: ZHAAddGroupMembersDialogParams): void {
    this._params = params;
    this._deviceEndpoints = [];
    this._filter = "";
    this._group = undefined;
    this._selectedDevicesToAdd = [];
    this._open = true;
    this._fetchData();
  }

  public closeDialog(): boolean {
    if (this._processingAdd) {
      return false;
    }
    this._open = false;
    return true;
  }

  private _dialogClosed(): void {
    this._params = undefined;
    this._deviceEndpoints = [];
    this._filter = "";
    this._group = undefined;
    this._loading = false;
    this._processingAdd = false;
    this._selectedDevicesToAdd = [];
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this._params) {
      return nothing;
    }

    const deviceEndpoints = this._filteredDeviceEndpoints;
    const showSearch =
      this._availableDeviceEndpoints.length > 5 || this._filter;

    return html`
      <ha-dialog
        .open=${this._open}
        header-title=${this.hass.localize(
          "ui.panel.config.zha.groups.add_members"
        )}
        prevent-scrim-close
        @closed=${this._dialogClosed}
      >
        <ha-icon-button
          slot="headerNavigationIcon"
          .label=${this.hass.localize("ui.common.close")}
          .path=${mdiClose}
          .disabled=${this._processingAdd}
          @click=${this.closeDialog}
        ></ha-icon-button>
        <div class="content">
          ${this._loading
            ? html`<ha-spinner size="large"></ha-spinner>`
            : html`
                ${showSearch
                  ? html`
                      <ha-input-search
                        appearance="outlined"
                        .value=${this._filter}
                        @input=${this._handleFilterChanged}
                      ></ha-input-search>
                    `
                  : nothing}
                <div class="list-container">
                  ${deviceEndpoints.length
                    ? html`
                        <ha-list multi>
                          ${deviceEndpoints.map((deviceEndpoint) => {
                            const id = this._deviceEndpointId(deviceEndpoint);
                            return html`
                              <ha-check-list-item
                                left
                                twoline
                                .value=${id}
                                .selected=${this._selectedDevicesToAdd.includes(
                                  id
                                )}
                                @request-selected=${this._handleSelected}
                              >
                                <span
                                  >${this._deviceEndpointName(
                                    deviceEndpoint
                                  )}</span
                                >
                                <span slot="secondary">
                                  ${this._deviceEndpointDetails(deviceEndpoint)}
                                </span>
                              </ha-check-list-item>
                            `;
                          })}
                        </ha-list>
                      `
                    : html`
                        <div class="empty-list">
                          ${this._filter
                            ? this.hass.localize(
                                "ui.panel.config.zha.groups.no_devices_found"
                              )
                            : this.hass.localize(
                                "ui.panel.config.zha.groups.no_devices_to_add"
                              )}
                        </div>
                      `}
                </div>
              `}
        </div>

        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
            appearance="plain"
            @click=${this.closeDialog}
            .disabled=${this._processingAdd}
          >
            ${this.hass.localize("ui.common.cancel")}
          </ha-button>
          <ha-button
            slot="primaryAction"
            .disabled=${this._loading ||
            !this._selectedDevicesToAdd.length ||
            this._processingAdd}
            .loading=${this._processingAdd}
            @click=${this._addMembersToGroup}
          >
            ${this.hass.localize("ui.panel.config.zha.groups.add_members")}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private get _availableDeviceEndpoints(): ZHADeviceEndpoint[] {
    if (!this._group) {
      return [];
    }

    return this._deviceEndpoints.filter(
      (deviceEndpoint) =>
        !this._group!.members.some(
          (member) =>
            member.device.ieee === deviceEndpoint.device.ieee &&
            member.endpoint_id === deviceEndpoint.endpoint_id
        )
    );
  }

  private get _filteredDeviceEndpoints(): ZHADeviceEndpoint[] {
    const normalizedFilter = this._filter.trim().toLowerCase();
    const deviceEndpoints = this._availableDeviceEndpoints;

    if (!normalizedFilter) {
      return deviceEndpoints;
    }

    return deviceEndpoints.filter((deviceEndpoint) =>
      [
        this._deviceEndpointName(deviceEndpoint),
        this._deviceEndpointDetails(deviceEndpoint),
        deviceEndpoint.device.ieee,
        deviceEndpoint.device.manufacturer,
        deviceEndpoint.device.model,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedFilter))
    );
  }

  private _deviceEndpointId(deviceEndpoint: ZHADeviceEndpoint): string {
    return `${deviceEndpoint.device.ieee}_${deviceEndpoint.endpoint_id}`;
  }

  private _deviceEndpointName(deviceEndpoint: ZHADeviceEndpoint): string {
    return deviceEndpoint.device.user_given_name || deviceEndpoint.device.name;
  }

  private _deviceEndpointDetails(deviceEndpoint: ZHADeviceEndpoint): string {
    const entityNames = deviceEndpoint.entities.map(
      (entity) => entity.name || entity.original_name || entity.entity_id
    );
    const entitySummary = entityNames.length
      ? entityNames.length > 2
        ? `${entityNames.slice(0, 2).join(", ")} +${entityNames.length - 2}`
        : entityNames.join(", ")
      : this.hass.localize("ui.panel.config.zha.groups.no_entities");

    return [
      deviceEndpoint.device.area_id
        ? this.hass.areas[deviceEndpoint.device.area_id]?.name
        : undefined,
      `${this.hass.localize("ui.panel.config.zha.groups.endpoint")} ${
        deviceEndpoint.endpoint_id
      }`,
      entitySummary,
    ]
      .filter(Boolean)
      .join(" · ");
  }

  private async _fetchData(): Promise<void> {
    const token = ++this._fetchDataToken;
    this._loading = true;
    const [group, deviceEndpoints] = await Promise.all([
      fetchGroup(this.hass, this._params!.groupId),
      fetchGroupableDevices(this.hass),
    ]);

    if (token !== this._fetchDataToken || !this._params) {
      return;
    }

    this._group = group;
    this._deviceEndpoints = deviceEndpoints;
    this._loading = false;
  }

  private _handleFilterChanged(ev: Event): void {
    this._filter = (ev.currentTarget as HTMLInputElement).value;
  }

  private _handleSelected(ev): void {
    const deviceId = ev.currentTarget.value;
    if (ev.detail.selected) {
      if (this._selectedDevicesToAdd.includes(deviceId)) {
        return;
      }
      this._selectedDevicesToAdd = [...this._selectedDevicesToAdd, deviceId];
      return;
    }
    this._selectedDevicesToAdd = this._selectedDevicesToAdd.filter(
      (selectedDeviceId) => selectedDeviceId !== deviceId
    );
  }

  private async _addMembersToGroup(): Promise<void> {
    this._processingAdd = true;
    try {
      const members = this._selectedDevicesToAdd.map((member) => {
        const memberParts = member.split("_");
        return { ieee: memberParts[0], endpoint_id: memberParts[1] };
      });
      const group = await addMembersToGroup(
        this.hass,
        this._params!.groupId,
        members
      );
      this._params!.devicesAddedCallback(group);
      this._processingAdd = false;
      this.closeDialog();
    } finally {
      this._processingAdd = false;
    }
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        ha-dialog {
          --dialog-content-padding: 0;
        }

        .content {
          display: flex;
          flex-direction: column;
          height: min(520px, calc(100vh - 240px));
        }

        ha-input-search {
          display: block;
          margin: 0 var(--ha-space-4) var(--ha-space-2);
        }

        ha-list {
          display: block;
        }

        .list-container {
          flex: 1 1 auto;
          min-height: 0;
          overflow-y: auto;
        }

        ha-check-list-item {
          --mdc-list-item-meta-size: 40px;
          --mdc-list-item-secondary-text-color: var(--secondary-text-color);
        }

        ha-spinner {
          display: flex;
          justify-content: center;
          margin: var(--ha-space-8) 0;
        }

        .empty-list {
          padding: var(--ha-space-6);
          color: var(--secondary-text-color);
          text-align: center;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-zha-add-group-members": DialogZHAAddGroupMembers;
  }
}

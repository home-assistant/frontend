import type { RenderItemFunction } from "@lit-labs/virtualizer/virtualize";
import { mdiClose } from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-button";
import "../../../../../components/ha-dialog";
import "../../../../../components/ha-dialog-footer";
import "../../../../../components/ha-icon-button";
import "../../../../../components/input/ha-input-search";
import "../../../../../components/item/ha-list-item-option";
import type { HaListItemOption } from "../../../../../components/item/ha-list-item-option";
import "../../../../../components/list/ha-list-selectable";
import type { HaListSelectable } from "../../../../../components/list/ha-list-selectable";
import type { HaListSelectedDetail } from "../../../../../components/list/types";
import "../../../../../components/ha-spinner";
import type { ZHADeviceEndpoint, ZHAGroup } from "../../../../../data/zha";
import {
  addMembersToGroup,
  fetchGroup,
  fetchGroupableDevices,
} from "../../../../../data/zha";
import type { HassDialog } from "../../../../../dialogs/make-dialog-manager";
import { haStyleScrollbar } from "../../../../../resources/styles";
import { loadVirtualizer } from "../../../../../resources/virtualizer";
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

  @state() private _virtualizerReady = false;

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
    this._virtualizerReady = false;
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
        ?prevent-scrim-close=${this._selectedDevicesToAdd.length > 0}
        @after-show=${this._loadVirtualizer}
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
            ? this._renderLoadingSpinner()
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
                        ${this._virtualizerReady
                          ? html`
                              <ha-list-selectable
                                multi
                                @ha-list-selected=${this._handleSelected}
                              >
                                <lit-virtualizer
                                  scroller
                                  class="ha-scrollbar"
                                  .items=${deviceEndpoints}
                                  .renderItem=${this._renderDeviceEndpoint}
                                  .keyFunction=${this._keyFunction}
                                ></lit-virtualizer>
                              </ha-list-selectable>
                            `
                          : this._renderLoadingSpinner()}
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

  private _renderLoadingSpinner(): TemplateResult {
    return html`
      <div class="spinner-container">
        <ha-spinner size="medium"></ha-spinner>
      </div>
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

  private async _loadVirtualizer(): Promise<void> {
    await loadVirtualizer();
    this._virtualizerReady = true;
  }

  private _keyFunction = (deviceEndpoint: unknown): string =>
    this._deviceEndpointId(deviceEndpoint as ZHADeviceEndpoint);

  private _renderDeviceEndpoint: RenderItemFunction<ZHADeviceEndpoint> = (
    deviceEndpoint
  ) => {
    const id = this._deviceEndpointId(deviceEndpoint);

    return html`
      <ha-list-item-option
        appearance="checkbox"
        .value=${id}
        .selected=${this._selectedDevicesToAdd.includes(id)}
      >
        <span slot="headline">${this._deviceEndpointName(deviceEndpoint)}</span>
        <span slot="supporting-text">
          ${this._deviceEndpointDetails(deviceEndpoint)}
        </span>
      </ha-list-item-option>
    `;
  };

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

  private _handleSelected(ev: CustomEvent<HaListSelectedDetail>): void {
    const list = ev.currentTarget as HaListSelectable;
    let selectedDevicesToAdd = this._selectedDevicesToAdd;

    ev.detail.diff?.added.forEach((index) => {
      const item = list.items[index] as HaListItemOption | undefined;
      if (item?.value && !selectedDevicesToAdd.includes(item.value)) {
        selectedDevicesToAdd = [...selectedDevicesToAdd, item.value];
      }
    });

    ev.detail.diff?.removed.forEach((index) => {
      const item = list.items[index] as HaListItemOption | undefined;
      if (item?.value) {
        selectedDevicesToAdd = selectedDevicesToAdd.filter(
          (selectedDeviceId) => selectedDeviceId !== item.value
        );
      }
    });

    this._selectedDevicesToAdd = selectedDevicesToAdd;
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
      haStyleScrollbar,
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

        ha-list-selectable {
          display: block;
          width: 100%;
          height: 100%;
        }

        ha-list-selectable::part(base) {
          width: 100%;
          height: 100%;
        }

        .list-container {
          flex: 1 1 auto;
          width: 100%;
          min-height: 0;
          overflow: hidden;
        }

        lit-virtualizer {
          display: block;
          width: 100%;
          height: 100%;
          contain: size layout !important;
        }

        ha-list-item-option {
          display: block;
          width: 100%;
          height: 64px;
          box-sizing: border-box;
          --ha-row-item-min-height: 64px;
        }

        .spinner-container {
          display: flex;
          flex: 1 1 auto;
          align-items: center;
          justify-content: center;
          min-height: 160px;
        }

        ha-spinner {
          display: block;
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

import { mdiDelete, mdiPlus } from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import type { HASSDomEvent } from "../../../../../common/dom/fire_event";
import { navigate } from "../../../../../common/navigate";
import "../../../../../components/ha-button";
import "../../../../../components/ha-card";
import "../../../../../components/ha-icon-button";
import "../../../../../components/ha-svg-icon";
import type { ZHAGroup } from "../../../../../data/zha";
import {
  fetchGroup,
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
import { showZHAAddGroupMembersDialog } from "./show-dialog-zha-add-group-members";

@customElement("zha-group-page")
export class ZHAGroupPage extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Object }) public group?: ZHAGroup;

  @property({ attribute: false }) public groupId!: number;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @state() private _processingRemove = false;

  @state() private _selectedDevicesToRemove: string[] = [];

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
    this._processingRemove = false;
    this._selectedDevicesToRemove = [];
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

          <div class="members-section">
            <h2>${this.hass.localize("ui.panel.config.zha.groups.members")}</h2>
            ${this.group.members.length
              ? html`
                  <zha-device-endpoint-list
                    id="removeMembers"
                    scrollable
                    show-device-link
                    selectable
                    .deviceEndpoints=${this.group.members}
                    .narrow=${this.narrow}
                    .emptyText=${this.hass.localize(
                      "ui.panel.config.zha.groups.no_members"
                    )}
                    @selection-changed=${this._handleRemoveSelectionChanged}
                  ></zha-device-endpoint-list>
                `
              : html`
                  <ha-card class="empty-card">
                    ${this.hass.localize(
                      "ui.panel.config.zha.groups.no_members"
                    )}
                  </ha-card>
                `}
            <div class="buttons">
              ${this.group.members.length
                ? html`
                    <ha-button
                      appearance="plain"
                      variant="danger"
                      .disabled=${!this._selectedDevicesToRemove.length ||
                      this._processingRemove}
                      @click=${this._removeMembersFromGroup}
                      .loading=${this._processingRemove}
                    >
                      ${this.hass.localize(
                        "ui.panel.config.zha.groups.remove_members"
                      )}
                    </ha-button>
                  `
                : nothing}
              <ha-button @click=${this._showAddMembersDialog}>
                <ha-svg-icon slot="start" .path=${mdiPlus}></ha-svg-icon>
                ${this.hass.localize("ui.panel.config.zha.groups.add_members")}
              </ha-button>
            </div>
          </div>
        </div>
      </hass-subpage>
    `;
  }

  private _showAddMembersDialog(): void {
    showZHAAddGroupMembersDialog(this, {
      groupId: this.groupId,
      groupName: this.group!.name,
      devicesAddedCallback: (group) => {
        this.group = group;
        this._selectedDevicesToRemove = [];
        this._zhaRemoveMembersList?.clearSelection();
      },
    });
  }

  private async _fetchData() {
    if (this.groupId !== null && this.groupId !== undefined) {
      this.group = await fetchGroup(this.hass, this.groupId);
    }
  }

  private _handleRemoveSelectionChanged(
    ev: HASSDomEvent<DeviceEndpointSelectionChangedEvent>
  ): void {
    this._selectedDevicesToRemove = ev.detail.value;
  }

  private async _removeMembersFromGroup(): Promise<void> {
    this._processingRemove = true;
    const members = this._selectedDevicesToRemove.map((member) => {
      const memberParts = member.split("_");
      return { ieee: memberParts[0], endpoint_id: memberParts[1] };
    });
    this.group = await removeMembersFromGroup(this.hass, this.groupId, members);
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
          max-width: 720px;
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

        .members-section {
          margin-top: var(--ha-space-6);
        }

        h2 {
          margin: 0 0 var(--ha-space-3);
          font-size: var(--ha-font-size-2xl);
          font-weight: var(--ha-font-weight-medium);
          line-height: var(--ha-line-height-condensed);
        }

        .buttons {
          display: flex;
          gap: var(--ha-space-2);
          justify-content: flex-end;
          padding: var(--ha-space-4) 0 0;
        }

        .empty-card {
          padding: var(--ha-space-6);
          color: var(--secondary-text-color);
          text-align: center;
        }

        @media (max-width: 600px) {
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

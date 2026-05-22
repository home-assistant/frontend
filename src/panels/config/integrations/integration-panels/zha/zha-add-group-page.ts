import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state, query } from "lit/decorators";
import type { HASSDomEvent } from "../../../../../common/dom/fire_event";
import { navigate } from "../../../../../common/navigate";
import "../../../../../components/ha-button";
import "../../../../../components/ha-card";
import "../../../../../components/input/ha-input";
import type { ZHADeviceEndpoint, ZHAGroup } from "../../../../../data/zha";
import { addGroup, fetchGroupableDevices } from "../../../../../data/zha";
import "../../../../../layouts/hass-subpage";
import type { HomeAssistant } from "../../../../../types";
import "./zha-device-endpoint-list";
import type {
  DeviceEndpointSelectionChangedEvent,
  ZHADeviceEndpointList,
} from "./zha-device-endpoint-list";

@customElement("zha-add-group-page")
export class ZHAAddGroupPage extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false })
  public deviceEndpoints: ZHADeviceEndpoint[] = [];

  @state() private _processingAdd = false;

  @state() private _groupName = "";

  @state() private _groupId?: string;

  @query("zha-device-endpoint-list", true)
  private _zhaDeviceEndpointList!: ZHADeviceEndpointList;

  private _firstUpdatedCalled = false;

  private _selectedDevicesToAdd: string[] = [];

  public connectedCallback(): void {
    super.connectedCallback();
    if (this.hass && this._firstUpdatedCalled) {
      this._fetchData();
    }
  }

  protected firstUpdated(changedProperties: PropertyValues<this>): void {
    super.firstUpdated(changedProperties);
    if (this.hass) {
      this._fetchData();
    }
    this._firstUpdatedCalled = true;
  }

  protected render() {
    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.hass.localize("ui.panel.config.zha.groups.create_group")}
        back-path="/config/zha/groups"
      >
        <div class="container">
          <ha-card class="details-card">
            <div class="card-header">
              ${this.hass.localize("ui.panel.config.zha.groups.group_info")}
            </div>
            <div class="card-content">
              <ha-input
                type="text"
                .value=${this._groupName}
                @change=${this._handleNameChange}
                .placeholder=${this.hass!.localize(
                  "ui.panel.config.zha.groups.group_name_placeholder"
                )}
              ></ha-input>

              <ha-input
                type="number"
                .value=${this._groupId}
                @change=${this._handleGroupIdChange}
                .placeholder=${this.hass!.localize(
                  "ui.panel.config.zha.groups.group_id_placeholder"
                )}
              ></ha-input>
            </div>
          </ha-card>

          <section>
            <h2>
              ${this.hass.localize("ui.panel.config.zha.groups.add_members")}
            </h2>

            <zha-device-endpoint-list
              scrollable
              show-device-link
              .deviceEndpoints=${this.deviceEndpoints}
              .narrow=${this.narrow}
              .emptyText=${this.hass.localize(
                "ui.panel.config.zha.groups.no_devices_to_add"
              )}
              selectable
              @selection-changed=${this._handleAddSelectionChanged}
            >
            </zha-device-endpoint-list>

            <div class="buttons">
              <ha-button
                .disabled=${!this._groupName ||
                this._groupName === "" ||
                this._processingAdd}
                @click=${this._createGroup}
                .loading=${this._processingAdd}
              >
                ${this.hass!.localize(
                  "ui.panel.config.zha.groups.create"
                )}</ha-button
              >
            </div>
          </section>
        </div>
      </hass-subpage>
    `;
  }

  private async _fetchData() {
    this.deviceEndpoints = await fetchGroupableDevices(this.hass!);
  }

  private _handleAddSelectionChanged(
    ev: HASSDomEvent<DeviceEndpointSelectionChangedEvent>
  ): void {
    this._selectedDevicesToAdd = ev.detail.value;
  }

  private async _createGroup(): Promise<void> {
    this._processingAdd = true;
    const members = this._selectedDevicesToAdd.map((member) => {
      const memberParts = member.split("_");
      return { ieee: memberParts[0], endpoint_id: memberParts[1] };
    });
    const groupId = this._groupId
      ? parseInt(this._groupId as string, 10)
      : undefined;
    const group: ZHAGroup = await addGroup(
      this.hass,
      this._groupName,
      groupId,
      members
    );
    this._selectedDevicesToAdd = [];
    this._processingAdd = false;
    this._groupName = "";
    this._zhaDeviceEndpointList.clearSelection();
    navigate(`/config/zha/group/${group.group_id}`, { replace: true });
  }

  private _handleGroupIdChange(event: InputEvent) {
    this._groupId = (event.target as HTMLInputElement).value;
  }

  private _handleNameChange(event: InputEvent) {
    this._groupName = (event.target as HTMLInputElement).value || "";
  }

  static get styles(): CSSResultGroup {
    return [
      css`
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

        .card-content {
          display: grid;
          gap: var(--ha-space-4);
          padding: var(--ha-space-4);
        }

        section {
          margin-top: var(--ha-space-8);
        }

        h2 {
          margin: 0 0 var(--ha-space-3);
          font-family: var(--ha-font-family-body);
          font-size: var(--ha-font-size-2xl);
          font-weight: var(--ha-font-weight-medium);
          line-height: var(--ha-line-height-condensed);
        }

        zha-device-endpoint-list {
          display: block;
          min-width: 0;
        }

        .buttons {
          display: flex;
          justify-content: flex-end;
          padding: var(--ha-space-4) 0 0;
        }

        @media (max-width: 600px) {
          .container {
            padding-inline: var(--ha-space-2);
          }
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-add-group-page": ZHAAddGroupPage;
  }
}

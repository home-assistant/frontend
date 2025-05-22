import "@material/mwc-button";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state, query } from "lit/decorators";
import type { HASSDomEvent } from "../../../../../common/dom/fire_event";
import { navigate } from "../../../../../common/navigate";
import type { SelectionChangedEvent } from "../../../../../components/data-table/ha-data-table";
import "../../../../../components/ha-spinner";
import type { ZHADeviceEndpoint, ZHAGroup } from "../../../../../data/zha";
import { addGroup, fetchGroupableDevices } from "../../../../../data/zha";
import "../../../../../layouts/hass-subpage";
import type { HomeAssistant } from "../../../../../types";
import "../../../ha-config-section";
import "../../../../../components/ha-textfield";
import "./zha-device-endpoint-data-table";
import type { ZHADeviceEndpointDataTable } from "./zha-device-endpoint-data-table";

@customElement("zha-add-group-page")
export class ZHAAddGroupPage extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false, type: Array })
  public deviceEndpoints: ZHADeviceEndpoint[] = [];

  @state() private _processingAdd = false;

  @state() private _groupName = "";

  @state() private _groupId?: string;

  @query("zha-device-endpoint-data-table", true)
  private _zhaDevicesDataTable!: ZHADeviceEndpointDataTable;

  private _firstUpdatedCalled = false;

  private _selectedDevicesToAdd: string[] = [];

  public connectedCallback(): void {
    super.connectedCallback();
    if (this.hass && this._firstUpdatedCalled) {
      this._fetchData();
    }
  }

  protected firstUpdated(changedProperties: PropertyValues): void {
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
      >
        <ha-config-section .isWide=${!this.narrow}>
          <p slot="introduction">
            ${this.hass.localize(
              "ui.panel.config.zha.groups.create_group_details"
            )}
          </p>
          <ha-textfield
            type="string"
            .value=${this._groupName}
            @change=${this._handleNameChange}
            .placeholder=${this.hass!.localize(
              "ui.panel.config.zha.groups.group_name_placeholder"
            )}
          ></ha-textfield>

          <ha-textfield
            type="number"
            .value=${this._groupId}
            @change=${this._handleGroupIdChange}
            .placeholder=${this.hass!.localize(
              "ui.panel.config.zha.groups.group_id_placeholder"
            )}
          ></ha-textfield>

          <div class="header">
            ${this.hass.localize("ui.panel.config.zha.groups.add_members")}
          </div>

          <zha-device-endpoint-data-table
            .hass=${this.hass}
            .deviceEndpoints=${this.deviceEndpoints}
            .narrow=${this.narrow}
            selectable
            @selection-changed=${this._handleAddSelectionChanged}
          >
          </zha-device-endpoint-data-table>

          <div class="buttons">
            <mwc-button
              .disabled=${!this._groupName ||
              this._groupName === "" ||
              this._processingAdd}
              @click=${this._createGroup}
              class="button"
            >
              ${this._processingAdd
                ? html`<ha-spinner
                    size="small"
                    .ariaLabel=${this.hass!.localize(
                      "ui.panel.config.zha.groups.creating_group"
                    )}
                  ></ha-spinner>`
                : ""}
              ${this.hass!.localize(
                "ui.panel.config.zha.groups.create"
              )}</mwc-button
            >
          </div>
        </ha-config-section>
      </hass-subpage>
    `;
  }

  private async _fetchData() {
    this.deviceEndpoints = await fetchGroupableDevices(this.hass!);
  }

  private _handleAddSelectionChanged(
    ev: HASSDomEvent<SelectionChangedEvent>
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
    this._zhaDevicesDataTable.clearSelection();
    navigate(`/config/zha/group/${group.group_id}`, { replace: true });
  }

  private _handleGroupIdChange(event) {
    this._groupId = event.target.value;
  }

  private _handleNameChange(event) {
    this._groupName = event.target.value || "";
  }

  static get styles(): CSSResultGroup {
    return [
      css`
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

        ha-config-section *:last-child {
          padding-bottom: 24px;
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

declare global {
  interface HTMLElementTagNameMap {
    "zha-add-group-page": ZHAAddGroupPage;
  }
}

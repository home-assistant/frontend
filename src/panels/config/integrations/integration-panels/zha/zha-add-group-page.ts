import "@material/mwc-button";
import "@polymer/paper-input/paper-input";
import type { PaperInputElement } from "@polymer/paper-input/paper-input";
import { css, CSSResultGroup, html, LitElement, PropertyValues } from "lit";
import { customElement, property, state, query } from "lit/decorators";
import type { HASSDomEvent } from "../../../../../common/dom/fire_event";
import { navigate } from "../../../../../common/navigate";
import type { SelectionChangedEvent } from "../../../../../components/data-table/ha-data-table";
import "../../../../../components/ha-circular-progress";
import {
  addGroup,
  fetchGroupableDevices,
  ZHADeviceEndpoint,
  ZHAGroup,
} from "../../../../../data/zha";
import "../../../../../layouts/hass-subpage";
import type { ValueChangedEvent, HomeAssistant } from "../../../../../types";
import "../../../ha-config-section";
import "./zha-device-endpoint-data-table";
import type { ZHADeviceEndpointDataTable } from "./zha-device-endpoint-data-table";

@customElement("zha-add-group-page")
export class ZHAAddGroupPage extends LitElement {
  @property({ type: Object }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ type: Array }) public deviceEndpoints: ZHADeviceEndpoint[] = [];

  @state() private _processingAdd = false;

  @state() private _groupName = "";

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
          <paper-input
            type="string"
            .value=${this._groupName}
            @value-changed=${this._handleNameChange}
            placeholder=${this.hass!.localize(
              "ui.panel.config.zha.groups.group_name_placeholder"
            )}
          ></paper-input>

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
                ? html`<ha-circular-progress
                    active
                    size="small"
                    .title=${this.hass!.localize(
                      "ui.panel.config.zha.groups.creating_group"
                    )}
                  ></ha-circular-progress>`
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
    const group: ZHAGroup = await addGroup(this.hass, this._groupName, members);
    this._selectedDevicesToAdd = [];
    this._processingAdd = false;
    this._groupName = "";
    this._zhaDevicesDataTable.clearSelection();
    navigate(`/config/zha/group/${group.group_id}`, { replace: true });
  }

  private _handleNameChange(ev: ValueChangedEvent<string>) {
    const target = ev.currentTarget as PaperInputElement;
    this._groupName = target.value || "";
  }

  static get styles(): CSSResultGroup {
    return [
      css`
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

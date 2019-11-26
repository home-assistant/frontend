import {
  property,
  LitElement,
  html,
  customElement,
  css,
  CSSResult,
} from "lit-element";

import memoizeOne from "memoize-one";

import "../../../layouts/hass-subpage";
import "../../../layouts/hass-error-screen";
import "../ha-config-section";
import { HomeAssistant } from "../../../types";
import { haStyleDialog } from "../../../resources/styles";
import {
  ZHADevice,
  ZHAGroup,
  fetchGroup,
  fetchDevices,
  addMembersToGroup,
  removeMembersFromGroup,
  removeGroups,
} from "../../../data/zha";
import { formatAsPaddedHex } from "./functions";
import "./zha-devices-data-table";
import { SelectionChangedEvent } from "../../../components/data-table/ha-data-table";
import { navigate } from "../../../common/navigate";

@customElement("zha-group-page")
export class ZHAGroupPage extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public group!: ZHAGroup;
  @property() public devices: ZHADevice[] = [];
  @property() public groupId!: number;
  @property() public narrow!: boolean;
  @property() private _canAdd: boolean = false;
  @property() private _processingAdd: boolean = false;
  @property() private _canRemove: boolean = false;
  @property() private _processingRemove: boolean = false;

  private _selectedDevicesToAdd: string[] = [];
  private _selectedDevicesToRemove: string[] = [];

  private _members = memoizeOne(
    (group: ZHAGroup): ZHADevice[] => group.members
  );

  public connectedCallback(): void {
    super.connectedCallback();
    this._fetchData();
  }

  protected render() {
    if (!this.group) {
      return html`
        <hass-error-screen
          error="${this.hass.localize(
            "ui.panel.config.devices.device_not_found"
          )}"
        ></hass-error-screen>
      `;
    }

    const members = this._members(this.group);

    return html`
      <hass-subpage .header=${this.group.name}>
        <paper-icon-button
          slot="toolbar-icon"
          icon="hass:delete"
          @click=${this._deleteGroup}
        ></paper-icon-button>
        <ha-config-section .isWide=${!this.narrow}>
          <div class="header">
            ${this.hass.localize("ui.panel.config.zha.common.group_info")}
          </div>
          <span slot="introduction">
            ${this.hass.localize("ui.panel.config.zha.common.group_details")}
          </span>
          <span> <b>Name:</b> ${this.group.name} </span>
          <span>
            <b>Group Id:</b> ${formatAsPaddedHex(this.group.group_id)}
          </span>
          <div class="header">
            ${this.hass.localize("ui.panel.config.zha.common.members")}
          </div>

          ${members.length
            ? members.map(
                (member) => html`
                  <zha-device-card
                    class="card"
                    .hass=${this.hass}
                    .device=${member}
                    .narrow=${this.narrow}
                  ></zha-device-card>
                `
              )
            : html`
                <span>
                  This group has no members
                </span>
              `}
          ${members.length
            ? html`
                <div class="header">
                  ${this.hass.localize(
                    "ui.panel.config.zha.common.remove_members"
                  )}
                </div>

                <zha-devices-data-table
                  .hass=${this.hass}
                  .devices=${members}
                  .narrow=${this.narrow}
                  .selectable=${true}
                  @selection-changed=${this._handleRemoveSelectionChanged}
                  class="table"
                >
                </zha-devices-data-table>

                <div class="paper-dialog-buttons">
                  <mwc-button
                    ?disabled="${!this._canRemove}"
                    @click="${this._removeMembersFromGroup}"
                    class="button"
                  >
                    <paper-spinner
                      ?active="${this._processingRemove}"
                      alt="Removing Members"
                    ></paper-spinner>
                    ${this.hass!.localize(
                      "ui.panel.config.zha.common.remove_members"
                    )}</mwc-button
                  >
                </div>
              `
            : html``}

          <div class="header">
            ${this.hass.localize("ui.panel.config.zha.common.add_members")}
          </div>

          <zha-devices-data-table
            .hass=${this.hass}
            .devices=${this.devices}
            .narrow=${this.narrow}
            .selectable=${true}
            @selection-changed=${this._handleAddSelectionChanged}
            class="table"
          >
          </zha-devices-data-table>

          <div class="paper-dialog-buttons">
            <mwc-button
              ?disabled="${!this._canAdd}"
              @click="${this._addMembersToGroup}"
              class="button"
            >
              <paper-spinner
                ?active="${this._processingAdd}"
                alt="Adding Members"
              ></paper-spinner>
              ${this.hass!.localize(
                "ui.panel.config.zha.common.add_members"
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
    this.devices = await fetchDevices(this.hass!);
  }

  private _handleAddSelectionChanged(ev: CustomEvent): void {
    const changedSelection = ev.detail as SelectionChangedEvent;
    const entity = changedSelection.id;
    if (changedSelection.selected) {
      this._selectedDevicesToAdd.push(entity);
    } else {
      const index = this._selectedDevicesToAdd.indexOf(entity);
      if (index !== -1) {
        this._selectedDevicesToAdd.splice(index, 1);
      }
    }
    this._canAdd = this._selectedDevicesToAdd.length > 0;
  }

  private _handleRemoveSelectionChanged(ev: CustomEvent): void {
    const changedSelection = ev.detail as SelectionChangedEvent;
    const entity = changedSelection.id;
    if (changedSelection.selected) {
      this._selectedDevicesToRemove.push(entity);
    } else {
      const index = this._selectedDevicesToRemove.indexOf(entity);
      if (index !== -1) {
        this._selectedDevicesToRemove.splice(index, 1);
      }
    }
    this._canRemove = this._selectedDevicesToRemove.length > 0;
  }

  private async _addMembersToGroup(ev: CustomEvent): Promise<void> {
    this._processingAdd = true;
    this.group = await addMembersToGroup(
      this.hass,
      this.groupId,
      this._selectedDevicesToAdd
    );
    this._selectedDevicesToAdd = [];
    this._canAdd = false;
    this._processingAdd = false;
  }

  private async _removeMembersFromGroup(ev: CustomEvent): Promise<void> {
    this._processingRemove = true;
    this.group = await removeMembersFromGroup(
      this.hass,
      this.groupId,
      this._selectedDevicesToRemove
    );
    this._selectedDevicesToRemove = [];
    this._canRemove = false;
    this._processingRemove = false;
  }

  private async _deleteGroup(ev: CustomEvent): Promise<void> {
    await removeGroups(this.hass, [this.groupId]);
    navigate(this, `/config/zha/groups`);
  }

  static get styles(): CSSResult[] {
    return [
      haStyleDialog,
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

        .table {
          height: 200px;
          overflow: auto;
        }

        ha-config-section *:last-child {
          padding-bottom: 24px;
        }
        mwc-button paper-spinner {
          width: 14px;
          height: 14px;
          margin-right: 20px;
        }
        paper-spinner {
          display: none;
        }
        paper-spinner[active] {
          display: block;
        }
      `,
    ];
  }
}

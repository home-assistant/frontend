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
} from "../../../data/zha";
import { formatAsPaddedHex } from "./functions";
import "./zha-devices-data-table";
import { SelectionChangedEvent } from "../../../components/data-table/ha-data-table";

@customElement("zha-group-page")
export class ZHAGroupPage extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public group!: ZHAGroup;
  @property() public devices!: ZHADevice[];
  @property() public groupId!: number;
  @property() public narrow!: boolean;
  @property() private _canSave: boolean = false;
  @property() private _processing: boolean = false;

  private _selectedDevices: string[] = [];

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
          icon="hass:settings"
        ></paper-icon-button>
        <ha-config-section .isWide=${!this.narrow}>
          <span slot="header"
            >${this.hass.localize(
              "ui.panel.config.zha.common.group_info"
            )}</span
          >
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
          <div class="header">
            ${this.hass.localize("ui.panel.config.zha.common.add_members")}
          </div>

          <zha-devices-data-table
            .hass=${this.hass}
            .devices=${this.devices}
            .narrow=${this.narrow}
            .selectable=${true}
            @selection-changed=${this._handleSelectionChanged}
          >
          </zha-devices-data-table>

          <div class="paper-dialog-buttons">
            <mwc-button
              ?disabled="${!this._canSave}"
              @click="${this._addMembersToGroup}"
            >
              <paper-spinner
                ?active="${this._processing}"
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

  private _handleSelectionChanged(ev: CustomEvent): void {
    const changedSelection = ev.detail as SelectionChangedEvent;
    const entity = changedSelection.id;
    if (changedSelection.selected) {
      this._selectedDevices.push(entity);
    } else {
      const index = this._selectedDevices.indexOf(entity);
      if (index !== -1) {
        this._selectedDevices.splice(index, 1);
      }
    }
    this._canSave = this._selectedDevices.length > 0;
  }

  private _addMembersToGroup(ev: CustomEvent): void {}

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

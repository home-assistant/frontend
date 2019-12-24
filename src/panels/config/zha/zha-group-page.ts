import {
  property,
  LitElement,
  html,
  customElement,
  css,
  CSSResult,
  PropertyValues,
} from "lit-element";

import memoizeOne from "memoize-one";

import "../../../layouts/hass-subpage";
import "../../../layouts/hass-error-screen";
import "../ha-config-section";
import { HomeAssistant } from "../../../types";
import {
  ZHADevice,
  ZHAGroup,
  fetchGroup,
  removeGroups,
} from "../../../data/zha";
import { formatAsPaddedHex } from "./functions";
import "./zha-device-card";
import { navigate } from "../../../common/navigate";
import "@polymer/paper-icon-button/paper-icon-button";

@customElement("zha-group-page")
export class ZHAGroupPage extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public group?: ZHAGroup;
  @property() public groupId!: number;
  @property() public narrow!: boolean;
  private _firstUpdatedCalled: boolean = false;

  private _members = memoizeOne(
    (group: ZHAGroup): ZHADevice[] => group.members
  );

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
    if (!this.group) {
      return html`
        <hass-error-screen
          error="${this.hass.localize(
            "ui.panel.config.zha.groups.group_not_found"
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
            ${this.hass.localize("ui.panel.config.zha.groups.group_info")}
          </div>
          <span slot="introduction">
            ${this.hass.localize("ui.panel.config.zha.groups.group_details")}
          </span>
          <span> <b>Name:</b> ${this.group.name} </span>
          <span>
            <b>Group Id:</b> ${formatAsPaddedHex(this.group.group_id)}
          </span>
          <div class="header">
            ${this.hass.localize("ui.panel.config.zha.groups.members")}
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
        </ha-config-section>
      </hass-subpage>
    `;
  }

  private async _fetchData() {
    if (this.groupId !== null && this.groupId !== undefined) {
      this.group = await fetchGroup(this.hass!, this.groupId);
    }
  }

  private async _deleteGroup(): Promise<void> {
    await removeGroups(this.hass, [this.groupId]);
    navigate(this, `/config/zha/groups`, true);
  }

  static get styles(): CSSResult[] {
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

        ha-config-section *:last-child {
          padding-bottom: 24px;
        }
      `,
    ];
  }
}

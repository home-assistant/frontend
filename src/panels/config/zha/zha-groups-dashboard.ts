import "./zha-groups-data-table";

import {
  LitElement,
  html,
  TemplateResult,
  property,
  customElement,
  CSSResult,
  css,
  PropertyValues,
} from "lit-element";
import { HomeAssistant } from "../../../types";
import { ZHAGroup, fetchGroups, removeGroups } from "../../../data/zha";
import { sortZHAGroups } from "./functions";
import { SelectionChangedEvent } from "../../../components/data-table/ha-data-table";
import "@material/mwc-button";
import "@polymer/paper-spinner/paper-spinner";
import "@polymer/paper-icon-button/paper-icon-button";
import { navigate } from "../../../common/navigate";
import "../../../layouts/hass-subpage";

@customElement("zha-groups-dashboard")
export class ZHAGroupsDashboard extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public narrow = false;
  @property() public _groups?: ZHAGroup[];
  @property() private _processingRemove: boolean = false;
  @property() private _selectedGroupsToRemove: number[] = [];
  private _firstUpdatedCalled: boolean = false;

  public connectedCallback(): void {
    super.connectedCallback();
    if (this.hass && this._firstUpdatedCalled) {
      this._fetchGroups();
    }
  }

  protected firstUpdated(changedProperties: PropertyValues): void {
    super.firstUpdated(changedProperties);
    if (this.hass) {
      this._fetchGroups();
    }
    this._firstUpdatedCalled = true;
  }

  protected render(): TemplateResult {
    return html`
      <hass-subpage
        header="${this.hass!.localize(
          "ui.panel.config.zha.groups.groups-header"
        )}"
      >
        <paper-icon-button
          slot="toolbar-icon"
          icon="hass:plus"
          @click=${this._addGroup}
        ></paper-icon-button>

        <div class="content">
          ${this._groups
            ? html`
                <zha-groups-data-table
                  .hass=${this.hass}
                  .narrow=${this.narrow}
                  .groups=${this._groups}
                  .selectable=${true}
                  @selection-changed=${this._handleRemoveSelectionChanged}
                  class="table"
                ></zha-groups-data-table>
              `
            : html`
                <paper-spinner
                  active
                  alt=${this.hass!.localize("ui.common.loading")}
                ></paper-spinner>
              `}
        </div>
        <div class="paper-dialog-buttons">
          <mwc-button
            ?disabled="${!this._selectedGroupsToRemove.length ||
              this._processingRemove}"
            @click="${this._removeGroup}"
            class="button"
          >
            <paper-spinner
              ?active="${this._processingRemove}"
              alt=${this.hass!.localize(
                "ui.panel.config.zha.groups.removing_groups"
              )}
            ></paper-spinner>
            ${this.hass!.localize(
              "ui.panel.config.zha.groups.remove_groups"
            )}</mwc-button
          >
        </div>
      </hass-subpage>
    `;
  }

  private async _fetchGroups() {
    this._groups = (await fetchGroups(this.hass!)).sort(sortZHAGroups);
  }

  private _handleRemoveSelectionChanged(ev: CustomEvent): void {
    const changedSelection = ev.detail as SelectionChangedEvent;
    const groupId = Number(changedSelection.id);
    if (changedSelection.selected) {
      this._selectedGroupsToRemove.push(groupId);
    } else {
      const index = this._selectedGroupsToRemove.indexOf(groupId);
      if (index !== -1) {
        this._selectedGroupsToRemove.splice(index, 1);
      }
    }
    this._selectedGroupsToRemove = [...this._selectedGroupsToRemove];
  }

  private async _removeGroup(): Promise<void> {
    this._processingRemove = true;
    this._groups = await removeGroups(this.hass, this._selectedGroupsToRemove);
    this._selectedGroupsToRemove = [];
    this._processingRemove = false;
  }

  private async _addGroup(): Promise<void> {
    navigate(this, `/config/zha/group-add`);
  }

  static get styles(): CSSResult[] {
    return [
      css`
        .content {
          padding: 4px;
        }
        zha-groups-data-table {
          width: 100%;
        }
        .button {
          float: right;
        }
        .table {
          height: 200px;
          overflow: auto;
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
        .paper-dialog-buttons {
          align-items: flex-end;
          padding: 8px;
        }
        .paper-dialog-buttons .warning {
          --mdc-theme-primary: var(--google-red-500);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-groups-dashboard": ZHAGroupsDashboard;
  }
}

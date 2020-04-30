import "@material/mwc-button";
import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/paper-spinner/paper-spinner";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import { HASSDomEvent } from "../../../common/dom/fire_event";
import { navigate } from "../../../common/navigate";
import { SelectionChangedEvent } from "../../../components/data-table/ha-data-table";
import { fetchGroups, removeGroups, ZHAGroup } from "../../../data/zha";
import "../../../layouts/hass-subpage";
import { HomeAssistant } from "../../../types";
import { sortZHAGroups } from "./functions";
import "./zha-groups-data-table";

@customElement("zha-groups-dashboard")
export class ZHAGroupsDashboard extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public narrow = false;

  @property() public _groups?: ZHAGroup[];

  @property() private _processingRemove = false;

  @property() private _selectedGroupsToRemove: number[] = [];

  private _firstUpdatedCalled = false;

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
        .header=${this.hass!.localize(
          "ui.panel.config.zha.groups.groups-header"
        )}
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

  private _handleRemoveSelectionChanged(
    ev: HASSDomEvent<SelectionChangedEvent>
  ): void {
    this._selectedGroupsToRemove = ev.detail.value.map((value) =>
      Number(value)
    );
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

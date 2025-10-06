import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators";
import { stopPropagation } from "../../../../../common/dom/stop_propagation";
import "../../../../../components/buttons/ha-call-service-button";
import "../../../../../components/ha-card";
import "../../../../../components/ha-form/ha-form";
import "../../../../../components/ha-list-item";
import "../../../../../components/ha-select";
import "../../../../../components/ha-textfield";
import type { Cluster, Command, ZHADevice } from "../../../../../data/zha";
import { fetchCommandsForCluster } from "../../../../../data/zha";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import { formatAsPaddedHex } from "./functions";
import type { IssueCommandServiceData } from "./types";

export class ZHAClusterCommands extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ attribute: false }) public device?: ZHADevice;

  @property({ attribute: false, type: Object })
  public selectedCluster?: Cluster;

  @state() private _commands: Command[] | undefined;

  @state() private _selectedCommandId?: number;

  @state() private _manufacturerCodeOverride?: number;

  @state()
  private _issueClusterCommandServiceData?: IssueCommandServiceData;

  @state()
  private _canIssueCommand = false;

  @state()
  private _commandData: Record<string, any> = {};

  protected updated(changedProperties: PropertyValues): void {
    if (changedProperties.has("selectedCluster")) {
      this._commands = undefined;
      this._selectedCommandId = undefined;
      this._fetchCommandsForCluster();
    }
    super.updated(changedProperties);
  }

  protected render() {
    if (!this.device || !this.selectedCluster || !this._commands) {
      return nothing;
    }
    return html`
      <ha-card class="content">
        <div class="command-picker">
          <ha-select
            .label=${this.hass!.localize(
              "ui.panel.config.zha.cluster_commands.commands_of_cluster"
            )}
            class="menu"
            .value=${String(this._selectedCommandId)}
            @selected=${this._selectedCommandChanged}
            @closed=${stopPropagation}
            fixedMenuPosition
            naturalMenuWidth
          >
            ${this._commands.map(
              (entry) => html`
                <ha-list-item .value=${String(entry.id)}>
                  ${entry.name} (id: ${formatAsPaddedHex(entry.id)})
                </ha-list-item>
              `
            )}
          </ha-select>
        </div>
        ${this._selectedCommandId !== undefined
          ? html`
              <div class="input-text">
                <ha-textfield
                  .label=${this.hass!.localize(
                    "ui.panel.config.zha.common.manufacturer_code_override"
                  )}
                  type="number"
                  .value=${this._manufacturerCodeOverride}
                  @change=${this._onManufacturerCodeOverrideChanged}
                  .placeholder=${this.hass!.localize(
                    "ui.panel.config.zha.common.value"
                  )}
                ></ha-textfield>
              </div>
              <div class="command-form">
                <ha-form
                  .hass=${this.hass}
                  .schema=${this._commands.find(
                    (command) => command.id === this._selectedCommandId
                  )!.schema}
                  @value-changed=${this._commandDataChanged}
                  .data=${this._commandData}
                ></ha-form>
              </div>
              <div class="card-actions">
                <ha-call-service-button
                  .hass=${this.hass}
                  domain="zha"
                  service="issue_zigbee_cluster_command"
                  .data=${this._issueClusterCommandServiceData}
                  .disabled=${!this._canIssueCommand}
                >
                  ${this.hass!.localize(
                    "ui.panel.config.zha.cluster_commands.issue_zigbee_command"
                  )}
                </ha-call-service-button>
              </div>
            `
          : ""}
      </ha-card>
    `;
  }

  private async _fetchCommandsForCluster(): Promise<void> {
    if (this.device && this.selectedCluster && this.hass) {
      this._commands = await fetchCommandsForCluster(
        this.hass,
        this.device!.ieee,
        this.selectedCluster!.endpoint_id,
        this.selectedCluster!.id,
        this.selectedCluster!.type
      );
      this._commands.sort((a, b) => a.name.localeCompare(b.name));
      if (this._commands.length > 0) {
        this._selectedCommandId = this._commands[0].id;
      }
    }
  }

  private _computeIssueClusterCommandServiceData():
    | IssueCommandServiceData
    | undefined {
    if (!this.device || !this.selectedCluster || !this._commands) {
      return undefined;
    }
    const selectedCommand = this._commands.find(
      (command) => command.id === this._selectedCommandId
    );

    this._canIssueCommand =
      this._commandData &&
      selectedCommand!.schema.every(
        (field) =>
          !field.required ||
          !["", undefined].includes(this._commandData![field.name])
      );

    return {
      ieee: this.device!.ieee,
      endpoint_id: this.selectedCluster!.endpoint_id,
      cluster_id: this.selectedCluster!.id,
      cluster_type: this.selectedCluster!.type,
      command: this._selectedCommandId!,
      command_type: selectedCommand!.type,
      params: this._commandData,
    };
  }

  private async _commandDataChanged(ev: CustomEvent): Promise<void> {
    this._commandData = ev.detail.value;
    this._issueClusterCommandServiceData =
      this._computeIssueClusterCommandServiceData();
  }

  private _onManufacturerCodeOverrideChanged(event): void {
    this._manufacturerCodeOverride = Number(event.target.value);
    this._issueClusterCommandServiceData =
      this._computeIssueClusterCommandServiceData();
  }

  private _selectedCommandChanged(event): void {
    this._selectedCommandId = Number(event.target.value);
    this._issueClusterCommandServiceData =
      this._computeIssueClusterCommandServiceData();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        ha-select {
          margin-top: 16px;
        }
        .menu,
        ha-textfield {
          width: 100%;
        }

        .card-actions.warning ha-call-service-button {
          color: var(--error-color);
        }

        .command-picker {
          align-items: center;
          padding-left: 28px;
          padding-right: 28px;
          padding-inline-start: 28px;
          padding-inline-end: 28px;
          padding-bottom: 10px;
        }

        .input-text {
          padding-left: 28px;
          padding-right: 28px;
          padding-inline-start: 28px;
          padding-inline-end: 28px;
          padding-bottom: 10px;
        }

        .command-form {
          padding-left: 28px;
          padding-right: 28px;
          padding-inline-start: 28px;
          padding-inline-end: 28px;
          padding-bottom: 10px;
        }

        .header {
          flex-grow: 1;
        }

        .toggle-help-icon {
          float: right;
          top: -6px;
          right: 0;
          inset-inline-end: 0;
          inset-inline-start: initial;
          padding-right: 0px;
          padding-inline-end: 0px;
          padding-inline-start: initial;
          color: var(--primary-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-cluster-commands": ZHAClusterCommands;
  }
}

customElements.define("zha-cluster-commands", ZHAClusterCommands);

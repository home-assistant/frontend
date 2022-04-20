import "@material/mwc-list/mwc-list-item";
import { mdiHelpCircle } from "@mdi/js";
import "@polymer/paper-input/paper-input";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { property, state } from "lit/decorators";
import { stopPropagation } from "../../../../../common/dom/stop_propagation";
import "../../../../../components/buttons/ha-call-service-button";
import "../../../../../components/ha-card";
import "../../../../../components/ha-icon-button";
import "../../../../../components/ha-select";
import "../../../../../components/ha-service-description";
import {
  Cluster,
  Command,
  fetchCommandsForCluster,
  ZHADevice,
} from "../../../../../data/zha";
import { haStyle } from "../../../../../resources/styles";
import { HomeAssistant } from "../../../../../types";
import "../../../ha-config-section";
import { formatAsPaddedHex } from "./functions";
import { ChangeEvent, IssueCommandServiceData } from "./types";

export class ZHAClusterCommands extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property() public isWide?: boolean;

  @property() public selectedNode?: ZHADevice;

  @property() public selectedCluster?: Cluster;

  @state() private _showHelp = false;

  @state() private _commands: Command[] = [];

  @state() private _selectedCommandId?: number;

  @state() private _manufacturerCodeOverride?: number;

  @state()
  private _issueClusterCommandServiceData?: IssueCommandServiceData;

  protected updated(changedProperties: PropertyValues): void {
    if (changedProperties.has("selectedCluster")) {
      this._commands = [];
      this._selectedCommandId = undefined;
      this._fetchCommandsForCluster();
    }
    super.update(changedProperties);
  }

  protected render(): TemplateResult {
    return html`
      <ha-config-section .isWide=${this.isWide}>
        <div class="header" slot="header">
          <span>
            ${this.hass!.localize(
              "ui.panel.config.zha.cluster_commands.header"
            )}
          </span>
          <ha-icon-button
            class="toggle-help-icon"
            @click=${this._onHelpTap}
            .path=${mdiHelpCircle}
            .label=${this.hass!.localize("ui.common.help")}
          >
          </ha-icon-button>
        </div>
        <span slot="introduction">
          ${this.hass!.localize(
            "ui.panel.config.zha.cluster_commands.introduction"
          )}
        </span>

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
                  <mwc-list-item .value=${String(entry.id)}>
                    ${entry.name + " (id: " + formatAsPaddedHex(entry.id) + ")"}
                  </mwc-list-item>
                `
              )}
            </ha-select>
          </div>
          ${this._showHelp
            ? html`
                <div class="help-text">
                  ${this.hass!.localize(
                    "ui.panel.config.zha.cluster_commands.help_command_dropdown"
                  )}
                </div>
              `
            : ""}
          ${this._selectedCommandId !== undefined
            ? html`
                <div class="input-text">
                  <paper-input
                    label=${this.hass!.localize(
                      "ui.panel.config.zha.common.manufacturer_code_override"
                    )}
                    type="number"
                    .value=${this._manufacturerCodeOverride}
                    @value-changed=${this._onManufacturerCodeOverrideChanged}
                    placeholder=${this.hass!.localize(
                      "ui.panel.config.zha.common.value"
                    )}
                  ></paper-input>
                </div>
                <div class="card-actions">
                  <ha-call-service-button
                    .hass=${this.hass}
                    domain="zha"
                    service="issue_zigbee_cluster_command"
                    .serviceData=${this._issueClusterCommandServiceData}
                  >
                    ${this.hass!.localize(
                      "ui.panel.config.zha.cluster_commands.issue_zigbee_command"
                    )}
                  </ha-call-service-button>
                  ${this._showHelp
                    ? html`
                        <ha-service-description
                          .hass=${this.hass}
                          domain="zha"
                          service="issue_zigbee_cluster_command"
                          class="help-text2"
                        ></ha-service-description>
                      `
                    : ""}
                </div>
              `
            : ""}
        </ha-card>
      </ha-config-section>
    `;
  }

  private async _fetchCommandsForCluster(): Promise<void> {
    if (this.selectedNode && this.selectedCluster && this.hass) {
      this._commands = await fetchCommandsForCluster(
        this.hass,
        this.selectedNode!.ieee,
        this.selectedCluster!.endpoint_id,
        this.selectedCluster!.id,
        this.selectedCluster!.type
      );
      this._commands.sort((a, b) => a.name.localeCompare(b.name));
    }
  }

  private _computeIssueClusterCommandServiceData():
    | IssueCommandServiceData
    | undefined {
    if (!this.selectedNode || !this.selectedCluster) {
      return undefined;
    }
    return {
      ieee: this.selectedNode!.ieee,
      endpoint_id: this.selectedCluster!.endpoint_id,
      cluster_id: this.selectedCluster!.id,
      cluster_type: this.selectedCluster!.type,
      command: this._selectedCommandId!,
      command_type: this._commands.find(
        (command) => command.id === this._selectedCommandId
      )!.type,
    };
  }

  private _onManufacturerCodeOverrideChanged(value: ChangeEvent): void {
    this._manufacturerCodeOverride = value.detail!.value;
    this._issueClusterCommandServiceData =
      this._computeIssueClusterCommandServiceData();
  }

  private _onHelpTap(): void {
    this._showHelp = !this._showHelp;
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
        .menu {
          width: 100%;
        }

        .content {
          margin-top: 24px;
        }

        ha-card {
          max-width: 680px;
        }

        .card-actions.warning ha-call-service-button {
          color: var(--error-color);
        }

        .command-picker {
          align-items: center;
          padding-left: 28px;
          padding-right: 28px;
          padding-bottom: 10px;
        }

        .input-text {
          padding-left: 28px;
          padding-right: 28px;
          padding-bottom: 10px;
        }

        .help-text {
          color: grey;
          padding-left: 28px;
          padding-right: 28px;
          padding-bottom: 16px;
        }

        .help-text2 {
          color: grey;
          padding: 16px;
        }

        .header {
          flex-grow: 1;
        }

        .toggle-help-icon {
          float: right;
          top: -6px;
          right: 0;
          padding-right: 0px;
          color: var(--primary-color);
        }

        ha-service-description {
          display: block;
          color: grey;
        }

        [hidden] {
          display: none;
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

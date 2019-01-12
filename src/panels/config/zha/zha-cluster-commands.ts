import "@polymer/iron-flex-layout/iron-flex-layout-classes";
import {
  html,
  LitElement,
  PropertyDeclarations,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import "@polymer/paper-card/paper-card";
import { HassEntity } from "home-assistant-js-websocket";
import "../../../components/buttons/ha-call-service-button";
import "../../../components/ha-service-description";
import {
  Cluster,
  Command,
  fetchCommandsForCluster,
  ZHADeviceEntity,
} from "../../../data/zha";
import "../../../resources/ha-style";
import { HomeAssistant } from "../../../types";
import "../ha-config-section";
import {
  ChangeEvent,
  IssueCommandServiceData,
  ItemSelectedEvent,
} from "./types";

export class ZHAClusterCommands extends LitElement {
  public hass?: HomeAssistant;
  public isWide?: boolean;
  public selectedNode?: HassEntity;
  public selectedEntity?: ZHADeviceEntity;
  public selectedCluster?: Cluster;
  private _showHelp: boolean;
  private _haStyle?: DocumentFragment;
  private _ironFlex?: DocumentFragment;
  private _commands: Command[];
  private _selectedCommandIndex: number;
  private _manufacturerCodeOverride?: number;
  private _issueClusterCommandServiceData?: IssueCommandServiceData;

  constructor() {
    super();
    this._showHelp = false;
    this._selectedCommandIndex = -1;
    this._commands = [];
  }

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      isWide: {},
      selectedNode: {},
      selectedEntity: {},
      selectedCluster: {},
      _showHelp: {},
      _commands: {},
      _selectedCommandIndex: {},
      _manufacturerCodeOverride: {},
      _issueClusterCommandServiceData: {},
    };
  }

  protected updated(changedProperties: PropertyValues): void {
    if (changedProperties.has("selectedCluster")) {
      this._commands = [];
      this._selectedCommandIndex = -1;
      this._fetchCommandsForCluster();
    }
    super.update(changedProperties);
  }

  protected render(): TemplateResult | void {
    return html`
      ${this.renderStyle()}
      <ha-config-section .isWide="${this.isWide}">
        <div class="sectionHeader" slot="header">
          <span>Cluster Commands</span>
          <paper-icon-button
            class="toggle-help-icon"
            @click="${this._onHelpTap}"
            icon="hass:help-circle"
          >
          </paper-icon-button>
        </div>
        <span slot="introduction">View and issue cluster commands.</span>

        <paper-card class="content">
          <div class="command-picker">
            <paper-dropdown-menu
              label="Commands of the selected cluster"
              class="flex"
            >
              <paper-listbox
                slot="dropdown-content"
                .selected="${this._selectedCommandIndex}"
                @iron-select="${this._selectedCommandChanged}"
              >
                ${
                  this._commands.map(
                    (entry) => html`
                      <paper-item
                        >${entry.name + " (id: " + entry.id + ")"}</paper-item
                      >
                    `
                  )
                }
              </paper-listbox>
            </paper-dropdown-menu>
          </div>
          ${
            this._showHelp
              ? html`
                  <div class="helpText">Select a command to interact with</div>
                `
              : ""
          }
          ${
            this._selectedCommandIndex !== -1
              ? html`
                  <div class="input-text">
                    <paper-input
                      label="Manufacturer code override"
                      type="number"
                      .value="${this._manufacturerCodeOverride}"
                      @value-changed="${
                        this._onManufacturerCodeOverrideChanged
                      }"
                      placeholder="Value"
                    ></paper-input>
                  </div>
                  <div class="card-actions">
                    <ha-call-service-button
                      .hass="${this.hass}"
                      domain="zha"
                      service="issue_zigbee_cluster_command"
                      .serviceData="${this._issueClusterCommandServiceData}"
                      >Issue Zigbee Command</ha-call-service-button
                    >
                    ${
                      this._showHelp
                        ? html`
                            <ha-service-description
                              .hass="${this.hass}"
                              domain="zha"
                              service="issue_zigbee_cluster_command"
                            ></ha-service-description>
                          `
                        : ""
                    }
                  </div>
                `
              : ""
          }
        </paper-card>
      </ha-config-section>
    `;
  }

  private async _fetchCommandsForCluster(): Promise<void> {
    if (this.selectedEntity && this.selectedCluster && this.hass) {
      this._commands = await fetchCommandsForCluster(
        this.hass,
        this.selectedEntity!.entity_id,
        this.selectedEntity!.device_info!.identifiers[0][1],
        this.selectedCluster!.id,
        this.selectedCluster!.type
      );
    }
  }

  private _computeIssueClusterCommandServiceData():
    | IssueCommandServiceData
    | undefined {
    if (!this.selectedEntity || !this.selectedCluster) {
      return;
    }
    return {
      entity_id: this.selectedEntity!.entity_id,
      cluster_id: this.selectedCluster!.id,
      cluster_type: this.selectedCluster!.type,
      command: this._commands[this._selectedCommandIndex].id,
      command_type: this._commands[this._selectedCommandIndex].type,
    };
  }

  private _onManufacturerCodeOverrideChanged(value: ChangeEvent): void {
    this._manufacturerCodeOverride = value.detail!.value;
    this._issueClusterCommandServiceData = this._computeIssueClusterCommandServiceData();
  }

  private _onHelpTap(): void {
    this._showHelp = !this._showHelp;
  }

  private _selectedCommandChanged(event: ItemSelectedEvent): void {
    this._selectedCommandIndex = event.target!.selected;
    this._issueClusterCommandServiceData = this._computeIssueClusterCommandServiceData();
  }

  private renderStyle(): TemplateResult {
    if (!this._haStyle) {
      this._haStyle = document.importNode(
        (document.getElementById("ha-style")!
          .children[0] as HTMLTemplateElement).content,
        true
      );
    }
    if (!this._ironFlex) {
      this._ironFlex = document.importNode(
        (document.getElementById("iron-flex")!
          .children[0] as HTMLTemplateElement).content,
        true
      );
    }
    return html`
      ${this._ironFlex} ${this._haStyle}
      <style>
        .content {
          margin-top: 24px;
        }

        paper-card {
          display: block;
          margin: 0 auto;
          max-width: 600px;
        }

        .card-actions.warning ha-call-service-button {
          color: var(--google-red-500);
        }

        .command-picker {
          @apply --layout-horizontal;
          @apply --layout-center-center;
          padding-left: 28px;
          padding-right: 28px;
          padding-bottom: 10px;
        }

        .input-text {
          padding-left: 28px;
          padding-right: 28px;
          padding-bottom: 10px;
        }

        .sectionHeader {
          position: relative;
        }

        .helpText {
          color: grey;
          padding: 16px;
        }

        .toggle-help-icon {
          position: absolute;
          top: -6px;
          right: 0;
          color: var(--primary-color);
        }

        ha-service-description {
          display: block;
          color: grey;
        }

        [hidden] {
          display: none;
        }
      </style>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-cluster-commands": ZHAClusterCommands;
  }
}

customElements.define("zha-cluster-commands", ZHAClusterCommands);

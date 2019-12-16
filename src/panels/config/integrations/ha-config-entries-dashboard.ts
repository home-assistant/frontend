import "@polymer/iron-flex-layout/iron-flex-layout-classes";
import "@polymer/paper-tooltip/paper-tooltip";
import "@material/mwc-button";
import "@polymer/iron-icon/iron-icon";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-item/paper-item-body";

import { HassEntity } from "home-assistant-js-websocket";

import "../../../components/ha-card";
import "../../../components/ha-icon-next";
import "../../../components/ha-fab";
import "../../../components/entity/ha-state-icon";
import "../../../layouts/hass-subpage";
import "../../../resources/ha-style";
import "../../../components/ha-icon";

import { computeRTL } from "../../../common/util/compute_rtl";
import "../ha-config-section";

import { computeStateName } from "../../../common/entity/compute_state_name";
import {
  loadConfigFlowDialog,
  showConfigFlowDialog,
} from "../../../dialogs/config-flow/show-dialog-config-flow";
import {
  localizeConfigFlowTitle,
  ignoreConfigFlow,
  DISCOVERY_SOURCES,
} from "../../../data/config_flow";
import {
  LitElement,
  TemplateResult,
  html,
  property,
  customElement,
  css,
  CSSResult,
} from "lit-element";
import { HomeAssistant } from "../../../types";
import { ConfigEntry } from "../../../data/config_entries";
import { fireEvent } from "../../../common/dom/fire_event";
import { EntityRegistryEntry } from "../../../data/entity_registry";
import { DataEntryFlowProgress } from "../../../data/data_entry_flow";
import { showConfirmationDialog } from "../../../dialogs/confirmation/show-dialog-confirmation";

@customElement("ha-config-entries-dashboard")
export class HaConfigManagerDashboard extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public showAdvanced!: boolean;

  @property() private configEntries!: ConfigEntry[];

  /**
   * Entity Registry entries.
   */
  @property() private entityRegistryEntries!: EntityRegistryEntry[];

  /**
   * Current flows that are in progress and have not been started by a user.
   * For example, can be discovered devices that require more config.
   */
  @property() private configEntriesInProgress!: DataEntryFlowProgress[];

  public connectedCallback() {
    super.connectedCallback();
    loadConfigFlowDialog();
  }

  protected render(): TemplateResult {
    return html`
      <hass-subpage
        header=${this.hass.localize("ui.panel.config.integrations.caption")}
      >
        ${this.configEntriesInProgress.length
          ? html`
              <ha-config-section>
                <span slot="header"
                  >${this.hass.localize(
                    "ui.panel.config.integrations.discovered"
                  )}</span
                >
                <ha-card>
                  ${this.configEntriesInProgress.map(
                    (flow) => html`
                      <div class="config-entry-row">
                        <paper-item-body>
                          ${localizeConfigFlowTitle(this.hass.localize, flow)}
                        </paper-item-body>
                        ${DISCOVERY_SOURCES.includes(flow.context.source) &&
                        flow.context.unique_id
                          ? html`
                              <mwc-button
                                @click=${this._ignoreFlow}
                                .flow=${flow}
                              >
                                ${this.hass.localize(
                                  "ui.panel.config.integrations.ignore"
                                )}
                              </mwc-button>
                            `
                          : ""}
                        <mwc-button
                          @click=${this._continueFlow}
                          .flowId=${flow.flow_id}
                          >${this.hass.localize(
                            "ui.panel.config.integrations.configure"
                          )}</mwc-button
                        >
                      </div>
                    `
                  )}
                </ha-card>
              </ha-config-section>
            `
          : ""}

        <ha-config-section class="configured">
          <span slot="header"
            >${this.hass.localize(
              "ui.panel.config.integrations.configured"
            )}</span
          >
          <ha-card>
            ${this.entityRegistryEntries.length
              ? this.configEntries.map(
                  (item: any, idx) => html`
                    <a
                      href="/config/integrations/config_entry/${item.entry_id}"
                    >
                      <paper-item data-index=${idx}>
                        <paper-item-body two-line>
                          <div>
                            ${this.hass.localize(
                              `component.${item.domain}.config.title`
                            )}:
                            ${item.title}
                          </div>
                          <div secondary>
                            ${this._getEntities(item).map(
                              (entity) => html`
                                <span>
                                  <ha-state-icon
                                    .stateObj=${entity}
                                  ></ha-state-icon>
                                  <paper-tooltip position="bottom"
                                    >${computeStateName(entity)}</paper-tooltip
                                  >
                                </span>
                              `
                            )}
                          </div>
                        </paper-item-body>
                        <ha-icon-next
                          aria-label=${this.hass.localize(
                            "ui.panel.config.integrations.details"
                          )}
                        ></ha-icon-next>
                      </paper-item>
                    </a>
                  `
                )
              : html`
                  <div class="config-entry-row">
                    <paper-item-body two-line>
                      <div>
                        ${this.hass.localize(
                          "ui.panel.config.integrations.none"
                        )}
                      </div>
                    </paper-item-body>
                  </div>
                `}
          </ha-card>
        </ha-config-section>

        <ha-fab
          icon="hass:plus"
          aria-label=${this.hass.localize("ui.panel.config.integrations.new")}
          title=${this.hass.localize("ui.panel.config.integrations.new")}
          @click=${this._createFlow}
          ?rtl=${computeRTL(this.hass!)}
        ></ha-fab>
      </hass-subpage>
    `;
  }

  private _createFlow() {
    showConfigFlowDialog(this, {
      dialogClosedCallback: () => fireEvent(this, "hass-reload-entries"),
      showAdvanced: this.showAdvanced,
    });
  }

  private _continueFlow(ev: Event) {
    showConfigFlowDialog(this, {
      continueFlowId: (ev.target! as any).flowId,
      dialogClosedCallback: () => fireEvent(this, "hass-reload-entries"),
    });
  }

  private _ignoreFlow(ev: Event) {
    const flow = (ev.target! as any).flow;
    showConfirmationDialog(this, {
      title: this.hass!.localize(
        "ui.panel.config.integrations.confirm_ignore_title",
        "name",
        localizeConfigFlowTitle(this.hass.localize, flow)
      ),
      text: this.hass!.localize("ui.panel.config.integrations.confirm_ignore"),
      confirmBtnText: this.hass!.localize(
        "ui.panel.config.integrations.ignore"
      ),
      confirm: () => {
        ignoreConfigFlow(this.hass, flow.flow_id);
        fireEvent(this, "hass-reload-entries");
      },
    });
  }

  private _getEntities(configEntry: ConfigEntry): HassEntity[] {
    if (!this.entityRegistryEntries) {
      return [];
    }
    const states: HassEntity[] = [];
    this.entityRegistryEntries.forEach((entity) => {
      if (
        entity.config_entry_id === configEntry.entry_id &&
        entity.entity_id in this.hass.states
      ) {
        states.push(this.hass.states[entity.entity_id]);
      }
    });
    return states;
  }
  static get styles(): CSSResult {
    return css`
      ha-card {
        overflow: hidden;
      }
      mwc-button {
        align-self: center;
      }
      .config-entry-row {
        display: flex;
        padding: 0 16px;
      }
      ha-icon {
        cursor: pointer;
        margin: 8px;
      }
      .configured a {
        color: var(--primary-text-color);
        text-decoration: none;
      }
      ha-fab {
        position: fixed;
        bottom: 16px;
        right: 16px;
        z-index: 1;
      }

      ha-fab[rtl] {
        right: auto;
        left: 16px;
      }
      .overflow {
        width: 56px;
      }
    `;
  }
}

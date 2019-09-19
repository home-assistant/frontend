import "@polymer/iron-flex-layout/iron-flex-layout-classes";
import "@polymer/paper-tooltip/paper-tooltip";
import "@material/mwc-button";
import "@polymer/iron-icon/iron-icon";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-item/paper-item-body";

import "../../../components/ha-card";
import "../../../components/ha-icon-next";
import "../../../components/ha-fab";
import "../../../components/entity/ha-state-icon";
import "../../../layouts/hass-subpage";
import "../../../resources/ha-style";
import "../../../components/ha-icon";

import { computeRTL } from "../../../common/util/compute_rtl";
import "../ha-config-section";

import {
  loadConfigFlowDialog,
  showConfigFlowDialog,
} from "../../../dialogs/config-flow/show-dialog-config-flow";
import { localizeConfigFlowTitle } from "../../../data/config_flow";
import {
  LitElement,
  TemplateResult,
  html,
  property,
  customElement,
  PropertyValues,
  css,
  CSSResult,
} from "lit-element";
import { HomeAssistant } from "../../../types";
import { ConfigEntry } from "../../../data/config_entries";
import { fireEvent } from "../../../common/dom/fire_event";
import { EntityRegistryEntry } from "../../../data/entity_registry";
import { DataEntryFlowProgress } from "../../../data/data_entry_flow";

@customElement("ha-config-entries-dashboard")
export class HaConfigManagerDashboard extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public narrow!: boolean;
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

  protected updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);
    if (changedProperties.has("narrow")) {
      if (this.narrow) {
        this.setAttribute("narrow", "true");
      } else {
        this.removeAttribute("narrow");
      }
    }
  }

  protected render(): TemplateResult {
    return html`
      <hass-subpage
        header=${this.hass.localize("ui.panel.config.integrations.caption")}
      >
        ${this.configEntriesInProgress.length
          ? html`
              ${this.configEntriesInProgress.map(
                (flow) => html`
                  <ha-card>
                    <div class="card-content">
                      <div class="item-header">
                        <div class="item-icon">
                          <ha-icon icon="hass:link"></ha-icon>
                        </div>
                        <h2 class="item-title">
                          ${localizeConfigFlowTitle(this.hass.localize, flow)}
                        </h2>
                      </div>
                      <p class="item-description">
                        We found this integration, would you like to set it up?
                        <mwc-button
                          @click=${this._continueFlow}
                          .flowId=${flow.flow_id}
                          >${this.hass.localize(
                            "ui.panel.config.integrations.configure"
                          )}</mwc-button
                        >
                      </p>
                    </div>
                    <ha-icon-next></ha-icon-next>
                  </ha-card>
                `
              )}
            `
          : ""}

        <h1>
          ${this.hass.localize("ui.panel.config.integrations.configured")}
        </h1>
        <div class="configured">
          ${this.entityRegistryEntries.length
            ? this.configEntries.map((item: any, idx) => {
                const integrationTitle = this.hass.localize(
                  `component.${item.domain}.config.title`
                );
                return html`
                  <a href="/config/integrations/config_entry/${item.entry_id}">
                    <ha-card data-index=${idx}>
                      <div class="card-content">
                        <div class="item-header">
                          <div class="item-icon">
                            <ha-icon icon="hass:link"></ha-icon>
                          </div>
                          <h2 class="item-title">
                            ${integrationTitle}${integrationTitle !== item.title
                              ? html`
                                  : ${item.title}
                                `
                              : ""}
                          </h2>
                        </div>
                        <p class="item-description"></p>
                      </div>
                      <ha-icon-next></ha-icon-next>
                    </ha-card>
                  </a>
                `;
              })
            : html`
                <div class="config-entry-row">
                  <paper-item-body two-line>
                    <div>
                      ${this.hass.localize("ui.panel.config.integrations.none")}
                    </div>
                  </paper-item-body>
                </div>
              `}
        </div>
        <ha-fab
          icon="hass:plus"
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
    });
  }

  private _continueFlow(ev: Event) {
    showConfigFlowDialog(this, {
      continueFlowId: ev.target.flowId,
      dialogClosedCallback: () => fireEvent(this, "hass-reload-entries"),
    });
  }

  static get styles(): CSSResult {
    return css`
      ha-card {
        overflow: hidden;
      }
      mwc-button {
        top: 3px;
        margin-right: -0.57em;
      }
      ha-icon {
        cursor: pointer;
        margin: 8px;
      }
      .configured {
        display: flex;
        flex-wrap: wrap;
        align-content: flex-start;
        justify-content: space-between;
        margin: 8px;
      }
      .configured > * {
        flex: 0 1 calc(33% - 6px);
        margin: 4px;
        height: 84px;
        box-sizing: border-box;
      }
      :host([narrow]) .configured > * {
        flex: 0 0 100%;
      }
      .configured a {
        color: var(--primary-text-color);
        text-decoration: none;
      }
      .configured ha-card {
        height: 100%;
      }
      .item-header {
        display: flex;
      }
      .item-icon {
        position: relative;
        display: inline-block;
        width: 50px;
        height: 50px;
        color: var(--text-primary-color, #fff);
        border-radius: 50%;
        text-align: center;
        line-height: 50px;
        vertical-align: middle;
        background-color: var(--primary-color);
        margin-right: 16px;
        flex-shrink: 0;
      }
      .item-title {
        display: inline-block;
        font-size: 14px;
        font-weight: 500;
        margin: 0;
        margin-right: 16px;
        align-self: center;
      }
      .item-description {
        margin-right: 16px;
      }
      h1 {
        margin: 16px;
        font-family: var(--paper-font-display1_-_font-family);
        -webkit-font-smoothing: var(
          --paper-font-display1_-_-webkit-font-smoothing
        );
        font-size: var(--paper-font-display1_-_font-size);
        font-weight: var(--paper-font-display1_-_font-weight);
        letter-spacing: var(--paper-font-display1_-_letter-spacing);
        line-height: var(--paper-font-display1_-_line-height);
      }
      ha-icon-next {
        position: absolute;
        right: 10px;
        top: 28px;
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
    `;
  }
}

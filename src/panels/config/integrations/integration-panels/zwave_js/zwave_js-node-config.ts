import "@material/mwc-button/mwc-button";
import "@material/mwc-icon-button/mwc-icon-button";
import { mdiCheckCircle, mdiCircle, mdiRefresh } from "@mdi/js";
import {
  css,
  CSSResultArray,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";
import "../../../../../components/ha-card";
import "../../../../../components/ha-svg-icon";
import "../../../../../components/ha-icon-next";
import {
  fetchNodeConfigParameters,
  fetchNodeStatus,
  NodeStatus,
  ZWaveJSNetwork,
  ZWaveJSNode,
  ZWaveJSNodeConfigParams,
} from "../../../../../data/zwave_js";
import "../../../../../layouts/hass-tabs-subpage";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";
import "../../../ha-config-section";
import { configTabs } from "./zwave_js-config-router";

@customElement("zwave_js-node-config")
class ZWaveJSNodeConfig extends LitElement {
  @property({ type: Object }) public hass!: HomeAssistant;

  @property({ type: Object }) public route!: Route;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ type: Boolean }) public isWide!: boolean;

  @property() public configEntryId?: string;

  @property({ type: Number }) public nodeId?: number;

  @internalProperty() private _node?: ZWaveJSNode;

  @internalProperty() private _config?: ZWaveJSNodeConfigParams[];

  protected firstUpdated() {
    if (this.hass) {
      this._fetchData();
    }
  }

  protected render(): TemplateResult {
    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .tabs=${configTabs}
      >
        <mwc-icon-button slot="toolbar-icon" @click=${this._fetchData}>
          <ha-svg-icon .path=${mdiRefresh}></ha-svg-icon>
        </mwc-icon-button>
        <ha-config-section .narrow=${this.narrow} .isWide=${this.isWide}>
          <div slot="header">
            ${this.hass.localize("ui.panel.config.zwave_js.node_config.header")}
          </div>

          <div slot="introduction">
            ${this.hass.localize(
              "ui.panel.config.zwave_js.node_config.introduction"
            )}
          </div>
          ${this._node
            ? html`
                ${this._config
                  ? html`
                      ${Object.values(this._config).map(
                        (item) => html`
                          ${item.value
                            ? html`
                                <ha-card class="content">
                                  <div class="card-content">
                                    <div class="flex">
                                      <div class="config-label">
                                        <b>${item.metadata.label}</b>
                                      </div>
                                      <div class="tech-info secondary">
                                        Property ${item.property}
                                      </div>
                                    </div>
                                    <span class="secondary">
                                      ${item.metadata.description}
                                    </span>

                                    ${item.metadata.states
                                      ? html`
                                          <p>
                                            ${item.metadata.states[
                                              item.value
                                            ]}<br />
                                            <span class="secondary tech-info">
                                              Value ${item.value}
                                            </span>
                                          </p>
                                        `
                                      : html`<p>${item.value}</p>`}
                                  </div>
                                </ha-card>
                              `
                            : ``}
                        `
                      )}
                    `
                  : ``}
              `
            : ``}
        </ha-config-section>
      </hass-tabs-subpage>
    `;
  }

  private async _fetchData() {
    if (!this.configEntryId || !this.nodeId) {
      return;
    }
    this._node = await fetchNodeStatus(
      this.hass,
      this.configEntryId,
      this.nodeId
    );
    this._config = await fetchNodeConfigParameters(
      this.hass,
      this.configEntryId,
      this.nodeId
    );
  }

  static get styles(): CSSResultArray {
    return [
      haStyle,
      css`
        .secondary {
          color: var(--secondary-text-color);
        }

        .tech-info {
          font-size: 0.8em;
          text-transform: uppercase;
        }

        .flex {
          display: flex;
        }

        .flex .config-label {
          flex: 1;
        }

        .flex .tech-info {
          width: 80px;
          text-align: right;
        }

        .content {
          margin-top: 24px;
        }

        .sectionHeader {
          position: relative;
          padding-right: 40px;
        }

        ha-card {
          margin: 0 auto;
          max-width: 600px;
        }

        ha-card:last-child {
          margin-bottom: 24px;
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
    "zwave_js-node-config": ZWaveJSNodeConfig;
  }
}

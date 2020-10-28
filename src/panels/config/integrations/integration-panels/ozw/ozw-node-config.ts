import "../../../../../components/ha-switch";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-input/paper-input";
import "@material/mwc-button/mwc-button";
import {
  css,
  CSSResultArray,
  customElement,
  html,
  LitElement,
  internalProperty,
  property,
  TemplateResult,
} from "lit-element";
import { navigate } from "../../../../../common/navigate";
import "../../../../../components/buttons/ha-call-service-button";
import "../../../../../components/ha-card";
import "../../../../../components/ha-icon-next";
import "../../../../../layouts/hass-tabs-subpage";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";
import "../../../ha-config-section";
import {
  fetchOZWNodeStatus,
  fetchOZWNodeMetadata,
  fetchOZWNodeConfig,
  OZWDevice,
  OZWDeviceMetaDataResponse,
  OZWDeviceConfig,
} from "../../../../../data/ozw";
import { ERR_NOT_FOUND } from "../../../../../data/websocket_api";
import { showOZWRefreshNodeDialog } from "./show-dialog-ozw-refresh-node";
import { ozwNodeTabs } from "./ozw-node-router";

@customElement("ozw-node-config")
class OZWNodeConfig extends LitElement {
  @property({ type: Object }) public hass!: HomeAssistant;

  @property({ type: Object }) public route!: Route;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ type: Boolean }) public isWide!: boolean;

  @property() public configEntryId?: string;

  @property() public ozwInstance?;

  @property() public nodeId?;

  @internalProperty() private _node?: OZWDevice;

  @internalProperty() private _metadata?: OZWDeviceMetaDataResponse;

  @internalProperty() private _config?: OZWDeviceConfig[];

  @internalProperty() private _error?: string;

  protected firstUpdated() {
    if (!this.ozwInstance) {
      navigate(this, "/config/ozw/dashboard", true);
    } else if (!this.nodeId) {
      navigate(this, `/config/ozw/network/${this.ozwInstance}/nodes`, true);
    } else {
      this._fetchData();
    }
  }

  protected render(): TemplateResult {
    if (this._error) {
      return html`
        <hass-error-screen
          .hass=${this.hass}
          .error=${this.hass.localize(
            "ui.panel.config.ozw.node." + this._error
          )}
        ></hass-error-screen>
      `;
    }

    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .tabs=${ozwNodeTabs(this.ozwInstance, this.nodeId)}
      >
        <ha-config-section .narrow=${this.narrow} .isWide=${this.isWide}>
          <div slot="header">
            ${this.hass.localize("ui.panel.config.ozw.node_config.header")}
          </div>

          <div slot="introduction">
            ${this.hass.localize(
              "ui.panel.config.ozw.node_config.introduction"
            )}
            <p>
              <em>
                ${this.hass.localize(
                  "ui.panel.config.ozw.node_config.help_source"
                )}
              </em>
            </p>
          </div>
          ${this._node
            ? html`
                <ha-card class="content">
                  <div class="card-content">
                    <b>
                      ${this._node.node_manufacturer_name}
                      ${this._node.node_product_name} </b
                    ><br />
                    ${this.hass.localize("ui.panel.config.ozw.common.node_id")}:
                    ${this._node.node_id}<br />
                    ${this.hass.localize(
                      "ui.panel.config.ozw.common.query_stage"
                    )}:
                    ${this._node.node_query_stage}
                    ${this._metadata?.metadata.ProductManualURL
                      ? html` <a
                          href="${this._metadata.metadata.ProductManualURL}"
                        >
                          <p>
                            ${this.hass.localize(
                              "ui.panel.config.ozw.node_metadata.product_manual"
                            )}
                          </p>
                        </a>`
                      : ``}
                  </div>
                  <div class="card-actions">
                    <mwc-button @click=${this._refreshNodeClicked}>
                      ${this.hass.localize(
                        "ui.panel.config.ozw.refresh_node.button"
                      )}
                    </mwc-button>
                  </div>
                </ha-card>

                ${this._metadata?.metadata.WakeupHelp
                  ? html`
                      <ha-card
                        class="content"
                        header="${this.hass.localize(
                          "ui.panel.config.ozw.common.wakeup_instructions"
                        )}"
                      >
                        <div class="card-content">
                          <span class="secondary">
                            ${this.hass.localize(
                              "ui.panel.config.ozw.node_config.wakeup_help"
                            )}
                          </span>
                          <p>
                            ${this._metadata.metadata.WakeupHelp}
                          </p>
                        </div>
                      </ha-card>
                    `
                  : ``}
                ${this._config
                  ? html`
                      ${this._config.map((item) =>
                        this._generate_config_block(item)
                      )}
                    `
                  : ``}
              `
            : ``}
        </ha-config-section>
      </hass-tabs-subpage>
    `;
  }

  private _generate_config_block(item) {
    return html` <ha-card class="content" .value=${item.value}>
      <div class="card-content">
        <b>${item.label}</b><br />
        <span class="secondary">${item.help}</span>
        ${["Byte", "Short", "Int"].includes(item.type)
          ? html` <paper-input
              type="number"
              .value=${item.value}
              .max=${item.max}
              .min=${item.min}
              ?disabled=${item.parameter === 999}
              .parameter=${item.parameter}
            >
            </paper-input>`
          : ``}
        ${item.type === "List"
          ? html`
              <paper-dropdown-menu
                ?disabled=${item.parameter === 999}
                .placeholder=${item.value}
                .parameter=${item.parameter}
              >
                <paper-listbox
                  slot="dropdown-content"
                  .selected=${Object.values(item.options).find(
                    (opt) => opt.Label === item.value
                  ).Value}
                >
                  ${item.options.map(
                    (option) => html`
                      <paper-item .value=${option.Value}
                        >${option.Label}</paper-item
                      >
                    `
                  )}
                </paper-listbox>
              </paper-dropdown-menu>
            `
          : ""}
        ${item.type === "BitSet"
          ? html`
              ${item.value.map(
                (option) => html`
                  <p>
                    <ha-switch ?checked=${option.value} disabled></ha-switch>
                    ${option.label}
                  </p>
                `
              )}
              <p>
                <em
                  >This configuration option can't be edited from the UI yet</em
                >
              </p>
            `
          : ``}
        ${!["Byte", "Short", "Int", "List", "BitSet"].includes(item.type)
          ? html`<p>${item.value}</p>`
          : ``}
        ${item.parameter === 999
          ? html`<p class="error">
              This config option can't be edited from the UI due to a current
              OpenZWave integration issue.
            </p>`
          : ``}
      </div>
      ${["Byte", "Short", "Int"].includes(item.type)
        ? html` <div class="card-actions">
            <mwc-button
              @click=${this._updateTextConfigOption}
              ?disabled=${item.parameter === 999}
            >
              ${this.hass.localize("ui.panel.config.ozw.node_config.update")}
            </mwc-button>
          </div>`
        : ``}
      ${item.type === "List"
        ? html`
            <div class="card-actions">
              <mwc-button
                @click=${this._updateListConfigOption}
                ?disabled=${item.parameter === 999}
              >
                ${this.hass.localize("ui.panel.config.ozw.node_config.update")}
              </mwc-button>
            </div>
          `
        : ``}
    </ha-card>`;
  }

  private async _fetchData() {
    if (!this.ozwInstance || !this.nodeId) {
      return;
    }

    try {
      const nodeProm = fetchOZWNodeStatus(
        this.hass!,
        this.ozwInstance,
        this.nodeId
      );
      const metadataProm = fetchOZWNodeMetadata(
        this.hass!,
        this.ozwInstance,
        this.nodeId
      );
      const configProm = fetchOZWNodeConfig(
        this.hass!,
        this.ozwInstance,
        this.nodeId
      );
      [this._node, this._metadata, this._config] = await Promise.all([
        nodeProm,
        metadataProm,
        configProm,
      ]);
    } catch (err) {
      if (err.code === ERR_NOT_FOUND) {
        this._error = ERR_NOT_FOUND;
        return;
      }
      throw err;
    }
  }

  private async _updateTextConfigOption(ev: Event) {
    const el = ev.target!.closest("ha-card").querySelector("paper-input");
    el.errorMessage = undefined;
    el.invalid = false;
    try {
      await this.hass.callWS({
        type: "ozw/set_config_parameter",
        node_id: this.nodeId,
        ozw_instance: this.ozwInstance,
        parameter: el.parameter,
        value: el.value,
      });
    } catch (e) {
      el.errorMessage = e.message;
      el.invalid = true;
    }
  }

  private async _updateListConfigOption(ev: Event) {
    const el = ev
      .target!.closest("ha-card")
      .querySelector("paper-dropdown-menu");
    el.errorMessage = undefined;
    el.invalid = false;
    try {
      await this.hass.callWS({
        type: "ozw/set_config_parameter",
        node_id: this.nodeId,
        ozw_instance: this.ozwInstance,
        parameter: el.parameter,
        value: el.value,
      });
    } catch (e) {
      el.errorMessage = e.message;
      el.invalid = true;
    }
  }

  private async _refreshNodeClicked() {
    showOZWRefreshNodeDialog(this, {
      node_id: this.nodeId,
      ozw_instance: this.ozwInstance,
    });
  }

  static get styles(): CSSResultArray {
    return [
      haStyle,
      css`
        .secondary {
          color: var(--secondary-text-color);
          font-size: 0.9em;
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

        [hidden] {
          display: none;
        }

        blockquote {
          display: block;
          background-color: #ddd;
          padding: 8px;
          margin: 8px 0;
          font-size: 0.9em;
        }

        blockquote em {
          font-size: 0.9em;
          margin-top: 6px;
        }

        paper-dropdown-menu {
          display: block;
        }

        ha-switch {
          margin-right: 12px;
        }

        .error {
          color: red;
        }
      `,
    ];
  }
}

export interface ChangeEvent {
  detail?: {
    value?: any;
  };
  target?: EventTarget;
}

declare global {
  interface HTMLElementTagNameMap {
    "ozw-node-config": OZWNodeConfig;
  }
}

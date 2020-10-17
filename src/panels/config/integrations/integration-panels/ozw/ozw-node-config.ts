import "@material/mwc-button/mwc-button";
import "@material/mwc-fab";
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

  @internalProperty() private _not_found = false;

  protected firstUpdated() {
    if (!this.ozwInstance) {
      navigate(this, "/config/ozw/dashboard", true);
    } else if (!this.nodeId) {
      navigate(this, `/config/ozw/network/${this.ozwInstance}/nodes`, true);
    } else if (this.hass) {
      this._fetchData();
    }
  }

  protected render(): TemplateResult {
    if (this._not_found) {
      return html`
        <hass-error-screen
          .error="${this.hass.localize("ui.panel.config.ozw.node.not_found")}"
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
              <em
                >${this.hass.localize(
                  "ui.panel.config.ozw.node_config.help_source"
                )}</em
              >
            </p>
            <p>
              Note: This panel is currently read-only. The ability to change
              values will come in a later update.
            </p>
          </div>
          ${this._node
            ? html`
                <ha-card class="content">
                  <div class="card-content">
                    <b
                      >${this._node.node_manufacturer_name}
                      ${this._node.node_product_name}</b
                    ><br />
                    Node ID: ${this._node.node_id}<br />
                    Query Stage: ${this._node.node_query_stage}
                    ${this._metadata?.metadata.ProductManualURL
                      ? html` <a
                          href="${this._metadata.metadata.ProductManualURL}"
                        >
                          <p>Product Manual</p>
                        </a>`
                      : ``}
                  </div>
                  <div class="card-actions">
                    <mwc-button @click=${this._refreshNodeClicked}>
                      Refresh Node
                    </mwc-button>
                  </div>
                </ha-card>

                ${this._metadata?.metadata.WakeupHelp
                  ? html`
                      <ha-card class="content" header="Wake-up Instructions">
                        <div class="card-content">
                          <span class="secondary">
                            Battery powered nodes must be awake to change their
                            configuration. If the node is not awake, OpenZWave
                            will attempt to update the node's configuration the
                            next time it wakes up, which could be multiple hours
                            (or days) later. Follow these steps to wake up your
                            device:
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
                      ${this._config.map(
                        (item) => html`
                          <ha-card class="content">
                            <div class="card-content">
                              <b>${item.label}</b><br />
                              <span class="secondary">${item.help}</span>
                              <p>${item.value}</p>
                            </div>
                          </ha-card>
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
    if (!this.ozwInstance || !this.nodeId) {
      return;
    }

    try {
      this._node = await fetchOZWNodeStatus(
        this.hass!,
        this.ozwInstance,
        this.nodeId
      );
      this._metadata = await fetchOZWNodeMetadata(
        this.hass!,
        this.ozwInstance,
        this.nodeId
      );
      this._config = await fetchOZWNodeConfig(
        this.hass!,
        this.ozwInstance,
        this.nodeId
      );
    } catch (err) {
      if (err.code === ERR_NOT_FOUND) {
        this._not_found = true;
        return;
      }
      throw err;
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ozw-node-config": OZWNodeConfig;
  }
}

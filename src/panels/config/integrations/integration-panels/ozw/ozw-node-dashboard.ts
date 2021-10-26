import "@material/mwc-button/mwc-button";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { navigate } from "../../../../../common/navigate";
import "../../../../../components/buttons/ha-call-service-button";
import "../../../../../components/ha-card";
import {
  fetchOZWNodeMetadata,
  fetchOZWNodeStatus,
  OZWDevice,
  OZWDeviceMetaDataResponse,
} from "../../../../../data/ozw";
import { ERR_NOT_FOUND } from "../../../../../data/websocket_api";
import "../../../../../layouts/hass-tabs-subpage";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";
import "../../../ha-config-section";
import { ozwNodeTabs } from "./ozw-node-router";
import { showOZWRefreshNodeDialog } from "./show-dialog-ozw-refresh-node";

@customElement("ozw-node-dashboard")
class OZWNodeDashboard extends LitElement {
  @property({ type: Object }) public hass!: HomeAssistant;

  @property({ type: Object }) public route!: Route;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ type: Boolean }) public isWide!: boolean;

  @property() public configEntryId?: string;

  @property() public ozwInstance?;

  @property() public nodeId?;

  @state() private _node?: OZWDevice;

  @state() private _metadata?: OZWDeviceMetaDataResponse;

  @state() private _not_found = false;

  protected firstUpdated() {
    if (!this.ozwInstance) {
      navigate("/config/ozw/dashboard", { replace: true });
    } else if (!this.nodeId) {
      navigate(`/config/ozw/network/${this.ozwInstance}/nodes`, {
        replace: true,
      });
    } else if (this.hass) {
      this._fetchData();
    }
  }

  protected render(): TemplateResult {
    if (this._not_found) {
      return html`
        <hass-error-screen
          .hass=${this.hass}
          .error=${this.hass.localize("ui.panel.config.ozw.node.not_found")}
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
          <div slot="header">Node Management</div>

          <div slot="introduction">
            View the status of a node and manage its configuration.
          </div>
          ${this._node
            ? html`
                <ha-card class="content">
                  <div class="card-content flex">
                    <div class="node-details">
                      <b>
                        ${this._node.node_manufacturer_name}
                        ${this._node.node_product_name}
                      </b>
                      <br />
                      Node ID: ${this._node.node_id}<br />
                      Query Stage: ${this._node.node_query_stage}
                      ${this._metadata?.metadata.ProductManualURL
                        ? html` <a
                            href=${this._metadata.metadata.ProductManualURL}
                          >
                            <p>Product Manual</p>
                          </a>`
                        : ``}
                    </div>
                    ${this._metadata?.metadata.ProductPicBase64
                      ? html`<img
                          class="product-image"
                          src="data:image/png;base64,${this._metadata?.metadata
                            .ProductPicBase64}"
                        />`
                      : ``}
                  </div>
                  <div class="card-actions">
                    <mwc-button @click=${this._refreshNodeClicked}>
                      Refresh Node
                    </mwc-button>
                  </div>
                </ha-card>

                ${this._metadata
                  ? html`
                      <ha-card class="content" header="Description">
                        <div class="card-content">
                          ${this._metadata.metadata.Description}
                        </div>
                      </ha-card>
                      <ha-card class="content" header="Inclusion">
                        <div class="card-content">
                          ${this._metadata.metadata.InclusionHelp}
                        </div>
                      </ha-card>
                      <ha-card class="content" header="Exclusion">
                        <div class="card-content">
                          ${this._metadata.metadata.ExclusionHelp}
                        </div>
                      </ha-card>
                      <ha-card class="content" header="Reset">
                        <div class="card-content">
                          ${this._metadata.metadata.ResetHelp}
                        </div>
                      </ha-card>
                      ${this._metadata.metadata.WakeupHelp
                        ? html`
                            <ha-card class="content" header="WakeUp">
                              <div class="card-content">
                                ${this._metadata.metadata.WakeupHelp}
                              </div>
                            </ha-card>
                          `
                        : ``}
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
    } catch (err: any) {
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

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .secondary {
          color: var(--secondary-text-color);
        }

        .content {
          margin-top: 24px;
        }

        .content:last-child {
          margin-bottom: 24px;
        }

        .sectionHeader {
          position: relative;
          padding-right: 40px;
        }

        ha-card {
          margin: 0 auto;
          max-width: 600px;
        }

        .flex {
          display: flex;
          justify-content: space-between;
        }

        .card-actions.warning ha-call-service-button {
          color: var(--error-color);
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
          padding: 0 8px 12px;
        }

        [hidden] {
          display: none;
        }

        .product-image {
          padding: 12px;
          max-height: 140px;
          max-width: 140px;
        }
        .card-actions {
          clear: right;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ozw-node-dashboard": OZWNodeDashboard;
  }
}

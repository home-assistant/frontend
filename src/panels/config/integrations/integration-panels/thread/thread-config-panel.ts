import "@material/mwc-button";
import { ActionDetail } from "@material/mwc-list";
import {
  mdiDeleteOutline,
  mdiDevices,
  mdiDotsVertical,
  mdiInformationOutline,
} from "@mdi/js";
import { css, html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../../../../common/config/is_component_loaded";
import { stringCompare } from "../../../../../common/string/compare";
import { extractSearchParam } from "../../../../../common/url/search-params";
import "../../../../../components/ha-card";
import { getSignedPath } from "../../../../../data/auth";
import { getConfigEntryDiagnosticsDownloadUrl } from "../../../../../data/diagnostics";
import {
  getOTBRInfo,
  OTBRCreateNetwork,
  OTBRGetExtendedAddress,
  OTBRInfo,
  OTBRSetNetwork,
} from "../../../../../data/otbr";
import {
  addThreadDataSet,
  listThreadDataSets,
  removeThreadDataSet,
  setPreferredThreadDataSet,
  subscribeDiscoverThreadRouters,
  ThreadDataSet,
  ThreadRouter,
} from "../../../../../data/thread";
import { showConfigFlowDialog } from "../../../../../dialogs/config-flow/show-dialog-config-flow";
import {
  showAlertDialog,
  showConfirmationDialog,
  showPromptDialog,
} from "../../../../../dialogs/generic/show-dialog-box";
import "../../../../../layouts/hass-subpage";
import { SubscribeMixin } from "../../../../../mixins/subscribe-mixin";
import { haStyle } from "../../../../../resources/styles";
import { HomeAssistant } from "../../../../../types";
import { brandsUrl } from "../../../../../util/brands-url";
import { fileDownload } from "../../../../../util/file_download";

interface ThreadNetwork {
  name: string;
  dataset?: ThreadDataSet;
  routers?: ThreadRouter[];
}

@customElement("thread-config-panel")
export class ThreadConfigPanel extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow!: boolean;

  @state() private _configEntryId: string | null = null;

  @state() private _routers: ThreadRouter[] = [];

  @state() private _datasets: ThreadDataSet[] = [];

  @state() private _otbrInfo?: OTBRInfo & { extended_address?: string };

  protected render(): TemplateResult {
    const networks = this._groupRoutersByNetwork(this._routers, this._datasets);

    return html`
      <hass-subpage .narrow=${this.narrow} .hass=${this.hass} header="Thread">
        <ha-button-menu slot="toolbar-icon" corner="BOTTOM_START">
          <ha-icon-button
            .path=${mdiDotsVertical}
            slot="trigger"
          ></ha-icon-button>
          <a
            href=${getConfigEntryDiagnosticsDownloadUrl(
              this._configEntryId || ""
            )}
            target="_blank"
            @click=${this._signUrl}
          >
            <mwc-list-item>
              ${this.hass.localize(
                "ui.panel.config.integrations.config_entry.download_diagnostics"
              )}
            </mwc-list-item>
          </a>
          <mwc-list-item @click=${this._addTLV}
            >${this.hass.localize(
              "ui.panel.config.thread.add_dataset_from_tlv"
            )}</mwc-list-item
          >
          ${!this._otbrInfo
            ? html`<mwc-list-item @click=${this._addOTBR}
                >${this.hass.localize(
                  "ui.panel.config.thread.add_open_thread_border_router"
                )}</mwc-list-item
              >`
            : ""}
        </ha-button-menu>
        <div class="content">
          <h1>${this.hass.localize("ui.panel.config.thread.my_network")}</h1>
          ${networks.preferred
            ? this._renderNetwork(networks.preferred)
            : html`<ha-card>
                <div class="card-content no-routers">
                  <h3>
                    ${this.hass.localize(
                      "ui.panel.config.thread.no_preferred_network"
                    )}
                  </h3>
                  <ha-svg-icon .path=${mdiDevices}></ha-svg-icon>
                  <mwc-button @click=${this._addOTBR}
                    >${this.hass.localize(
                      "ui.panel.config.thread.add_open_thread_border_router"
                    )}</mwc-button
                  >
                </div>
              </ha-card>`}
          ${networks.networks.length
            ? html`<h3>
                  ${this.hass.localize("ui.panel.config.thread.other_networks")}
                </h3>
                ${networks.networks.map((network) =>
                  this._renderNetwork(network)
                )}`
            : ""}
        </div>
      </hass-subpage>
    `;
  }

  private _renderNetwork(network: ThreadNetwork) {
    return html`<ha-card>
      <div class="card-header">
        ${network.name}${network.dataset
          ? html`<div>
              <ha-icon-button
                .networkDataset=${network.dataset}
                .path=${mdiInformationOutline}
                @click=${this._showDatasetInfo}
              ></ha-icon-button
              >${!network.dataset.preferred && !network.routers?.length
                ? html`<ha-icon-button
                    .networkDataset=${network.dataset}
                    .path=${mdiDeleteOutline}
                    @click=${this._removeDataset}
                  ></ha-icon-button>`
                : ""}
            </div>`
          : ""}
      </div>
      ${network.routers?.length
        ? html`<div class="card-content routers">
              <h4>
                ${this.hass.localize("ui.panel.config.thread.border_routers", {
                  count: network.routers.length,
                })}
              </h4>
            </div>
            ${network.routers.map(
              (router) =>
                html`<ha-list-item
                  class="router"
                  twoline
                  graphic="avatar"
                  .hasMeta=${router.extended_address ===
                  this._otbrInfo?.extended_address}
                >
                  <img
                    slot="graphic"
                    .src=${brandsUrl({
                      domain: router.brand,
                      brand: true,
                      type: "icon",
                      darkOptimized: this.hass.themes?.darkMode,
                    })}
                    alt=${router.brand}
                    referrerpolicy="no-referrer"
                    @error=${this._onImageError}
                    @load=${this._onImageLoad}
                  />
                  ${router.model_name || router.server.replace(".local.", "")}
                  <span slot="secondary">${router.server}</span>
                  ${router.extended_address === this._otbrInfo?.extended_address
                    ? html`<ha-button-menu
                        corner="BOTTOM_START"
                        slot="meta"
                        @action=${this._handleRouterAction}
                      >
                        <ha-icon-button
                          .label=${this.hass.localize(
                            "ui.common.overflow_menu"
                          )}
                          .path=${mdiDotsVertical}
                          slot="trigger"
                        ></ha-icon-button
                        ><ha-list-item
                          >${this.hass.localize(
                            "ui.panel.config.thread.reset_border_router"
                          )}</ha-list-item
                        >${network.dataset?.preferred
                          ? ""
                          : html`<ha-list-item
                          >${this.hass.localize(
                            "ui.panel.config.thread.add_to_my_network"
                          )}</ha-list-item
                        ></ha-button-menu
                      >`}</ha-button-menu
                      >`
                    : ""}
                </ha-list-item>`
            )}`
        : html`<div class="card-content no-routers">
            <ha-svg-icon .path=${mdiDevices}></ha-svg-icon>
            ${network.dataset?.extended_pan_id &&
            this._otbrInfo?.active_dataset_tlvs?.includes(
              network.dataset.extended_pan_id
            )
              ? html`${this.hass.localize(
                    "ui.panel.config.thread.no_routers_otbr_network"
                  )}
                  <mwc-button @click=${this._resetBorderRouter}
                    >${this.hass.localize(
                      "ui.panel.config.thread.reset_border_router"
                    )}</mwc-button
                  >`
              : this.hass.localize("ui.panel.config.thread.no_border_routers")}
          </div> `}
      ${network.dataset && !network.dataset.preferred
        ? html`<div class="card-actions">
            <mwc-button
              .datasetId=${network.dataset.dataset_id}
              @click=${this._setPreferred}
              >Make preferred network</mwc-button
            >
          </div>`
        : ""}
    </ha-card>`;
  }

  private async _showDatasetInfo(ev: Event) {
    const dataset = (ev.currentTarget as any).networkDataset as ThreadDataSet;
    if (this._otbrInfo) {
      if (
        dataset.extended_pan_id &&
        this._otbrInfo.active_dataset_tlvs?.includes(dataset.extended_pan_id)
      ) {
        showAlertDialog(this, {
          title: dataset.network_name,
          text: html`Network name: ${dataset.network_name}<br />
            Dataset id: ${dataset.dataset_id}<br />
            Pan id: ${dataset.pan_id}<br />
            Extended Pan id: ${dataset.extended_pan_id}<br />
            OTBR URL: ${this._otbrInfo.url}<br />
            Active dataset TLVs: ${this._otbrInfo.active_dataset_tlvs}`,
        });
        return;
      }
    }
    showAlertDialog(this, {
      title: dataset.network_name,
      text: html`Network name: ${dataset.network_name}<br />
        Dataset id: ${dataset.dataset_id}<br />
        Pan id: ${dataset.pan_id}<br />
        Extended Pan id: ${dataset.extended_pan_id}`,
    });
  }

  private _onImageError(ev) {
    ev.target.style.display = "none";
  }

  private _onImageLoad(ev) {
    ev.target.style.display = "";
  }

  hassSubscribe() {
    return [
      subscribeDiscoverThreadRouters(this.hass, (routers: ThreadRouter[]) => {
        this._routers = routers;
      }),
    ];
  }

  protected override firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);

    this._refresh();

    this._configEntryId = extractSearchParam("config_entry");
  }

  private _groupRoutersByNetwork = memoizeOne(
    (
      routers: ThreadRouter[],
      datasets: ThreadDataSet[]
    ): { preferred?: ThreadNetwork; networks: ThreadNetwork[] } => {
      let preferred: ThreadNetwork | undefined;
      const networks: { [key: string]: ThreadNetwork } = {};
      for (const router of routers) {
        const network = router.extended_pan_id;
        if (network in networks) {
          networks[network].routers!.push(router);
        } else {
          networks[network] = { name: router.network_name, routers: [router] };
        }
      }
      for (const dataset of datasets) {
        const network = dataset.extended_pan_id;
        if (!network) {
          continue;
        }
        if (dataset.preferred) {
          preferred = {
            name: dataset.network_name,
            dataset: dataset,
            routers: networks[network]?.routers,
          };
          delete networks[network];
          continue;
        }
        if (network in networks) {
          networks[network].dataset = dataset;
        } else {
          networks[network] = { name: dataset.network_name, dataset: dataset };
        }
      }
      return {
        preferred,
        networks: Object.values(networks).sort((a, b) =>
          stringCompare(a.name, b.name, this.hass.locale.language)
        ),
      };
    }
  );

  private async _refresh() {
    listThreadDataSets(this.hass).then((datasets) => {
      this._datasets = datasets.datasets;
    });
    if (!isComponentLoaded(this.hass, "otbr")) {
      return;
    }
    try {
      const _otbrAddress = OTBRGetExtendedAddress(this.hass);
      const _otbrInfo = getOTBRInfo(this.hass);
      const [otbrAddress, otbrInfo] = await Promise.all([
        _otbrAddress,
        _otbrInfo,
      ]);
      this._otbrInfo = { ...otbrAddress, ...otbrInfo };
    } catch (err) {
      this._otbrInfo = undefined;
    }
  }

  private async _signUrl(ev) {
    const anchor = ev.target.closest("a");
    ev.preventDefault();
    const signedUrl = await getSignedPath(
      this.hass,
      anchor.getAttribute("href")
    );
    fileDownload(signedUrl.path);
  }

  private _addOTBR() {
    showConfigFlowDialog(this, {
      dialogClosedCallback: () => {
        this._refresh();
      },
      startFlowHandler: "otbr",
      showAdvanced: this.hass.userData?.showAdvanced,
    });
  }

  private _handleRouterAction(ev: CustomEvent<ActionDetail>) {
    switch (ev.detail.index) {
      case 0:
        this._resetBorderRouter();
        break;
      case 1:
        this._setDataset();
        break;
    }
  }

  private async _resetBorderRouter() {
    const confirm = await showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.thread.confirm_reset_border_router"
      ),
      text: this.hass.localize(
        "ui.panel.config.thread.confirm_reset_border_router_text"
      ),
    });
    if (!confirm) {
      return;
    }
    try {
      await OTBRCreateNetwork(this.hass);
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.hass.localize("ui.panel.config.thread.otbr_config_failed"),
        text: err.message,
      });
    }
    this._refresh();
  }

  private async _setDataset() {
    const networks = this._groupRoutersByNetwork(this._routers, this._datasets);
    const preferedDatasetId = networks.preferred?.dataset?.dataset_id;
    if (!preferedDatasetId) {
      return;
    }
    const confirm = await showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.thread.confirm_set_dataset_border_router"
      ),
      text: this.hass.localize(
        "ui.panel.config.thread.confirm_set_dataset_border_router_text"
      ),
    });
    if (!confirm) {
      return;
    }
    try {
      await OTBRSetNetwork(this.hass, preferedDatasetId);
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.hass.localize("ui.panel.config.thread.otbr_config_failed"),
        text: err.message,
      });
    }
    this._refresh();
  }

  private async _setPreferred(ev) {
    const datasetId = ev.target.datasetId;
    await setPreferredThreadDataSet(this.hass, datasetId);
    this._refresh();
  }

  private async _addTLV() {
    const tlv = await showPromptDialog(this, {
      title: this.hass.localize("ui.panel.config.thread.add_dataset"),
      inputLabel: this.hass.localize(
        "ui.panel.config.thread.add_dataset_label"
      ),
      confirmText: this.hass.localize(
        "ui.panel.config.thread.add_dataset_button"
      ),
    });
    if (!tlv) {
      return;
    }
    try {
      await addThreadDataSet(this.hass, "manual", tlv);
    } catch (err: any) {
      showAlertDialog(this, {
        title: "Error",
        text: err.message || err,
      });
    }
    this._refresh();
  }

  private async _removeDataset(ev: Event) {
    const dataset = (ev.currentTarget as any).networkDataset as ThreadDataSet;
    const confirm = await showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.thread.confirm_delete_dataset",
        { name: dataset.network_name }
      ),
      text: this.hass.localize(
        "ui.panel.config.thread.confirm_delete_dataset_text"
      ),
      destructive: true,
      confirmText: this.hass.localize("ui.common.delete"),
    });
    if (!confirm) {
      return;
    }
    try {
      await removeThreadDataSet(this.hass, dataset.dataset_id);
    } catch (err: any) {
      showAlertDialog(this, {
        title: "Error",
        text: err.message || err,
      });
    }
    this._refresh();
  }

  static styles = [
    haStyle,
    css`
      .content {
        padding: 24px 0 32px;
        max-width: 600px;
        margin: 0 auto;
        direction: ltr;
      }
      ha-list-item.router {
        --mdc-list-side-padding: 16px;
        --mdc-list-item-meta-size: 48px;
        cursor: default;
        overflow: visible;
      }
      ha-button-menu a {
        text-decoration: none;
      }
      .routers {
        padding-bottom: 0;
      }
      .no-routers {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
      }
      .no-routers ha-svg-icon {
        background-color: var(--light-primary-color);
        color: var(--secondary-text-color);
        padding: 16px;
        border-radius: 50%;
        margin-bottom: 8px;
      }
      ha-card {
        margin-bottom: 16px;
      }
      h4 {
        margin: 0;
      }
      .card-header {
        display: flex;
        justify-content: space-between;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "thread-config-panel": ThreadConfigPanel;
  }
}

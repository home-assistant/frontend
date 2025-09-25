import type { ActionDetail } from "@material/mwc-list";
import {
  mdiCellphoneKey,
  mdiDeleteOutline,
  mdiDevices,
  mdiDotsVertical,
  mdiInformationOutline,
} from "@mdi/js";
import type { PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../../../../common/config/is_component_loaded";
import { stringCompare } from "../../../../../common/string/compare";
import { extractSearchParam } from "../../../../../common/url/search-params";
import "../../../../../components/ha-button";
import "../../../../../components/ha-button-menu";
import "../../../../../components/ha-card";
import "../../../../../components/ha-list-item";
import { getSignedPath } from "../../../../../data/auth";
import { getConfigEntryDiagnosticsDownloadUrl } from "../../../../../data/diagnostics";
import type { OTBRInfo, OTBRInfoDict } from "../../../../../data/otbr";
import {
  OTBRCreateNetwork,
  OTBRSetChannel,
  OTBRSetNetwork,
  getOTBRInfo,
} from "../../../../../data/otbr";
import type { ThreadDataSet, ThreadRouter } from "../../../../../data/thread";
import {
  addThreadDataSet,
  getThreadDataSetTLV,
  listThreadDataSets,
  removeThreadDataSet,
  setPreferredBorderAgent,
  setPreferredThreadDataSet,
  subscribeDiscoverThreadRouters,
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
import type { HomeAssistant } from "../../../../../types";
import { brandsUrl } from "../../../../../util/brands-url";
import { documentationUrl } from "../../../../../util/documentation-url";
import { fileDownload } from "../../../../../util/file_download";
import { showThreadDatasetDialog } from "./show-dialog-thread-dataset";

export interface ThreadNetwork {
  name: string;
  dataset?: ThreadDataSet;
  routers?: ThreadRouter[];
}

@customElement("thread-config-panel")
export class ThreadConfigPanel extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @state() private _configEntryId: string | null = null;

  @state() private _routers: ThreadRouter[] = [];

  @state() private _datasets: ThreadDataSet[] = [];

  @state() private _otbrInfo?: OTBRInfoDict;

  protected render(): TemplateResult {
    const networks = this._groupRoutersByNetwork(this._routers, this._datasets);

    return html`
      <hass-subpage .narrow=${this.narrow} .hass=${this.hass} header="Thread">
        <ha-button-menu slot="toolbar-icon">
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
            <ha-list-item>
              ${this.hass.localize(
                "ui.panel.config.integrations.config_entry.download_diagnostics"
              )}
            </ha-list-item>
          </a>
          <ha-list-item @click=${this._addTLV}
            >${this.hass.localize(
              "ui.panel.config.thread.add_dataset_from_tlv"
            )}</ha-list-item
          >
          <ha-list-item @click=${this._addOTBR}
            >${this.hass.localize(
              "ui.panel.config.thread.add_open_thread_border_router"
            )}</ha-list-item
          >
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
                  <ha-button
                    appearance="plain"
                    size="small"
                    href=${documentationUrl(this.hass, `/integrations/thread`)}
                    target="_blank"
                  >
                    ${this.hass.localize(
                      "ui.panel.config.thread.more_info"
                    )}</ha-button
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
        ${this.hass.auth.external?.config.canImportThreadCredentials
          ? html`<ha-fab
              slot="fab"
              @click=${this._importExternalThreadCredentials}
              extended
              label="Send credentials to Home Assistant"
              ><ha-svg-icon slot="icon" .path=${mdiCellphoneKey}></ha-svg-icon
            ></ha-fab>`
          : nothing}
      </hass-subpage>
    `;
  }

  private _renderNetwork(network: ThreadNetwork) {
    const otbrForNetwork =
      this._otbrInfo &&
      network.dataset &&
      ((network.dataset.preferred_extended_address &&
        this._otbrInfo[network.dataset.preferred_extended_address]) ||
        Object.values(this._otbrInfo).find(
          (otbr) => otbr.extended_pan_id === network.dataset!.extended_pan_id
        ));
    const canImportKeychain =
      this.hass.auth.external?.config.canTransferThreadCredentialsToKeychain;

    return html`<ha-card>
      <div class="card-header">
        ${network.name}${network.dataset
          ? html`<div>
              <ha-icon-button
                .label=${this.hass.localize(
                  "ui.panel.config.thread.thread_network_info"
                )}
                .otbr=${otbrForNetwork}
                .network=${network}
                .path=${mdiInformationOutline}
                @click=${this._showDatasetInfo}
              ></ha-icon-button
              >${!network.dataset.preferred && !network.routers?.length
                ? html`<ha-icon-button
                    .label=${this.hass.localize(
                      "ui.panel.config.thread.thread_network_delete_credentials"
                    )}
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
            ${network.routers.map((router) => {
              const otbr =
                this._otbrInfo && this._otbrInfo[router.extended_address];
              const showDefaultRouter = !!network.dataset;
              const isDefaultRouter =
                showDefaultRouter &&
                router.extended_address ===
                  network.dataset!.preferred_extended_address;
              const showOverflow = showDefaultRouter || otbr;
              return html`<ha-list-item
                class="router"
                twoline
                graphic="avatar"
                .hasMeta=${showOverflow}
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
                  crossorigin="anonymous"
                  referrerpolicy="no-referrer"
                  @error=${this._onImageError}
                  @load=${this._onImageLoad}
                />
                ${router.instance_name ||
                router.model_name ||
                router.server?.replace(".local.", "") ||
                ""}
                <span slot="secondary">${router.server}</span>
                ${showOverflow
                  ? html`${isDefaultRouter
                        ? html`<ha-svg-icon
                            .path=${mdiCellphoneKey}
                            .title=${this.hass.localize(
                              "ui.panel.config.thread.default_router"
                            )}
                          ></ha-svg-icon>`
                        : ""}
                      <ha-button-menu
                        slot="meta"
                        .network=${network}
                        .router=${router}
                        .otbr=${otbr}
                        @action=${this._handleRouterAction}
                      >
                        <ha-icon-button
                          .label=${this.hass.localize(
                            "ui.common.overflow_menu"
                          )}
                          .path=${mdiDotsVertical}
                          slot="trigger"
                        ></ha-icon-button>
                        ${showDefaultRouter
                          ? html`<ha-list-item .disabled=${isDefaultRouter}>
                              ${isDefaultRouter
                                ? this.hass.localize(
                                    "ui.panel.config.thread.default_router"
                                  )
                                : this.hass.localize(
                                    "ui.panel.config.thread.set_default_router"
                                  )}
                            </ha-list-item>`
                          : ""}
                        ${otbr
                          ? html`<ha-list-item>
                                ${this.hass.localize(
                                  "ui.panel.config.thread.reset_border_router"
                                )}</ha-list-item
                              >
                              <ha-list-item>
                                ${this.hass.localize(
                                  "ui.panel.config.thread.change_channel"
                                )}</ha-list-item
                              >
                              ${network.dataset?.preferred
                                ? ""
                                : html`<ha-list-item>
                                    ${this.hass.localize(
                                      "ui.panel.config.thread.add_to_my_network"
                                    )}
                                  </ha-list-item>`}`
                          : ""}
                      </ha-button-menu>`
                  : ""}
              </ha-list-item>`;
            })}`
        : html`<div class="card-content no-routers">
            <ha-svg-icon .path=${mdiDevices}></ha-svg-icon>
            ${otbrForNetwork
              ? html`${this.hass.localize(
                    "ui.panel.config.thread.no_routers_otbr_network"
                  )}
                  <ha-button
                    appearance="plain"
                    size="small"
                    .otbr=${otbrForNetwork}
                    @click=${this._resetBorderRouterEvent}
                    >${this.hass.localize(
                      "ui.panel.config.thread.reset_border_router"
                    )}</ha-button
                  >`
              : this.hass.localize("ui.panel.config.thread.no_border_routers")}
          </div> `}
      ${network.dataset && !network.dataset.preferred
        ? html`<div class="card-actions">
            <ha-button
              .datasetId=${network.dataset.dataset_id}
              @click=${this._setPreferred}
              >Make preferred network</ha-button
            >
          </div>`
        : ""}
      ${canImportKeychain &&
      network.dataset?.preferred &&
      network.routers?.length
        ? html`<div class="card-actions">
            <ha-button
              size="small"
              .networkDataset=${network.dataset}
              @click=${this._sendCredentials}
              >Send credentials to phone</ha-button
            >
          </div>`
        : ""}
    </ha-card>`;
  }

  private async _sendCredentials(ev) {
    const dataset = (ev.currentTarget as any).networkDataset as ThreadDataSet;
    if (!dataset) {
      return;
    }
    if (
      !dataset.preferred_extended_address &&
      !dataset.preferred_border_agent_id
    ) {
      showAlertDialog(this, {
        title: "Error",
        text: this.hass.localize("ui.panel.config.thread.no_preferred_router"),
      });
      return;
    }
    this.hass.auth.external!.fireMessage({
      type: "thread/store_in_platform_keychain",
      payload: {
        mac_extended_address: dataset.preferred_extended_address,
        border_agent_id: dataset.preferred_border_agent_id,
        active_operational_dataset: (
          await getThreadDataSetTLV(this.hass, dataset.dataset_id)
        ).tlv,
        extended_pan_id: dataset.extended_pan_id,
      },
    });
  }

  private async _showDatasetInfo(ev: Event) {
    const network = (ev.currentTarget as any).network as ThreadNetwork;
    const otbr = (ev.currentTarget as any).otbr as OTBRInfo;
    showThreadDatasetDialog(this, { network, otbrInfo: otbr });
  }

  private _importExternalThreadCredentials() {
    this.hass.auth.external!.fireMessage({
      type: "thread/import_credentials",
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
      const networks: Record<string, ThreadNetwork> = {};
      for (const router of routers) {
        const network = router.extended_pan_id;
        if (network in networks) {
          networks[network].routers!.push(router);
        } else {
          networks[network] = {
            name: router.network_name || "",
            routers: [router],
          };
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
      this._otbrInfo = await getOTBRInfo(this.hass);
    } catch (_err) {
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
    const network = (ev.currentTarget as any).network as ThreadNetwork;
    const router = (ev.currentTarget as any).router as ThreadRouter;
    const otbr = (ev.currentTarget as any).otbr as OTBRInfo;
    const index = network.dataset
      ? Number(ev.detail.index)
      : Number(ev.detail.index) + 1;
    switch (index) {
      case 0:
        this._setPreferredBorderAgent(network.dataset!, router);
        break;
      case 1:
        this._resetBorderRouter(otbr);
        break;
      case 2:
        this._changeChannel(otbr);
        break;
      case 3:
        this._setDataset(otbr);
        break;
    }
  }

  private _resetBorderRouterEvent(ev) {
    const otbr = (ev.currentTarget as any).otbr as OTBRInfo;
    this._resetBorderRouter(otbr);
  }

  private async _resetBorderRouter(otbr: OTBRInfo) {
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
      await OTBRCreateNetwork(this.hass, otbr.extended_address);
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.hass.localize("ui.panel.config.thread.otbr_config_failed"),
        text: err.message,
      });
    }
    this._refresh();
  }

  private async _setDataset(otbr: OTBRInfo) {
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
      await OTBRSetNetwork(this.hass, otbr.extended_address, preferedDatasetId);
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

  private async _setPreferredBorderAgent(
    dataset: ThreadDataSet,
    router: ThreadRouter
  ) {
    await setPreferredBorderAgent(
      this.hass,
      dataset.dataset_id,
      router.border_agent_id,
      router.extended_address
    );
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

  private async _changeChannel(otbr: OTBRInfo) {
    const currentChannel = otbr.channel;
    const channelStr = await showPromptDialog(this, {
      title: this.hass.localize("ui.panel.config.thread.change_channel"),
      text: this.hass.localize("ui.panel.config.thread.change_channel_text"),
      inputLabel: this.hass.localize(
        "ui.panel.config.thread.change_channel_label"
      ),
      confirmText: this.hass.localize("ui.panel.config.thread.change_channel"),
      inputType: "number",
      inputMin: "11",
      inputMax: "26",
      defaultValue: currentChannel ? currentChannel.toString() : undefined,
    });
    if (!channelStr) {
      return;
    }
    const channel = parseInt(channelStr);
    if (channel < 11 || channel > 26) {
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.thread.change_channel_invalid"
        ),
        text: this.hass.localize("ui.panel.config.thread.change_channel_range"),
      });
      return;
    }
    try {
      const result = await OTBRSetChannel(
        this.hass,
        otbr.extended_address,
        channel
      );
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.thread.change_channel_initiated_title"
        ),
        text: this.hass.localize(
          "ui.panel.config.thread.change_channel_initiated_text",
          { delay: Math.floor(result.delay / 60) }
        ),
      });
    } catch (err: any) {
      if (err.code === "multiprotocol_enabled") {
        showAlertDialog(this, {
          title: this.hass.localize(
            "ui.panel.config.thread.change_channel_multiprotocol_enabled_title"
          ),
          text: this.hass.localize(
            "ui.panel.config.thread.change_channel_multiprotocol_enabled_text"
          ),
        });
        return;
      }
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
        padding: 24px 8px 32px;
        max-width: 600px;
        margin: 0 auto;
        direction: ltr;
      }
      ha-list-item.router {
        --mdc-list-item-meta-size: auto;
        --mdc-list-item-meta-display: flex;
        --mdc-list-side-padding: 16px;
        cursor: default;
        overflow: visible;
      }
      ha-list-item img {
        border-radius: var(--ha-border-radius-square);
      }
      ha-svg-icon[slot="meta"] {
        width: 24px;
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
        border-radius: var(--ha-border-radius-circle);
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

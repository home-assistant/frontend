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
import "../../../../../components/ha-alert";
import "../../../../../components/ha-button";
import "../../../../../components/ha-card";
import "../../../../../components/ha-dropdown";
import type { HaDropdownSelectEvent } from "../../../../../components/ha-dropdown";
import "../../../../../components/ha-dropdown-item";
import { getSignedPath } from "../../../../../data/auth";
import { getConfigEntryDiagnosticsDownloadUrl } from "../../../../../data/diagnostics";
import type { OTBRInfo, OTBRInfoDict } from "../../../../../data/otbr";
import {
  OTBRCreateNetwork,
  OTBRDeletePendingDataset,
  OTBRGetPendingDataset,
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
import "../../../../../panels/lovelace/components/hui-timestamp-display";
import { showThreadDatasetDialog } from "./show-dialog-thread-dataset";

interface PendingChannelChange {
  pending_channel: number;
  end_time: Date;
}

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

  @state() private _pendingChanges: Record<string, PendingChannelChange> = {};

  @state() private _completedMigrations: Record<string, boolean> = {};

  private _syncInterval?: ReturnType<typeof setInterval>;

  private _completionTimeouts: Record<string, ReturnType<typeof setTimeout>> =
    {};

  protected render(): TemplateResult {
    const networks = this._groupRoutersByNetwork(this._routers, this._datasets);

    return html`
      <hass-subpage
        .narrow=${this.narrow}
        .hass=${this.hass}
        header="Thread"
        back-path="/config"
      >
        <ha-dropdown slot="toolbar-icon">
          <ha-icon-button
            .path=${mdiDotsVertical}
            slot="trigger"
            .label=${this.hass.localize("ui.common.menu")}
          ></ha-icon-button>
          <a
            href=${getConfigEntryDiagnosticsDownloadUrl(
              this._configEntryId || ""
            )}
            target="_blank"
            @click=${this._signUrl}
          >
            <ha-dropdown-item>
              ${this.hass.localize(
                "ui.panel.config.integrations.config_entry.download_diagnostics"
              )}
            </ha-dropdown-item>
          </a>
          <ha-dropdown-item @click=${this._addTLV}
            >${this.hass.localize(
              "ui.panel.config.thread.add_dataset_from_tlv"
            )}</ha-dropdown-item
          >
          <ha-dropdown-item @click=${this._addOTBR}
            >${this.hass.localize(
              "ui.panel.config.thread.add_open_thread_border_router"
            )}</ha-dropdown-item
          >
        </ha-dropdown>
        <div class="content">
          <h2>${this.hass.localize("ui.panel.config.thread.my_network")}</h2>
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
          ${this.hass.auth.external?.config.canImportThreadCredentials
            ? html`<h3>
                  ${this.hass.localize(
                    "ui.panel.config.thread.thread_network_send_credentials_ha"
                  )}
                </h3>
                <ha-card>
                  <div class="card-content">
                    ${this.hass.localize(
                      "ui.panel.config.thread.thread_network_send_credentials_ha_description"
                    )}
                  </div>
                  <div class="card-actions">
                    <ha-button
                      size="small"
                      @click=${this._importExternalThreadCredentials}
                    >
                      ${this.hass.localize(
                        "ui.panel.config.thread.thread_network_send_credentials_ha"
                      )}
                    </ha-button>
                  </div>
                </ha-card>`
            : nothing}
        </div>
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
      ${this._renderPendingChannelAlert(otbrForNetwork)}
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
                  .src=${brandsUrl(
                    {
                      domain: router.brand,
                      type: "icon",
                      darkOptimized: this.hass.themes?.darkMode,
                    },
                    this.hass.auth.data.hassUrl
                  )}
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
                      <ha-dropdown
                        slot="meta"
                        .network=${network}
                        .router=${router}
                        .otbr=${otbr}
                        @wa-select=${this._handleRouterAction}
                      >
                        <ha-icon-button
                          .label=${this.hass.localize(
                            "ui.common.overflow_menu"
                          )}
                          .path=${mdiDotsVertical}
                          slot="trigger"
                        ></ha-icon-button>
                        ${showDefaultRouter
                          ? html`<ha-dropdown-item
                              value="set-default"
                              .disabled=${isDefaultRouter}
                            >
                              ${isDefaultRouter
                                ? this.hass.localize(
                                    "ui.panel.config.thread.default_router"
                                  )
                                : this.hass.localize(
                                    "ui.panel.config.thread.set_default_router"
                                  )}
                            </ha-dropdown-item>`
                          : ""}
                        ${otbr
                          ? html`<ha-dropdown-item value="reset-router">
                                ${this.hass.localize(
                                  "ui.panel.config.thread.reset_border_router"
                                )}</ha-dropdown-item
                              >
                              <ha-dropdown-item value="change-channel">
                                ${this.hass.localize(
                                  "ui.panel.config.thread.change_channel"
                                )}</ha-dropdown-item
                              >
                              ${network.dataset?.preferred
                                ? ""
                                : html`<ha-dropdown-item value="add-to-network">
                                    ${this.hass.localize(
                                      "ui.panel.config.thread.add_to_my_network"
                                    )}
                                  </ha-dropdown-item>`}`
                          : ""}
                      </ha-dropdown>`
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
              size="small"
              .datasetId=${network.dataset.dataset_id}
              @click=${this._setPreferred}
              >${this.hass.localize(
                "ui.panel.config.thread.thread_network_make_preferred"
              )}</ha-button
            >
          </div>`
        : ""}
      ${canImportKeychain &&
      network.dataset?.preferred &&
      network.routers?.length
        ? html`<div class="card-actions">
            <p class="send-to-phone-description">
              ${this.hass.localize(
                "ui.panel.config.thread.thread_network_send_credentials_phone_description"
              )}
            </p>
            <ha-button
              size="small"
              .networkDataset=${network.dataset}
              @click=${this._sendCredentials}
              >${this.hass.localize(
                "ui.panel.config.thread.thread_network_send_credentials_phone"
              )}</ha-button
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

  public override disconnectedCallback() {
    super.disconnectedCallback();
    this._clearSync();
    for (const timeout of Object.values(this._completionTimeouts)) {
      clearTimeout(timeout);
    }
    this._completionTimeouts = {};
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
    if (!isComponentLoaded(this.hass.config, "otbr")) {
      return;
    }
    try {
      this._otbrInfo = await getOTBRInfo(this.hass);
    } catch (_err) {
      this._otbrInfo = undefined;
    }
    await this._refreshPendingDatasets();
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

  private _handleRouterAction(ev: HaDropdownSelectEvent) {
    const network = (ev.currentTarget as any).network as ThreadNetwork;
    const router = (ev.currentTarget as any).router as ThreadRouter;
    const otbr = (ev.currentTarget as any).otbr as OTBRInfo;
    const action = ev.detail.item.value;
    switch (action) {
      case "set-default":
        this._setPreferredBorderAgent(network.dataset!, router);
        break;
      case "reset-router":
        this._resetBorderRouter(otbr);
        break;
      case "change-channel":
        this._changeChannel(otbr);
        break;
      case "add-to-network":
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

  private _renderPendingChannelAlert(
    otbr: OTBRInfo | false | undefined
  ): TemplateResult | typeof nothing {
    if (!otbr) {
      return nothing;
    }
    const extAddr = otbr.extended_address;

    if (this._completedMigrations[extAddr]) {
      return html`<ha-alert class="pending-alert" alert-type="success">
        ${this.hass.localize(
          "ui.panel.config.thread.pending_channel_change_complete"
        )}
      </ha-alert>`;
    }

    const pending = this._pendingChanges[extAddr];
    if (!pending) {
      return nothing;
    }

    return html`<ha-alert class="pending-alert" alert-type="info">
      ${this.hass.localize(
        "ui.panel.config.thread.pending_channel_change_label"
      )}:
      <b>${otbr.channel}</b> → <b>${pending.pending_channel}</b>
      —
      <hui-timestamp-display
        .hass=${this.hass}
        .ts=${pending.end_time}
        format="relative"
        capitalize
      ></hui-timestamp-display>
      <ha-button
        slot="action"
        .extendedAddress=${extAddr}
        @click=${this._cancelChannelChange}
      >
        ${this.hass.localize(
          "ui.panel.config.thread.pending_channel_change_cancel"
        )}
      </ha-button>
    </ha-alert>`;
  }

  private async _refreshPendingDatasets() {
    if (!this._otbrInfo) {
      this._pendingChanges = {};
      this._clearSync();
      return;
    }
    const newPending: Record<string, PendingChannelChange> = {};
    const now = Date.now();
    const promises = Object.keys(this._otbrInfo).map(async (extAddr) => {
      try {
        const result = await OTBRGetPendingDataset(this.hass, extAddr);
        if (result) {
          newPending[extAddr] = {
            pending_channel: result.pending_channel,
            end_time: new Date(now + result.pending_dataset_delay * 1000),
          };
        }
      } catch (_err) {
        // Ignore errors fetching pending dataset
      }
    });
    await Promise.all(promises);
    this._pendingChanges = newPending;
    this._scheduleCompletionChecks();
    this._startSync();
  }

  private _scheduleCompletionChecks() {
    // Clear existing completion timeouts
    for (const timeout of Object.values(this._completionTimeouts)) {
      clearTimeout(timeout);
    }
    this._completionTimeouts = {};

    const now = Date.now();
    for (const [extAddr, pending] of Object.entries(this._pendingChanges)) {
      const remaining = pending.end_time.getTime() - now;
      if (remaining <= 0) {
        this._handleCompletion(extAddr);
      } else {
        this._completionTimeouts[extAddr] = setTimeout(() => {
          this._handleCompletion(extAddr);
        }, remaining);
      }
    }
  }

  private _handleCompletion(extAddr: string) {
    if (!this.isConnected) {
      return;
    }
    const { [extAddr]: _, ...rest } = this._pendingChanges;
    this._pendingChanges = rest;
    this._completedMigrations = {
      ...this._completedMigrations,
      [extAddr]: true,
    };
    setTimeout(() => {
      if (!this.isConnected) {
        return;
      }
      const { [extAddr]: __, ...remaining } = this._completedMigrations;
      this._completedMigrations = remaining;
    }, 5000);
    this._refresh();
  }

  private _startSync() {
    if (Object.keys(this._pendingChanges).length > 0 && !this._syncInterval) {
      this._syncInterval = setInterval(() => {
        this._refreshPendingDatasets();
      }, 30_000);
    } else if (
      Object.keys(this._pendingChanges).length === 0 &&
      this._syncInterval
    ) {
      this._clearSync();
    }
  }

  private _clearSync() {
    if (this._syncInterval) {
      clearInterval(this._syncInterval);
      this._syncInterval = undefined;
    }
  }

  private async _cancelChannelChange(ev: Event) {
    const extAddr = (ev.currentTarget as any).extendedAddress as string;
    try {
      await OTBRDeletePendingDataset(this.hass, extAddr);
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.hass.localize("ui.panel.config.thread.otbr_config_failed"),
        text: err.message || err,
      });
      return;
    }
    if (this._completionTimeouts[extAddr]) {
      clearTimeout(this._completionTimeouts[extAddr]);
      delete this._completionTimeouts[extAddr];
    }
    const { [extAddr]: _, ...rest } = this._pendingChanges;
    this._pendingChanges = rest;
    this._startSync();
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
      await OTBRSetChannel(this.hass, otbr.extended_address, channel);
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
      ha-dropdown a {
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
      h3 {
        margin-top: var(--ha-space-8);
      }
      h4 {
        margin: 0;
      }
      .card-header {
        display: flex;
        justify-content: space-between;
      }

      .pending-alert {
        margin: var(--ha-space-2) var(--ha-space-4);
      }

      .send-to-phone-description {
        color: var(--secondary-text-color);
        font-size: var(--ha-font-size-s);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "thread-config-panel": ThreadConfigPanel;
  }
}

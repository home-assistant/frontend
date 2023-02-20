import "@material/mwc-button";
import { mdiDevices, mdiDotsVertical, mdiInformationOutline } from "@mdi/js";
import { css, html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../../../../common/config/is_component_loaded";
import { stringCompare } from "../../../../../common/string/compare";
import "../../../../../components/ha-card";
import { getOTBRInfo } from "../../../../../data/otbr";
import {
  listThreadDataSets,
  subscribeDiscoverThreadRouters,
  ThreadDataSet,
  ThreadRouter,
} from "../../../../../data/thread";
import { showConfigFlowDialog } from "../../../../../dialogs/config-flow/show-dialog-config-flow";
import { showAlertDialog } from "../../../../../dialogs/generic/show-dialog-box";
import "../../../../../layouts/hass-subpage";
import { SubscribeMixin } from "../../../../../mixins/subscribe-mixin";
import { haStyle } from "../../../../../resources/styles";
import { HomeAssistant } from "../../../../../types";
import { brandsUrl } from "../../../../../util/brands-url";

interface ThreadNetwork {
  name: string;
  dataset?: ThreadDataSet;
  routers?: ThreadRouter[];
}

@customElement("thread-config-panel")
export class ThreadConfigPanel extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow!: boolean;

  @state() private _routers: ThreadRouter[] = [];

  @state() private _datasets: ThreadDataSet[] = [];

  protected render(): TemplateResult {
    const networks = this._groupRoutersByNetwork(this._routers, this._datasets);

    return html`
      <hass-subpage .narrow=${this.narrow} .hass=${this.hass} header="Thread">
        <ha-button-menu slot="toolbar-icon" corner="BOTTOM_START">
          <ha-icon-button
            .path=${mdiDotsVertical}
            slot="trigger"
          ></ha-icon-button>
          <mwc-list-item @click=${this._addOTBR}
            >${this.hass.localize(
              "ui.panel.config.thread.add_open_thread_border_router"
            )}</mwc-list-item
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
          ? html`<ha-icon-button
              .networkDataset=${network.dataset}
              .path=${mdiInformationOutline}
              @click=${this._showDatasetInfo}
            ></ha-icon-button>`
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
                html`<ha-list-item noninteractive twoline graphic="avatar">
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
                </ha-list-item>`
            )}`
        : html`<div class="card-content no-routers">
            <ha-svg-icon .path=${mdiDevices}></ha-svg-icon>
            ${this.hass.localize("ui.panel.config.thread.no_border_routers")}
          </div>`}
    </ha-card>`;
  }

  private async _showDatasetInfo(ev: Event) {
    const dataset = (ev.currentTarget as any).networkDataset as ThreadDataSet;
    if (isComponentLoaded(this.hass, "otbr")) {
      const otbrInfo = await getOTBRInfo(this.hass);
      if (otbrInfo.active_dataset_tlvs.includes(dataset.extended_pan_id)) {
        showAlertDialog(this, {
          title: dataset.network_name,
          text: html`Network name: ${dataset.network_name}<br />
            Dataset id: ${dataset.dataset_id}<br />
            Pan id: ${dataset.pan_id}<br />
            Extended Pan id: ${dataset.extended_pan_id}<br />
            OTBR URL: ${otbrInfo.url}<br />
            Active dataset TLVs: ${otbrInfo.active_dataset_tlvs}`,
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
  }

  private _groupRoutersByNetwork = memoizeOne(
    (
      routers: ThreadRouter[],
      datasets: ThreadDataSet[]
    ): { preferred?: ThreadNetwork; networks: ThreadNetwork[] } => {
      let preferred: ThreadNetwork | undefined;
      const networks: { [key: string]: ThreadNetwork } = {};
      for (const router of routers) {
        const network = router.network_name;
        if (network in networks) {
          networks[network].routers!.push(router);
        } else {
          networks[network] = { name: network, routers: [router] };
        }
      }
      for (const dataset of datasets) {
        const network = dataset.network_name;
        if (dataset.preferred) {
          preferred = {
            name: network,
            dataset: dataset,
            routers: networks[network]?.routers,
          };
          delete networks[network];
          continue;
        }
        if (network in networks) {
          networks[network].dataset = dataset;
        } else {
          networks[network] = { name: network, dataset: dataset };
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

  private _refresh() {
    listThreadDataSets(this.hass).then((datasets) => {
      this._datasets = datasets.datasets;
    });
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

  static styles = [
    haStyle,
    css`
      .content {
        padding: 24px 0 32px;
        max-width: 600px;
        margin: 0 auto;
        direction: ltr;
      }
      .routers {
        padding-bottom: 0;
      }
      .no-routers {
        display: flex;
        flex-direction: column;
        align-items: center;
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

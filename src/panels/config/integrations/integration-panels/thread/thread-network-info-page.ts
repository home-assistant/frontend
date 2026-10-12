import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../../../../common/config/is_component_loaded";
import "../../../../../components/ha-card";
import "../../../../../components/ha-spinner";
import "../../../../../components/item/ha-list-item-base";
import "../../../../../components/list/ha-list-base";
import type { OTBRInfo } from "../../../../../data/otbr";
import { findOTBRInfoForDataset, getOTBRInfo } from "../../../../../data/otbr";
import type { ThreadDataSet } from "../../../../../data/thread";
import { listThreadDataSets } from "../../../../../data/thread";
import "../../../../../layouts/hass-error-screen";
import "../../../../../layouts/hass-subpage";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";
import { getWsErrorMessage } from "../../../../../util/ws-error";

@customElement("thread-network-info-page")
class ThreadNetworkInfoPage extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ attribute: false }) public datasetId!: string;

  @state() private _loaded = false;

  @state() private _error?: string;

  @state() private _dataset?: ThreadDataSet;

  @state() private _otbrInfo?: OTBRInfo;

  @state() private _otbrLoading = false;

  protected async firstUpdated(changedProperties: PropertyValues<this>) {
    super.firstUpdated(changedProperties);
    await this._fetchThreadDataSet();
    this._fetchOTBRInfo();
  }

  private async _fetchThreadDataSet(): Promise<void> {
    try {
      const { datasets } = await listThreadDataSets(this.hass);
      this._dataset = datasets.find(
        (item) => item.dataset_id === this.datasetId
      );
    } catch (err: unknown) {
      this._error =
        getWsErrorMessage(err) ?? this.hass.localize("ui.common.unknown_error");
    }
    this._loaded = true;
  }

  private async _fetchOTBRInfo(): Promise<void> {
    if (!this._dataset || !isComponentLoaded(this.hass.config, "otbr")) {
      return;
    }

    this._otbrLoading = true;
    const otbrInfo = await getOTBRInfo(this.hass).catch(() => undefined);
    const otbr = findOTBRInfoForDataset(otbrInfo, this._dataset);
    if (otbr?.active_dataset_tlvs?.includes(this._dataset.extended_pan_id)) {
      this._otbrInfo = otbr;
    }
    this._otbrLoading = false;
  }

  protected render(): TemplateResult {
    if (this._loaded && !this._dataset) {
      return html`
        <hass-error-screen
          .hass=${this.hass}
          .error=${
            this._error ??
            this.hass.localize("ui.panel.config.thread.network_info.not_found")
          }
        ></hass-error-screen>
      `;
    }

    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.hass.localize(
          "ui.panel.config.thread.network_info.title"
        )}
        back-path=${`/config/thread/dashboard${window.location.search}`}
      >
        <div class="container">
          ${this._dataset ? this._renderDataset(this._dataset) : nothing}
        </div>
      </hass-subpage>
    `;
  }

  private _renderDataset(dataset: ThreadDataSet) {
    return html`<ha-card>
      <ha-list-base>
        ${this._renderRow(
          this.hass.localize(
            "ui.panel.config.thread.network_info.network_name"
          ),
          dataset.network_name
        )}
        ${this._renderRow(
          this.hass.localize("ui.panel.config.thread.network_info.channel"),
          dataset.channel
        )}
        ${this._renderRow(
          this.hass.localize("ui.panel.config.thread.network_info.pan_id"),
          dataset.pan_id
        )}
        ${this._renderRow(
          this.hass.localize(
            "ui.panel.config.thread.network_info.extended_pan_id"
          ),
          dataset.extended_pan_id
        )}
        ${this._renderRow(
          this.hass.localize("ui.panel.config.thread.network_info.dataset_id"),
          dataset.dataset_id
        )}
        ${this._renderOTBRRows()}
      </ha-list-base>
    </ha-card>`;
  }

  private _renderOTBRRows() {
    if (this._otbrLoading) {
      return html`<ha-list-item-base>
        <span slot="headline"
          >${this.hass.localize(
            "ui.panel.config.thread.network_info.loading_otbr"
          )}</span
        >
        <ha-spinner slot="end" size="small"></ha-spinner>
      </ha-list-item-base>`;
    }
    if (!this._otbrInfo) {
      return nothing;
    }
    return html`${this._renderRow(
      this.hass.localize("ui.panel.config.thread.network_info.otbr_url"),
      this._otbrInfo.url
    )}
    ${this._renderRow(
      this.hass.localize(
        "ui.panel.config.thread.network_info.active_dataset_tlvs"
      ),
      this._otbrInfo.active_dataset_tlvs
    )}`;
  }

  private _renderRow(label: string, value: string | number | null) {
    if (value === null) {
      return nothing;
    }
    return html`<ha-list-item-base>
      <span slot="headline">${label}</span>
      <span slot="supporting-text">${value}</span>
    </ha-list-item-base>`;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .container {
          padding: var(--ha-space-2) var(--ha-space-4) var(--ha-space-4);
        }

        ha-card {
          max-width: 600px;
          margin: auto;
        }

        ha-list-item-base::part(supporting-text) {
          font-size: var(--ha-font-size-m);
          white-space: normal;
          overflow-wrap: anywhere;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "thread-network-info-page": ThreadNetworkInfoPage;
  }
}

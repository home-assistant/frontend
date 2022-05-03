import { mdiDotsVertical } from "@mdi/js";
import { css, html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import "../../../components/ha-alert";
import "../../../components/ha-button-menu";
import "../../../components/ha-metric";
import { fetchHassioHostInfo, HassioHostInfo } from "../../../data/hassio/host";
import "../../../layouts/hass-subpage";
import type { HomeAssistant, Route } from "../../../types";
import {
  getValueInPercentage,
  roundWithOneDecimal,
} from "../../../util/calculate";
import "../core/ha-config-analytics";
import { showMoveDatadiskDialog } from "./show-dialog-move-datadisk";

@customElement("ha-config-section-storage")
class HaConfigSectionStorage extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public narrow!: boolean;

  @state() private _error?: { code: string; message: string };

  @state() private _hostInfo?: HassioHostInfo;

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    if (isComponentLoaded(this.hass, "hassio")) {
      this._load();
    }
  }

  protected render(): TemplateResult {
    return html`
      <hass-subpage
        back-path="/config/system"
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.hass.localize("ui.panel.config.storage.caption")}
      >
        ${this._hostInfo
          ? html`
              <ha-button-menu corner="BOTTOM_START" slot="toolbar-icon">
                <ha-icon-button
                  slot="trigger"
                  .label=${this.hass.localize("ui.common.menu")}
                  .path=${mdiDotsVertical}
                ></ha-icon-button>
                <mwc-list-item @click=${this._moveDatadisk}>
                  ${this.hass.localize(
                    "ui.panel.config.storage.datadisk.title"
                  )}
                </mwc-list-item>
              </ha-button-menu>
            `
          : ""}
        <div class="content">
          ${this._error
            ? html`
                <ha-alert alert-type="error"
                  >${this._error.message || this._error.code}</ha-alert
                >
              `
            : ""}
          ${this._hostInfo
            ? html`
                <ha-card outlined>
                  <div class="card-content">
                    <ha-metric
                      .heading=${this.hass.localize(
                        "ui.panel.config.storage.used_space"
                      )}
                      .value=${this._getUsedSpace(
                        this._hostInfo?.disk_used,
                        this._hostInfo?.disk_total
                      )}
                      .tooltip=${`${this._hostInfo.disk_used} GB/${this._hostInfo.disk_total} GB`}
                    ></ha-metric>
                    ${this._hostInfo.disk_life_time !== "" &&
                    this._hostInfo.disk_life_time >= 10
                      ? html`
                          <ha-metric
                            .heading=${this.hass.localize(
                              "ui.panel.config.storage.emmc_lifetime_used"
                            )}
                            .value=${this._hostInfo.disk_life_time}
                            .tooltip=${`${
                              this._hostInfo.disk_life_time - 10
                            } % -
                          ${this._hostInfo.disk_life_time} %`}
                            class="emmc"
                          ></ha-metric>
                        `
                      : ""}
                  </div>
                </ha-card>
              `
            : ""}
        </div>
      </hass-subpage>
    `;
  }

  private async _load() {
    try {
      this._hostInfo = await fetchHassioHostInfo(this.hass);
    } catch (err: any) {
      this._error = err.message || err;
    }
  }

  private _moveDatadisk(): void {
    showMoveDatadiskDialog(this, {
      hostInfo: this._hostInfo!,
    });
  }

  private _getUsedSpace = (used: number, total: number) =>
    roundWithOneDecimal(getValueInPercentage(used, 0, total));

  static styles = css`
    .content {
      padding: 28px 20px 0;
      max-width: 1040px;
      margin: 0 auto;
    }
    ha-card {
      max-width: 600px;
      margin: 0 auto;
      justify-content: space-between;
      flex-direction: column;
      display: flex;
    }
    .card-content {
      display: flex;
      justify-content: space-between;
      flex-direction: column;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-section-storage": HaConfigSectionStorage;
  }
}

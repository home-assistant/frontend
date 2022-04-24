import { css, html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import "../../../components/ha-alert";
import "../../../components/ha-bar";
import "../../../components/ha-metric";
import { fetchHassioHostInfo, HassioHostInfo } from "../../../data/hassio/host";
import "../../../layouts/hass-subpage";
import type { HomeAssistant, Route } from "../../../types";
import {
  getValueInPercentage,
  roundWithOneDecimal,
} from "../../../util/calculate";
import "./ha-config-analytics";

@customElement("ha-config-section-storage")
class HaConfigSectionStorage extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public narrow!: boolean;

  @state() private _error?: { code: string; message: string };

  @state() private _storageData?: HassioHostInfo;

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
      >
        <div class="content">
          ${this._error
            ? html`
                <ha-alert alert-type="error"
                  >${this._error.message || this._error.code}</ha-alert
                >
              `
            : ""}
          ${this._storageData
            ? html`
                <ha-card outlined>
                  <ha-metric
                    .description=${this.hass.localize(
                      "ui.panel.config.storage.used_space"
                    )}
                    .value=${this._getUsedSpace(
                      this._storageData?.disk_used,
                      this._storageData?.disk_total
                    )}
                    .tooltip=${`${this._storageData.disk_used} GB/${this._storageData.disk_total} GB`}
                  ></ha-metric>
                  ${this._storageData.disk_life_time !== "" &&
                  this._storageData.disk_life_time >= 10
                    ? html`
                        <ha-metric
                          .description=${this.hass.localize(
                            "ui.panel.config.storage.emmc_lifetime_used"
                          )}
                          .value=${this._storageData.disk_life_time}
                          .tooltip=${`${
                            this._storageData.disk_life_time - 10
                          } % -
                          ${this._storageData.disk_life_time} %`}
                          class="emmc"
                        ></ha-metric>
                      `
                    : ""}
                </ha-card>
              `
            : ""}
        </div>
      </hass-subpage>
    `;
  }

  private async _load() {
    this._error = undefined;
    try {
      if (isComponentLoaded(this.hass, "hassio")) {
        this._storageData = await fetchHassioHostInfo(this.hass);
      }
    } catch (err: any) {
      this._error = err.message || err;
    }
  }

  private _getUsedSpace = memoizeOne((used: number, total: number) =>
    roundWithOneDecimal(getValueInPercentage(used, 0, total))
  );

  static styles = css`
    .content {
      padding: 28px 20px 0;
      max-width: 1040px;
      margin: 0 auto;
    }
    ha-card {
      padding: 16px;
      max-width: 500px;
      margin: 0 auto;
      height: 100%;
      justify-content: space-between;
      flex-direction: column;
      display: flex;
    }
    .emmc {
      --metric-bar-ok-color: #000;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-section-storage": HaConfigSectionStorage;
  }
}

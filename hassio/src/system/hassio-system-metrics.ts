import "@material/mwc-button";
import "@material/mwc-list/mwc-list-item";
import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";
import memoizeOne from "memoize-one";
import "../../../src/components/buttons/ha-progress-button";
import "../../../src/components/ha-bar";
import "../../../src/components/ha-button-menu";
import "../../../src/components/ha-card";
import "../../../src/components/ha-settings-row";
import { fetchHassioStats } from "../../../src/data/hassio/common";
import { HassioHostInfo } from "../../../src/data/hassio/host";
import { haStyle } from "../../../src/resources/styles";
import { HomeAssistant } from "../../../src/types";
import {
  getValueInPercentage,
  roundWithOneDecimal,
} from "../../../src/util/calculate";
import { hassioStyle } from "../resources/hassio-style";

const TARGET = 85;

@customElement("hassio-system-metrics")
class HassioSystemMetrics extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public hostInfo!: HassioHostInfo;

  @internalProperty() private _supervisorMetrics?: any;

  @internalProperty() private _coreMetrics?: any;

  protected render(): TemplateResult | void {
    const usedSpace = this._getUsedSpace(this.hostInfo);

    return html`
      <ha-card header="System metrics">
        <div class="card-content">
          <ha-settings-row>
            <span slot="heading">
              Core CPU usage
            </span>
            <div slot="description">
              <span class="value">
                ${this._roundOrNull(this._coreMetrics?.cpu_percent)}%
              </span>
              <ha-bar
                class="${classMap({
                  target: this._coreMetrics?.cpu_percent > TARGET,
                })}"
                .value=${this._coreMetrics?.cpu_percent}
              ></ha-bar>
            </div>
          </ha-settings-row>
          <ha-settings-row>
            <span slot="heading">
              Core RAM usage
            </span>
            <div slot="description">
              <span class="value">
                ${this._roundOrNull(this._coreMetrics?.memory_percent)}%
              </span>
              <ha-bar
                class="${classMap({
                  target: this._coreMetrics?.memory_percent > TARGET,
                })}"
                .value=${this._coreMetrics?.memory_percent}
              ></ha-bar>
            </div>
          </ha-settings-row>
          <ha-settings-row>
            <span slot="heading">
              Supervisor CPU usage
            </span>
            <div slot="description">
              <span class="value">
                ${this._roundOrNull(this._supervisorMetrics?.cpu_percent)}%
              </span>
              <ha-bar
                class="${classMap({
                  target: this._supervisorMetrics?.cpu_percent > TARGET,
                })}"
                .value=${this._supervisorMetrics?.cpu_percent}
              ></ha-bar>
            </div>
          </ha-settings-row>
          <ha-settings-row>
            <span slot="heading">
              Supervisor RAM usage
            </span>
            <div slot="description">
              <span class="value">
                ${this._roundOrNull(this._supervisorMetrics?.memory_percent)}%
              </span>
              <ha-bar
                class="${classMap({
                  target: this._supervisorMetrics?.memory_percent > TARGET,
                })}"
                .value=${this._supervisorMetrics?.memory_percent}
              ></ha-bar>
            </div>
          </ha-settings-row>
          <ha-settings-row>
            <span slot="heading">
              Used space
            </span>
            <div slot="description">
              <span class="value">${usedSpace}%</span>
              <ha-bar
                class="${classMap({ target: usedSpace > TARGET })}"
                .value=${usedSpace}
              ></ha-bar>
            </div>
          </ha-settings-row>
        </div>
      </ha-card>
    `;
  }

  protected firstUpdated(): void {
    this._loadData();
  }

  private _roundOrNull(value: number): number {
    return roundWithOneDecimal(value) || 0;
  }

  private _getUsedSpace = memoizeOne((hostInfo: HassioHostInfo) =>
    roundWithOneDecimal(
      getValueInPercentage(hostInfo.disk_used, 0, hostInfo.disk_total)
    )
  );

  private async _loadData(): Promise<void> {
    const [supervisor, core] = await Promise.all([
      fetchHassioStats(this.hass, "supervisor"),
      fetchHassioStats(this.hass, "core"),
    ]);
    this._supervisorMetrics = supervisor;
    this._coreMetrics = core;
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      hassioStyle,
      css`
        ha-card {
          height: 100%;
          justify-content: space-between;
          flex-direction: column;
          display: flex;
        }
        ha-settings-row {
          padding: 0;
          height: 54px;
          width: 100%;
        }
        ha-settings-row[three-line] {
          height: 74px;
        }
        ha-settings-row > div[slot="description"] {
          white-space: normal;
          color: var(--secondary-text-color);
          display: flex;
          justify-content: space-between;
        }
        .target {
          --ha-bar-primary-color: var(--error-color);
        }
        .value {
          width: 42px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-system-metrics": HassioSystemMetrics;
  }
}

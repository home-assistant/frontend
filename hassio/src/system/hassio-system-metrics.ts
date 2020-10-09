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
import { fetchHassioStats, HassioStats } from "../../../src/data/hassio/common";
import { HassioHostInfo } from "../../../src/data/hassio/host";
import { haStyle } from "../../../src/resources/styles";
import { HomeAssistant } from "../../../src/types";
import {
  getValueInPercentage,
  roundWithOneDecimal,
} from "../../../src/util/calculate";
import { bytesToString } from "../../../src/util/bytes-to-string";
import { hassioStyle } from "../resources/hassio-style";

@customElement("hassio-system-metrics")
class HassioSystemMetrics extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public hostInfo!: HassioHostInfo;

  @internalProperty() private _supervisorMetrics?: HassioStats;

  @internalProperty() private _coreMetrics?: HassioStats;

  protected render(): TemplateResult | void {
    const metrics = [
      {
        description: "Core CPU Usage",
        value: this._coreMetrics?.cpu_percent,
      },
      {
        description: "Core RAM Usage",
        value: this._coreMetrics?.memory_percent,
        tooltip: `${bytesToString(
          this._coreMetrics?.memory_usage
        )}/${bytesToString(this._coreMetrics?.memory_limit)}`,
      },
      {
        description: "Supervisor CPU Usage",
        value: this._supervisorMetrics?.cpu_percent,
      },
      {
        description: "Supervisor RAM Usage",
        value: this._supervisorMetrics?.memory_percent,
        tooltip: `${bytesToString(
          this._supervisorMetrics?.memory_usage
        )}/${bytesToString(this._supervisorMetrics?.memory_limit)}`,
      },
      {
        description: "Used Space",
        value: this._getUsedSpace(this.hostInfo),
        tooltip: `${
          this.hostInfo.disk_used
        } GB/${this.hostInfo.disk_total} GB`,
      },
    ];

    return html`
      <ha-card header="System Metrics">
        <div class="card-content">
          ${metrics.map((metric) =>
            this._renderMetric(
              metric.description,
              metric.value ?? 0,
              metric.tooltip
            )
          )}
        </div>
      </ha-card>
    `;
  }

  protected firstUpdated(): void {
    this._loadData();
  }

  private _renderMetric(
    description: string,
    value: number,
    tooltip?: string
  ): TemplateResult {
    const roundedValue = roundWithOneDecimal(value);
    return html`<ha-settings-row>
      <span slot="heading">
        ${description}
      </span>
      <div slot="description" title="${tooltip ?? ""}">
        <span class="value">
          ${roundedValue}%
        </span>
        <ha-bar
          class="${classMap({
            "target-warning": roundedValue > 50,
            "target-critical": roundedValue > 85,
          })}"
          .value=${value}
        ></ha-bar>
      </div>
    </ha-settings-row>`;
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
        ha-settings-row > div[slot="description"] {
          white-space: normal;
          color: var(--secondary-text-color);
          display: flex;
          justify-content: space-between;
        }
        ha-bar {
          --ha-bar-primary-color: var(
            --hassio-bar-ok-color,
            var(--success-color)
          );
        }
        .target-warning {
          --ha-bar-primary-color: var(
            --hassio-bar-warning-color,
            var(--warning-color)
          );
        }
        .target-critical {
          --ha-bar-primary-color: var(
            --hassio-bar-critical-color,
            var(--error-color)
          );
        }
        .value {
          width: 42px;
          padding-right: 4px;
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

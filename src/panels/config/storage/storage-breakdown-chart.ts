import { mdiChartDonut, mdiFormatListBulleted } from "@mdi/js";
import type { TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { getGraphColorByIndex } from "../../../common/color/colors";
import "../../../components/chart/ha-sunburst-chart";
import type { SunburstNode } from "../../../components/chart/ha-sunburst-chart";
import "../../../components/ha-alert";
import "../../../components/ha-icon-button";
import "../../../components/ha-segmented-bar";
import "../../../components/ha-spinner";
import type { Segment } from "../../../components/ha-segmented-bar";
import type { HassioHostInfo, HostDisksUsage } from "../../../data/hassio/host";
import type { HomeAssistant } from "../../../types";
import { roundWithOneDecimal } from "../../../util/calculate";

@customElement("storage-breakdown-chart")
export class StorageBreakdownChart extends LitElement {
  @property({ attribute: false })
  public hass!: HomeAssistant;

  @property({ attribute: false })
  public hostInfo?: HassioHostInfo;

  @property({ attribute: false })
  public storageInfo?: HostDisksUsage | null;

  @state()
  private _chartType: "bar" | "sunburst" = "bar";

  protected render(): TemplateResult | typeof nothing {
    if (!this.hostInfo) {
      return nothing;
    }
    const computedStyles = getComputedStyle(this);
    let totalSpaceGB = this.hostInfo.disk_total;
    let usedSpaceGB = this.hostInfo.disk_used;
    // this.hostInfo.disk_free is sometimes 0, so we may need to calculate it
    let freeSpaceGB =
      this.hostInfo.disk_free ||
      this.hostInfo.disk_total - this.hostInfo.disk_used;
    const segments: Segment[] = [];
    if (this.storageInfo) {
      const totalSpace =
        this.storageInfo.total_bytes ??
        this._gbToBytes(this.hostInfo.disk_total);
      totalSpaceGB = this._bytesToGB(totalSpace);
      usedSpaceGB = this._bytesToGB(this.storageInfo.used_bytes);
      freeSpaceGB = this._bytesToGB(totalSpace - this.storageInfo.used_bytes);
      this.storageInfo.children?.forEach((child, index) => {
        if (child.used_bytes > 0) {
          const space = this._bytesToGB(child.used_bytes);
          segments.push({
            value: space,
            color: getGraphColorByIndex(index, computedStyles),
            label: html`${this.hass.localize(
                `ui.panel.config.storage.segments.${child.id}`
              ) ||
              child.label ||
              child.id}
              <span style="color: var(--secondary-text-color)"
                >${roundWithOneDecimal(space)} GB</span
              >`,
          });
        }
      });
    } else {
      segments.push({
        value: usedSpaceGB,
        color: "var(--primary-color)",
        label: html`${this.hass.localize(
            "ui.panel.config.storage.segments.used"
          )}
          <span style="color: var(--secondary-text-color)"
            >${roundWithOneDecimal(usedSpaceGB)} GB</span
          >`,
      });
    }
    segments.push({
      value: freeSpaceGB,
      color:
        "var(--ha-bar-background-color, var(--secondary-background-color))",
      label: html`${this.hass.localize("ui.panel.config.storage.segments.free")}
        <span style="color: var(--secondary-text-color)"
          >${roundWithOneDecimal(freeSpaceGB)} GB</span
        >`,
    });

    const hasChildren = Boolean(this.storageInfo?.children?.length);
    const heading = this.hass.localize("ui.panel.config.storage.used_space");
    const description = this.hass.localize(
      "ui.panel.config.storage.detailed_description",
      {
        used: `${roundWithOneDecimal(usedSpaceGB)} GB`,
        total: `${roundWithOneDecimal(totalSpaceGB)} GB`,
      }
    );

    return html`
      <div class="header">
        <div class="heading-text">
          <span class="heading">${heading}</span>
          <span class="description">${description}</span>
        </div>
        ${hasChildren
          ? html`<ha-icon-button
              .path=${this._chartType === "sunburst"
                ? mdiFormatListBulleted
                : mdiChartDonut}
              .label=${this.hass.localize(
                "ui.panel.config.storage.change_chart_type"
              )}
              @click=${this._handleChartTypeChange}
            ></ha-icon-button>`
          : nothing}
      </div>

      <div class="chart-container ${this._chartType}">
        ${this._chartType === "bar" || !hasChildren
          ? html`<ha-segmented-bar
              .heading=${""}
              .segments=${segments}
            ></ha-segmented-bar>`
          : html`<ha-sunburst-chart
              .hass=${this.hass}
              .data=${this._transformToSunburstData(this.storageInfo!)}
              .valueFormatter=${this._formatBytes}
              .labelFormatter=${this._formatLabel}
            ></ha-sunburst-chart>`}
      </div>

      ${!this.storageInfo || this.storageInfo === null
        ? html`<ha-alert alert-type="info">
            <ha-spinner slot="icon"></ha-spinner>
            ${this.hass.localize(
              "ui.panel.config.storage.loading_detailed"
            )}</ha-alert
          >`
        : nothing}
    `;
  }

  private _handleChartTypeChange(): void {
    this._chartType = this._chartType === "bar" ? "sunburst" : "bar";
  }

  private _transformToSunburstData = memoizeOne(
    (storageInfo: HostDisksUsage): SunburstNode => {
      const transform = (node: HostDisksUsage): SunburstNode => ({
        id: node.id,
        label: node.label,
        value: node.used_bytes,
        children: node.children?.map(transform),
      });
      return transform(storageInfo);
    }
  );

  private _formatBytes = (bytes: number): string => {
    const gb = this._bytesToGB(bytes);
    return `${roundWithOneDecimal(gb)} GB`;
  };

  private _formatLabel = (id: string): string =>
    this.hass.localize(`ui.panel.config.storage.segments.${id}`) || id;

  private _bytesToGB(bytes: number): number {
    return bytes / 1024 / 1024 / 1024;
  }

  private _gbToBytes(GB: number): number {
    return GB * 1024 * 1024 * 1024;
  }

  static styles = css`
    .header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .heading-text {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .heading {
      font-weight: 500;
      font-size: 14px;
      color: var(--primary-text-color);
    }

    .description {
      font-size: 12px;
      color: var(--secondary-text-color);
    }

    ha-icon-button {
      --mdc-icon-button-size: 36px;
      --mdc-icon-size: 20px;
      color: var(--secondary-text-color);
    }

    .chart-container {
      transition: height 0.3s ease;
      overflow: hidden;
    }

    .chart-container.bar {
      height: 100px;
    }

    .chart-container.sunburst {
      height: 300px;
    }

    ha-segmented-bar {
      display: block;
    }

    ha-sunburst-chart {
      height: 300px;
    }

    ha-segmented-bar,
    ha-sunburst-chart {
      animation: fade-in 0.3s ease;
    }

    @keyframes fade-in {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    ha-alert {
      --ha-alert-icon-size: 24px;
    }

    ha-alert ha-spinner {
      --ha-spinner-size: 24px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "storage-breakdown-chart": StorageBreakdownChart;
  }
}

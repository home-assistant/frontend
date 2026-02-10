import { mdiChartDonutVariant, mdiViewArray } from "@mdi/js";
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
    const { totalSpaceGB, usedSpaceGB, freeSpaceGB } = this._computeSpaceValues(
      this.hostInfo,
      this.storageInfo
    );

    const hasChildren = Boolean(this.storageInfo?.children?.length);
    const heading = this.hass.localize("ui.panel.config.storage.used_space");
    const description = this.hass.localize(
      "ui.panel.config.storage.detailed_description",
      {
        used: `${roundWithOneDecimal(usedSpaceGB)} GB`,
        total: `${roundWithOneDecimal(totalSpaceGB)} GB`,
      }
    );
    const showBarChart = this._chartType === "bar" || !hasChildren;

    return html`
      <div class="header">
        <div class="heading-text">
          <span class="heading">${heading}</span>
          <span class="description">${description}</span>
        </div>
        <ha-icon-button
          .path=${this._chartType === "sunburst"
            ? mdiViewArray
            : mdiChartDonutVariant}
          .label=${this.hass.localize(
            "ui.panel.config.storage.change_chart_type"
          )}
          .disabled=${!hasChildren}
          @click=${this._handleChartTypeChange}
        ></ha-icon-button>
      </div>

      <div class="chart-container ${this._chartType}">
        ${showBarChart
          ? html`<ha-segmented-bar
              .heading=${""}
              .segments=${this._computeSegments(
                this.storageInfo,
                usedSpaceGB,
                freeSpaceGB
              )}
            ></ha-segmented-bar>`
          : html`<ha-sunburst-chart
              .hass=${this.hass}
              .data=${this._transformToSunburstData(this.storageInfo!)}
              .valueFormatter=${this._formatBytes}
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

  private _computeSpaceValues = memoizeOne(
    (
      hostInfo: HassioHostInfo,
      storageInfo: HostDisksUsage | null | undefined
    ) => {
      let totalSpaceGB = hostInfo.disk_total;
      let usedSpaceGB = hostInfo.disk_used;
      let freeSpaceGB =
        hostInfo.disk_free || hostInfo.disk_total - hostInfo.disk_used;

      if (storageInfo) {
        const totalSpace =
          storageInfo.total_bytes ?? this._gbToBytes(hostInfo.disk_total);
        totalSpaceGB = this._bytesToGB(totalSpace);
        usedSpaceGB = this._bytesToGB(storageInfo.used_bytes);
        freeSpaceGB = this._bytesToGB(totalSpace - storageInfo.used_bytes);
      }

      return { totalSpaceGB, usedSpaceGB, freeSpaceGB };
    }
  );

  private _computeSegments = memoizeOne(
    (
      storageInfo: HostDisksUsage | null | undefined,
      usedSpaceGB: number,
      freeSpaceGB: number
    ): Segment[] => {
      const computedStyles = getComputedStyle(this);
      const segments: Segment[] = [];

      if (storageInfo) {
        storageInfo.children?.forEach((child, index) => {
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
        label: html`${this.hass.localize(
            "ui.panel.config.storage.segments.free"
          )}
          <span style="color: var(--secondary-text-color)"
            >${roundWithOneDecimal(freeSpaceGB)} GB</span
          >`,
      });

      return segments;
    }
  );

  private _transformToSunburstData = memoizeOne(
    (storageInfo: HostDisksUsage): SunburstNode => {
      const transform = (
        node: HostDisksUsage,
        parentNode?: HostDisksUsage
      ): SunburstNode => ({
        // prefix with parent id to avoid duplicate ids
        id: parentNode ? `${parentNode.id}.${node.id}` : node.id,
        name: this._formatLabel(node.id) || node.label,
        value: node.used_bytes,
        children: node.children?.map((child) => transform(child, node)),
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
      align-items: flex-end;
      gap: var(--ha-space-2);
    }

    .heading-text {
      display: flex;
      flex: 1;
    }

    .heading {
      color: var(--primary-text-color);
      line-height: var(--ha-line-height-expanded);
      margin-right: var(--ha-space-2);
    }

    .description {
      color: var(--secondary-text-color);
      line-height: var(--ha-line-height-expanded);
    }

    ha-icon-button {
      --mdc-icon-button-size: 36px;
      --mdc-icon-size: 20px;
      color: var(--secondary-text-color);
    }

    .chart-container {
      transition: height var(--ha-animation-duration-slow) ease;
      overflow: hidden;
    }

    .chart-container.bar {
      height: calc-size(auto, size);
    }

    .chart-container.sunburst {
      height: 400px;
    }

    ha-segmented-bar {
      display: block;
    }

    ha-sunburst-chart {
      height: 400px;
    }

    ha-segmented-bar,
    ha-sunburst-chart {
      animation: fade-in var(--ha-animation-duration-slow) ease;
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

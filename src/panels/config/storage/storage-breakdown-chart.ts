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

const CATEGORY_GROUPS = {
  apps: {
    translationKey: "apps",
    childIds: ["addons_data", "addons_config"],
  },
  homeassistant_settings: {
    translationKey: "homeassistant_settings",
    childIds: ["homeassistant", "ssl"],
  },
} as const;

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
      <div class="heading">
        <div class="title">
          <span>${heading}</span>
          ${this.storageInfo ? html`<span>${description}</span>` : nothing}
        </div>
        ${hasChildren
          ? html`<ha-icon-button
              .path=${showBarChart ? mdiChartDonutVariant : mdiViewArray}
              .label=${this.hass.localize(
                "ui.panel.config.storage.change_chart_type"
              )}
              @click=${this._handleChartTypeChange}
            ></ha-icon-button>`
          : nothing}
      </div>
      ${showBarChart
        ? this.storageInfo
          ? html`
              <div class="chart-container bar">
                <ha-segmented-bar
                  .segments=${this._computeSegments(
                    this.storageInfo,
                    usedSpaceGB,
                    freeSpaceGB
                  )}
                ></ha-segmented-bar>
              </div>
            `
          : html`
              <div class="chart-container bar">
                <div class="skeleton-bar"></div>
                <ul class="skeleton-legend">
                  ${Array(6)
                    .fill(0)
                    .map(
                      (_, i) => html`
                        <li class="skeleton-legend-item">
                          <div class="skeleton-dot"></div>
                          <div
                            class="skeleton-label"
                            style="width: ${[120, 65, 100, 70, 95, 80][i]}px"
                          ></div>
                        </li>
                      `
                    )}
                </ul>
              </div>
            `
        : html`
            <div class="chart-container sunburst">
              <ha-sunburst-chart
                .hass=${this.hass}
                .data=${this._transformToSunburstData(this.storageInfo!)}
                .valueFormatter=${this._formatBytes}
              ></ha-sunburst-chart>
            </div>
          `}
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

  private _transformStorageCategories = memoizeOne(
    (children: HostDisksUsage[] | undefined): HostDisksUsage[] => {
      if (!children?.length) {
        return [];
      }

      // Create a map to track which categories belong to which group
      const categoryToGroup = new Map<string, string>();
      Object.entries(CATEGORY_GROUPS).forEach(([groupId, group]) => {
        group.childIds.forEach((childId) => {
          categoryToGroup.set(childId, groupId);
        });
      });

      // Group categories and create the transformed array
      const groupedCategories = new Map<string, HostDisksUsage>();
      const standaloneCategories: HostDisksUsage[] = [];

      children.forEach((child) => {
        const groupId = categoryToGroup.get(child.id);

        if (groupId) {
          // This category belongs to a group
          if (!groupedCategories.has(groupId)) {
            // Initialize the group
            groupedCategories.set(groupId, {
              id: groupId,
              label:
                CATEGORY_GROUPS[groupId as keyof typeof CATEGORY_GROUPS]
                  .translationKey,
              used_bytes: 0,
              children: [],
            });
          }

          const group = groupedCategories.get(groupId)!;
          group.used_bytes += child.used_bytes;
          group.children!.push(child);
        } else {
          // This is a standalone category
          standaloneCategories.push(child);
        }
      });

      // Combine grouped and standalone categories
      const allCategories: HostDisksUsage[] = [
        ...Array.from(groupedCategories.values()),
        ...standaloneCategories,
      ];

      // Sort by used_bytes descending
      allCategories.sort((a, b) => b.used_bytes - a.used_bytes);

      return allCategories;
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
        // Transform and sort categories
        const transformedCategories = this._transformStorageCategories(
          storageInfo.children
        );

        transformedCategories.forEach((child, index) => {
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
    .heading {
      display: flex;
      flex-direction: row;
      gap: var(--ha-space-2);
      margin-bottom: var(--ha-space-1);
      align-items: flex-end;
    }

    .heading .title {
      flex: 1;
      min-height: 36px;
      display: flex;
      align-items: flex-end;
    }

    .heading .title span {
      color: var(--secondary-text-color);
      line-height: var(--ha-line-height-expanded);
      margin-right: 8px;
    }

    .heading .title span:first-child {
      color: var(--primary-text-color);
    }

    ha-icon-button {
      --mdc-icon-button-size: 36px;
      --mdc-icon-size: 20px;
      color: var(--secondary-text-color);
    }

    ha-segmented-bar {
      min-height: 36px;
    }

    ha-segmented-bar ha-icon-button {
      align-self: flex-start;
      margin-top: auto;
    }

    .chart-container {
      transition: height var(--ha-animation-duration-slow) ease;
      overflow: hidden;
    }

    .chart-container.bar {
      min-height: 78px;
      animation: fade-in var(--ha-animation-duration-slow) ease;
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

    /* Skeleton loading animation */
    @keyframes skeleton-shimmer {
      0% {
        background-position: -468px 0;
      }
      100% {
        background-position: 468px 0;
      }
    }

    .skeleton-bar,
    .skeleton-dot,
    .skeleton-label {
      position: relative;
      animation-fill-mode: forwards;
      animation-iteration-count: infinite;
      animation-name: skeleton-shimmer;
      animation-timing-function: linear;
      animation-duration: 1.2s;
      border-radius: var(--ha-border-radius-sm);
      background-color: var(
        --ha-bar-background-color,
        var(--secondary-background-color)
      );
      background-image: linear-gradient(
        to right,
        rgba(255, 255, 255, 0) 0%,
        rgba(255, 255, 255, 0) 40%,
        rgba(255, 255, 255, 0.3) 50%,
        rgba(255, 255, 255, 0) 60%,
        rgba(255, 255, 255, 0) 100%
      );
      background-size: 936px 104px;
      background-position: 0% 0%;
    }

    /* Respect reduced motion preference */
    @media (prefers-reduced-motion: reduce) {
      .skeleton-bar,
      .skeleton-dot,
      .skeleton-label {
        animation: none;
        background: var(
          --ha-bar-background-color,
          var(--secondary-background-color)
        );
      }
    }

    .skeleton-bar {
      height: 12px;
      width: 100%;
      margin: 2px 0;
    }

    .skeleton-legend {
      display: flex;
      flex-wrap: wrap;
      gap: var(--ha-space-3);
      list-style: none;
      margin: 12px 0;
      padding: 0;
    }

    .skeleton-legend-item {
      display: flex;
      align-items: center;
      gap: var(--ha-space-1);
    }

    .skeleton-dot {
      width: 12px;
      height: 12px;
      border-radius: var(--ha-border-radius-circle);
      flex-shrink: 0;
    }

    .skeleton-label {
      height: 14px;
      border-radius: var(--ha-border-radius-sm);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "storage-breakdown-chart": StorageBreakdownChart;
  }
}

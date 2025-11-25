import type { TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { getGraphColorByIndex } from "../../../common/color/colors";
import "../../../components/ha-alert";
import "../../../components/ha-spinner";
import "../../../components/ha-segmented-bar";
import type { Segment } from "../../../components/ha-segmented-bar";
import type { HassioHostInfo, HostDisksUsage } from "../../../data/hassio/host";
import type { HomeAssistant } from "../../../types";
import { roundWithOneDecimal } from "../../../util/calculate";

@customElement("storage-breakdown-chart")
export class StorageBreakdownChart extends LitElement {
  public hass!: HomeAssistant;

  @property({ attribute: false })
  public hostInfo?: HassioHostInfo;

  @property({ attribute: false })
  public storageInfo?: HostDisksUsage | null;

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
    return html`<ha-segmented-bar
        .heading=${this.hass.localize("ui.panel.config.storage.used_space")}
        .description=${this.hass.localize(
          "ui.panel.config.storage.detailed_description",
          {
            used: `${roundWithOneDecimal(usedSpaceGB)} GB`,
            total: `${roundWithOneDecimal(totalSpaceGB)} GB`,
          }
        )}
        .segments=${segments}
      ></ha-segmented-bar>

      ${!this.storageInfo || this.storageInfo === null
        ? html`<ha-alert alert-type="info">
            <ha-spinner slot="icon"></ha-spinner>
            ${this.hass.localize(
              "ui.panel.config.storage.loading_detailed"
            )}</ha-alert
          >`
        : nothing}`;
  }

  private _bytesToGB(bytes: number): number {
    return bytes / 1024 / 1024 / 1024;
  }

  private _gbToBytes(GB: number): number {
    return GB * 1024 * 1024 * 1024;
  }

  static styles = css`
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

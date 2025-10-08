import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import type { HaEntityPickerEntityFilterFunc } from "../../data/entity";
import type { HomeAssistant } from "../../types";
import type { HaDevicePickerDeviceFilterFunc } from "../device/ha-device-picker";
import "../ha-expansion-panel";
import "../ha-md-list";
import "./ha-target-picker-item-row";
import type { TargetType } from "./ha-target-picker-item-row";

@customElement("ha-target-picker-item-group")
export class HaTargetPickerItemGroup extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public type!: "entity" | "device" | "area" | "label";

  @property({ attribute: false }) public items!: Partial<
    Record<TargetType, string[]>
  >;

  @property({ type: Boolean }) public collapsed = false;

  @property({ attribute: false })
  public deviceFilter?: HaDevicePickerDeviceFilterFunc;

  @property({ attribute: false })
  public entityFilter?: HaEntityPickerEntityFilterFunc;

  /**
   * Show only targets with entities from specific domains.
   * @type {Array}
   * @attr include-domains
   */
  @property({ type: Array, attribute: "include-domains" })
  public includeDomains?: string[];

  /**
   * Show only targets with entities of these device classes.
   * @type {Array}
   * @attr include-device-classes
   */
  @property({ type: Array, attribute: "include-device-classes" })
  public includeDeviceClasses?: string[];

  protected render() {
    let count = 0;
    Object.values(this.items).forEach((items) => {
      if (items) {
        count += items.length;
      }
    });

    return html`<ha-expansion-panel .expanded=${!this.collapsed} left-chevron>
      <div slot="header" class="heading">
        ${this.hass.localize(
          `ui.components.target-picker.selected.${this.type}`,
          {
            count,
          }
        )}
      </div>
      <ha-md-list>
        ${Object.entries(this.items).map(([type, items]) =>
          items
            ? items.map(
                (item) =>
                  html`<ha-target-picker-item-row
                    .hass=${this.hass}
                    .type=${type as "entity" | "device" | "area" | "label"}
                    .itemId=${item}
                    .deviceFilter=${this.deviceFilter}
                    .entityFilter=${this.entityFilter}
                    .includeDomains=${this.includeDomains}
                    .includeDeviceClasses=${this.includeDeviceClasses}
                  ></ha-target-picker-item-row>`
              )
            : nothing
        )}
      </ha-md-list>
    </ha-expansion-panel>`;
  }

  static styles = css`
    :host {
      display: block;
      --expansion-panel-content-padding: var(--ha-space-0);
    }
    ha-expansion-panel::part(summary) {
      background-color: var(--ha-color-fill-neutral-quiet-resting);
      padding: var(--ha-space-1) var(--ha-space-2);
      font-weight: var(--ha-font-weight-bold);
      color: var(--secondary-text-color);
      display: flex;
      justify-content: space-between;
      min-height: unset;
    }
    ha-md-list {
      padding: var(--ha-space-0);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-target-picker-item-group": HaTargetPickerItemGroup;
  }
}

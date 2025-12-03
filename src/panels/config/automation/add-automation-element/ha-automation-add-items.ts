import {
  mdiInformationOutline,
  mdiLabel,
  mdiPlus,
  mdiTextureBox,
} from "@mdi/js";
import { LitElement, css, html, nothing, type TemplateResult } from "lit";
import {
  customElement,
  eventOptions,
  property,
  query,
  state,
} from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { repeat } from "lit/directives/repeat";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import { stopPropagation } from "../../../../common/dom/stop_propagation";
import "../../../../components/entity/state-badge";
import "../../../../components/ha-domain-icon";
import "../../../../components/ha-floor-icon";
import "../../../../components/ha-icon-next";
import "../../../../components/ha-md-list";
import "../../../../components/ha-md-list-item";
import "../../../../components/ha-svg-icon";
import "../../../../components/ha-tooltip";
import type { ConfigEntry } from "../../../../data/config_entries";
import type { HomeAssistant } from "../../../../types";
import type { AddAutomationElementListItem } from "../add-automation-element-dialog";

type Target = [string, string | undefined, string | undefined];

@customElement("ha-automation-add-items")
export class HaAutomationAddItems extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public items?: {
    title: string;
    items: AddAutomationElementListItem[];
  }[];

  @property() public error?: string;

  @property({ attribute: "select-label" }) public selectLabel!: string;

  @property({ attribute: "empty-label" }) public emptyLabel!: string;

  @property({ attribute: false }) public target?: Target;

  @property({ attribute: false }) public getLabel!: (
    id: string
  ) => { name: string; icon?: string } | undefined;

  @property({ attribute: false }) public configEntryLookup: Record<
    string,
    ConfigEntry
  > = {};

  @property({ type: Boolean, attribute: "tooltip-description" })
  public tooltipDescription = false;

  @property({ type: Boolean, reflect: true }) scrollable = false;

  @state() private _itemsScrolled = false;

  @query(".items")
  private _itemsDiv!: HTMLDivElement;

  protected render() {
    return html`<div
      class=${classMap({
        items: true,
        blank: this.error || !this.items || !this.items.length,
        error: this.error,
        scrolled: this._itemsScrolled,
      })}
      @scroll=${this._onItemsScroll}
    >
      ${!this.items && !this.error
        ? this.selectLabel
        : this.error
          ? html`${this.error}
              <div>${this._renderTarget(this.target)}</div>`
          : this.items && !this.items.length
            ? html`${this.emptyLabel}
              ${this.target
                ? html`<div>${this._renderTarget(this.target)}</div>`
                : nothing}`
            : repeat(
                this.items,
                (_, index) => `item-group-${index}`,
                (itemGroup) =>
                  this._renderItemList(itemGroup.title, itemGroup.items)
              )}
    </div>`;
  }

  private _renderItemList(title, items?: AddAutomationElementListItem[]) {
    if (!items || !items.length) {
      return nothing;
    }

    return html`
      <div class="items-title">${title}</div>
      <ha-md-list>
        ${repeat(
          items,
          (item) => item.key,
          (item) => html`
            <ha-md-list-item
              interactive
              type="button"
              .value=${item.key}
              @click=${this._selected}
            >
              <div slot="headline" class=${this.target ? "item-headline" : ""}>
                ${item.name}${this._renderTarget(this.target)}
              </div>

              ${!this.tooltipDescription && item.description
                ? html`<div slot="supporting-text">${item.description}</div>`
                : nothing}
              ${item.icon
                ? html`<span slot="start">${item.icon}</span>`
                : item.iconPath
                  ? html`<ha-svg-icon
                      slot="start"
                      .path=${item.iconPath}
                    ></ha-svg-icon>`
                  : nothing}
              ${this.tooltipDescription && item.description
                ? html`<ha-svg-icon
                      tabindex="0"
                      id=${`description-tooltip-${item.key}`}
                      slot="end"
                      .path=${mdiInformationOutline}
                      @click=${stopPropagation}
                    ></ha-svg-icon>
                    <ha-tooltip
                      .for=${`description-tooltip-${item.key}`}
                      @wa-show=${stopPropagation}
                      @wa-hide=${stopPropagation}
                      @wa-after-hide=${stopPropagation}
                      @wa-after-show=${stopPropagation}
                      >${item.description}</ha-tooltip
                    > `
                : nothing}
              <ha-svg-icon
                slot="end"
                class="plus"
                .path=${mdiPlus}
              ></ha-svg-icon>
            </ha-md-list-item>
          `
        )}
      </ha-md-list>
    `;
  }

  private _renderTarget = memoizeOne((target?: Target) => {
    if (!target) {
      return nothing;
    }

    return html`<div class="selected-target">
      ${this._getSelectedTargetIcon(target[0], target[1])}
      <div class="label">${target[2]}</div>
    </div>`;
  });

  private _getSelectedTargetIcon(
    targetType: string,
    targetId: string | undefined
  ): TemplateResult | typeof nothing {
    if (!targetId) {
      return nothing;
    }

    if (targetType === "floor") {
      return html`<ha-floor-icon
        .floor=${this.hass.floors[targetId]}
      ></ha-floor-icon>`;
    }

    if (targetType === "area" && this.hass.areas[targetId]) {
      const area = this.hass.areas[targetId];
      if (area.icon) {
        return html`<ha-icon .icon=${area.icon}></ha-icon>`;
      }
      return html`<ha-svg-icon .path=${mdiTextureBox}></ha-svg-icon>`;
    }

    if (targetType === "device" && this.hass.devices[targetId]) {
      const device = this.hass.devices[targetId];
      const configEntry = device.primary_config_entry
        ? this.configEntryLookup[device.primary_config_entry]
        : undefined;
      const domain = configEntry?.domain;

      if (domain) {
        return html`<ha-domain-icon
          slot="start"
          .hass=${this.hass}
          .domain=${domain}
          brand-fallback
        ></ha-domain-icon>`;
      }
    }

    if (targetType === "entity" && this.hass.states[targetId]) {
      const stateObj = this.hass.states[targetId];
      if (stateObj) {
        return html`<state-badge
          .stateObj=${stateObj}
          .hass=${this.hass}
          .stateColor=${false}
        ></state-badge>`;
      }
    }

    if (targetType === "label") {
      const label = this.getLabel(targetId);
      if (label?.icon) {
        return html`<ha-icon .icon=${label.icon}></ha-icon>`;
      }
      return html`<ha-svg-icon .path=${mdiLabel}></ha-svg-icon>`;
    }

    return nothing;
  }

  private _selected(ev) {
    const item = ev.currentTarget;
    fireEvent(this, "value-changed", {
      value: item.value,
    });
  }

  @eventOptions({ passive: true })
  private _onItemsScroll(ev) {
    const top = ev.target.scrollTop ?? 0;
    this._itemsScrolled = top > 0;
  }

  public override scrollTo(options?: ScrollToOptions): void;

  public override scrollTo(x: number, y: number): void;

  public override scrollTo(
    xOrOptions?: number | ScrollToOptions,
    y?: number
  ): void {
    if (typeof xOrOptions === "number") {
      this._itemsDiv?.scrollTo(xOrOptions, y!);
    } else {
      this._itemsDiv?.scrollTo(xOrOptions);
    }
  }

  static styles = css`
    :host {
      display: flex;
    }
    :host([scrollable]) .items {
      overflow: auto;
    }
    .items {
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    .items.blank {
      border-radius: var(--ha-border-radius-xl);
      background-color: var(--ha-color-surface-default);
      align-items: center;
      color: var(--ha-color-text-secondary);
      padding: var(--ha-space-0);
      margin: var(--ha-space-0) var(--ha-space-4)
        max(var(--safe-area-inset-bottom), var(--ha-space-3));
      line-height: var(--ha-line-height-expanded);
      justify-content: center;
    }

    .items.error {
      background-color: var(--ha-color-fill-danger-quiet-resting);
      color: var(--ha-color-on-danger-normal);
    }
    .items ha-md-list {
      --md-list-item-two-line-container-height: var(--ha-space-12);
      --md-list-item-leading-space: var(--ha-space-3);
      --md-list-item-trailing-space: var(--md-list-item-leading-space);
      --md-list-item-bottom-space: var(--ha-space-2);
      --md-list-item-top-space: var(--md-list-item-bottom-space);
      --md-list-item-supporting-text-font: var(--ha-font-family-body);
      --ha-md-list-item-gap: var(--ha-space-3);
      gap: var(--ha-space-2);
      padding: var(--ha-space-0) var(--ha-space-4);
    }
    .items ha-md-list ha-md-list-item {
      border-radius: var(--ha-border-radius-lg);
      border: 1px solid var(--ha-color-border-neutral-quiet);
    }

    .items ha-md-list {
      padding-bottom: max(var(--safe-area-inset-bottom), var(--ha-space-3));
    }

    .items .item-headline {
      display: flex;
      align-items: center;
      gap: var(--ha-space-2);
      min-height: var(--ha-space-9);
      flex-wrap: wrap;
    }

    .items-title {
      position: sticky;
      display: flex;
      align-items: center;
      font-weight: var(--ha-font-weight-medium);
      padding-top: var(--ha-space-2);
      padding-bottom: var(--ha-space-2);
      padding-inline-start: var(--ha-space-8);
      padding-inline-end: var(--ha-space-3);
      top: 0;
      z-index: 1;
      background-color: var(--card-background-color);
    }
    ha-bottom-sheet .items-title {
      padding-top: var(--ha-space-3);
    }
    .scrolled .items-title:first-of-type {
      box-shadow: var(--bar-box-shadow);
      border-bottom: 1px solid var(--ha-color-border-neutral-quiet);
    }

    ha-icon-next {
      width: var(--ha-space-6);
    }

    ha-svg-icon.plus {
      color: var(--primary-color);
    }

    .selected-target {
      display: inline-flex;
      gap: var(--ha-space-1);
      justify-content: center;
      align-items: center;
      border-radius: var(--ha-border-radius-md);
      background: var(--ha-color-fill-neutral-normal-resting);
      padding: 0 var(--ha-space-2) 0 var(--ha-space-1);
      color: var(--ha-color-on-neutral-normal);
      overflow: hidden;
    }
    .selected-target .label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .selected-target ha-icon,
    .selected-target ha-svg-icon,
    .selected-target state-badge,
    .selected-target ha-domain-icon {
      display: flex;
      padding: var(--ha-space-1) 0;
    }

    .selected-target state-badge {
      --mdc-icon-size: 24px;
    }
    .selected-target state-badge,
    .selected-target ha-floor-icon {
      display: flex;
      height: 32px;
      width: 32px;
      align-items: center;
    }
    .selected-target ha-domain-icon {
      filter: grayscale(100%);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-add-items": HaAutomationAddItems;
  }
}

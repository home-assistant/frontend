import { mdiInformationOutline, mdiPlus } from "@mdi/js";
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
import "../../../../components/ha-svg-icon";
import "../../../../components/ha-tooltip";
import "../../../../components/item/ha-list-item-button";
import "../../../../components/list/ha-list-base";
import type { ConfigEntry } from "../../../../data/config_entries";
import type { LabelRegistryEntry } from "../../../../data/label/label_registry";
import { haStyleScrollbar } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import type { AddAutomationElementListItem } from "../add-automation-element-dialog";
import { getTargetIcon } from "../target/get_target_icon";

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

  @property({ attribute: false }) public emptyNote?: string | TemplateResult;

  @property({ attribute: false }) public target?: Target;

  @property({ attribute: false }) public getLabel!: (
    id: string
  ) => LabelRegistryEntry | undefined;

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
        "ha-scrollbar": this.scrollable,
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
                : nothing}
              ${this.emptyNote
                ? html`<div class="empty-note">${this.emptyNote}</div>`
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
      <ha-list-base>
        ${repeat(
          items,
          (item) => item.key,
          (item) => html`
            <ha-list-item-button .value=${item.key} @click=${this._selected}>
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
                      slot="end"
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
            </ha-list-item-button>
          `
        )}
      </ha-list-base>
    `;
  }

  private _renderTarget = memoizeOne((target?: Target) => {
    if (!target) {
      return nothing;
    }

    return html`<div class="selected-target">
      ${getTargetIcon(
        this.hass,
        target[0],
        target[1],
        this.configEntryLookup,
        this.getLabel
      )}
      <div class="label">${target[2]}</div>
    </div>`;
  });

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

  static styles = [
    haStyleScrollbar,
    css`
      :host {
        display: flex;
        flex-grow: 1;
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
        padding: var(--ha-space-4);
        margin: 0 var(--ha-space-4)
          max(var(--safe-area-inset-bottom), var(--ha-space-3));
        line-height: var(--ha-line-height-expanded);
        justify-content: center;
      }

      .empty-note {
        color: var(--ha-color-text-secondary);
        margin-top: var(--ha-space-2);
        text-align: center;
      }

      .empty-note a {
        color: currentColor;
        text-decoration: underline;
      }

      .items.error {
        background-color: var(--ha-color-fill-danger-quiet-resting);
        color: var(--ha-color-on-danger-normal);
      }
      .items ha-list-base {
        --ha-row-item-padding-inline: var(--ha-space-3);
        --ha-row-item-padding-block: var(--ha-space-2);
        --ha-list-gap: var(--ha-space-3);
        gap: var(--ha-space-2);
        padding: 0 var(--ha-space-4);
        padding-bottom: max(var(--safe-area-inset-bottom), var(--ha-space-3));
      }
      .items ha-list-base ha-list-item-button {
        border-radius: var(--ha-border-radius-lg);
        border: 1px solid var(--ha-color-border-neutral-quiet);
        overflow: hidden;
      }

      .items ha-list-base ha-list-item-button::part(start),
      .items ha-list-base ha-list-item-button::part(end) {
        color: var(--ha-color-on-neutral-quiet);
      }
      .items ha-list-base ha-list-item-button::part(end) {
        gap: var(--ha-space-3);
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
        border: var(--ha-border-width-sm) solid
          var(--ha-color-border-neutral-quiet);
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
      .selected-target ha-domain-icon {
        display: flex;
        padding: var(--ha-space-1) 0;
      }

      .selected-target ha-floor-icon {
        display: flex;
        height: 32px;
        width: 32px;
        align-items: center;
      }
      .selected-target ha-domain-icon {
        filter: grayscale(100%);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-add-items": HaAutomationAddItems;
  }
}

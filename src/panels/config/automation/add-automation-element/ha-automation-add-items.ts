import type { ContextType } from "@lit/context";
import {
  mdiCheck,
  mdiInformationOutline,
  mdiPlus,
  mdiSwapHorizontal,
} from "@mdi/js";
import { LitElement, css, html, nothing, type PropertyValues } from "lit";
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
import { consume } from "../../../../common/decorators/consume";
import { transform } from "../../../../common/decorators/transform";
import { fireEvent } from "../../../../common/dom/fire_event";
import { stopPropagation } from "../../../../common/dom/stop_propagation";
import "../../../../components/ha-svg-icon";
import "../../../../components/ha-tooltip";
import "../../../../components/item/ha-list-item-button";
import "../../../../components/list/ha-list-base";
import type { ConfigEntry } from "../../../../data/config_entries";
import {
  configEntriesContext,
  labelsContext,
  registriesContext,
  statesContext,
} from "../../../../data/context";
import type { LabelRegistryEntry } from "../../../../data/label/label_registry";
import { haStyleScrollbar } from "../../../../resources/styles";
import { getTargetIcon } from "../target/get_target_icon";
import type { AddAutomationElementListItem, ItemsSection } from "./types";

type Target = [string, string | undefined, string | undefined];

/**
 * @element ha-automation-add-items
 *
 * @summary List of automation elements to add, grouped by title.
 *
 * @slot - Footer below the scrolling items, e.g. an action bar.
 *
 * @cssprop --ha-automation-add-items-padding-bottom - Bottom padding of the items list.
 */
@customElement("ha-automation-add-items")
export class HaAutomationAddItems extends LitElement {
  @property({ attribute: false }) public items?: ItemsSection[];

  @property() public error?: string;

  @property({ attribute: "select-label" }) public selectLabel!: string;

  @property({ attribute: "empty-label" }) public emptyLabel!: string;

  @property({ attribute: false }) public target?: Target;

  @property({ type: Boolean, attribute: "tooltip-description" })
  public tooltipDescription = false;

  @property({ type: Boolean, reflect: true }) scrollable = false;

  @property({ attribute: false }) public replacingItemKey?: string;

  @state() private _itemsScrolled = false;

  @state()
  @consume({ context: registriesContext, subscribe: true })
  private _registries!: ContextType<typeof registriesContext>;

  @consume({ context: statesContext, subscribe: true })
  private _states!: ContextType<typeof statesContext>;

  @state()
  @consume({ context: labelsContext, subscribe: true })
  private _labelRegistry?: LabelRegistryEntry[];

  @state()
  @consume({ context: configEntriesContext, subscribe: true })
  @transform<ConfigEntry[], Record<string, ConfigEntry>>({
    transformer: function (value) {
      return value
        ? Object.fromEntries(value.map((entry) => [entry.entry_id, entry]))
        : undefined;
    },
  })
  private _configEntryLookup?: Record<string, ConfigEntry>;

  @query(".items")
  private _itemsDiv!: HTMLDivElement;

  @query("ha-list-item-button.current")
  private _currentItem?: HTMLElement;

  private _scrollToCurrent = false;

  /** Scrolls to the item being replaced once it is rendered. */
  public scrollToCurrent() {
    this._scrollToCurrent = true;
    this._scrollIfPending();
  }

  protected updated(changedProps: PropertyValues<this>) {
    super.updated(changedProps);
    this._scrollIfPending();
  }

  private _scrollIfPending() {
    if (!this._scrollToCurrent || !this._currentItem) {
      return;
    }
    this._scrollToCurrent = false;
    this._currentItem.scrollIntoView({ block: "center" });
  }

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
        ${
          !this.items && !this.error
            ? this.selectLabel
            : this.error
              ? html`${this.error}
                  <div>${this._renderCurrentTarget()}</div>`
              : this.items && !this.items.length
                ? html`${this.emptyLabel}
                  ${
                    this.target
                      ? html`<div>${this._renderCurrentTarget()}</div>`
                      : nothing
                  }`
                : repeat(
                    this.items,
                    (_, index) => `item-group-${index}`,
                    (itemGroup) =>
                      this._renderItemList(itemGroup.title, itemGroup.items)
                  )
        }
      </div>
      <slot></slot>`;
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
            <ha-list-item-button
              .value=${item.key}
              class=${this._isCurrent(item) ? "current" : ""}
              .disabled=${this._isCurrent(item)}
              aria-current=${this._isCurrent(item) ? "true" : nothing}
              @click=${this._selected}
            >
              <div slot="headline" class=${this.target ? "item-headline" : ""}>
                ${item.name}${this._renderCurrentTarget()}
              </div>

              ${
                !this.tooltipDescription && item.description
                  ? html`<div slot="supporting-text">${item.description}</div>`
                  : nothing
              }
              ${
                item.icon
                  ? html`<span slot="start">${item.icon}</span>`
                  : item.iconPath
                    ? html`<ha-svg-icon
                        slot="start"
                        .path=${item.iconPath}
                      ></ha-svg-icon>`
                    : nothing
              }
              ${
                this.tooltipDescription && item.description
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
                  : nothing
              }
              <ha-svg-icon
                slot="end"
                class="plus"
                .path=${
                  this._isCurrent(item)
                    ? mdiCheck
                    : this.replacingItemKey
                      ? mdiSwapHorizontal
                      : mdiPlus
                }
              ></ha-svg-icon>
            </ha-list-item-button>
          `
        )}
      </ha-list-base>
    `;
  }

  // With a target, the same item can still replace its target.
  private _isCurrent(item: AddAutomationElementListItem) {
    return !this.target && item.key === this.replacingItemKey;
  }

  private _renderCurrentTarget() {
    return this._renderTarget(
      this.target,
      this._registries,
      this._states,
      this._labelRegistry,
      this._configEntryLookup
    );
  }

  private _renderTarget = memoizeOne(
    (
      target: Target | undefined,
      registries: ContextType<typeof registriesContext>,
      states: ContextType<typeof statesContext>,
      labels: LabelRegistryEntry[] | undefined,
      configEntryLookup: Record<string, ConfigEntry> | undefined
    ) => {
      if (!target) {
        return nothing;
      }

      return html`<div class="selected-target">
        ${getTargetIcon(
          registries,
          states,
          target[0],
          target[1],
          configEntryLookup ?? {},
          (id) => labels?.find(({ label_id }) => label_id === id)
        )}
        <div class="label">${target[2]}</div>
      </div>`;
    }
  );

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
        flex-direction: column;
        flex-grow: 1;
      }
      :host([scrollable]) .items {
        overflow: auto;
      }
      .items {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-width: 0;
        min-height: 0;
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
        padding-bottom: var(
          --ha-automation-add-items-padding-bottom,
          max(var(--safe-area-inset-bottom), var(--ha-space-3))
        );
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

      .items ha-list-base ha-list-item-button.current {
        color: var(--primary-text-color);
        background-color: var(--ha-color-fill-primary-quiet-resting);
        border-color: var(--ha-color-border-primary-quiet);
      }
      .items ha-list-base ha-list-item-button.current::part(base) {
        color: inherit;
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

      .selected-target state-badge {
        width: 24px;
        height: 24px;
        flex-shrink: 0;
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

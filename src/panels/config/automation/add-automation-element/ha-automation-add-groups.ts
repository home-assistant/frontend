import type { ContextType } from "@lit/context";
import { css, html, LitElement, nothing, type PropertyValues } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import { consume } from "../../../../common/decorators/consume";
import type { HASSDomCurrentTargetEvent } from "../../../../common/dom/fire_event";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-button";
import "../../../../components/ha-icon-next";
import "../../../../components/ha-section-title";
import "../../../../components/ha-svg-icon";
import "../../../../components/item/ha-list-item-button";
import "../../../../components/list/ha-list-base";
import { internationalizationContext } from "../../../../data/context";
import type {
  AddAutomationElementListItem,
  AddElementType,
  CollectionGroup,
  RecentElement,
} from "./types";

type ListItemButton = HTMLElement & { value: string; index?: number };

/**
 * @element ha-automation-add-groups
 *
 * @summary The groups of the "by type" tab, below the recently used elements.
 *
 * @fires group-selected - A group was clicked.
 * @fires recent-element-selected - A recently used element was clicked.
 * @fires clear-recent-elements - The recently used elements should be cleared.
 */
@customElement("ha-automation-add-groups")
export class HaAutomationAddGroups extends LitElement {
  @property({ attribute: false }) public type!: AddElementType;

  @property({ attribute: false }) public collections: CollectionGroup[] = [];

  @property({ attribute: false }) public recentElements: RecentElement[] = [];

  @property({ attribute: false }) public selectedGroup?: string;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public replacingItemKey?: string;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @query("ha-list-item-button.selected")
  private _selectedItem?: HTMLElement;

  private _scrollToSelected = false;

  /** Scrolls to the selected group once it is rendered. */
  public scrollToSelected() {
    this._scrollToSelected = true;
    this._scrollIfPending();
  }

  protected updated(changedProps: PropertyValues<this>) {
    super.updated(changedProps);
    this._scrollIfPending();
  }

  private _scrollIfPending() {
    if (!this._scrollToSelected || !this._selectedItem) {
      return;
    }
    this._scrollToSelected = false;
    this._selectedItem.scrollIntoView({ block: "center" });
  }

  protected render() {
    const { localize } = this._i18n;
    return html`
      <ha-list-base>
        ${
          this.recentElements.length
            ? html`<ha-section-title>
                  ${localize("ui.panel.config.automation.editor.recently_used")}
                  <ha-button
                    class="clear-recent"
                    aria-label=${localize(
                      "ui.panel.config.automation.editor.clear_recently_used"
                    )}
                    appearance="plain"
                    variant="neutral"
                    size="s"
                    @click=${this._clearRecentElements}
                  >
                    ${localize("ui.common.clear")}
                  </ha-button>
                </ha-section-title>
                ${repeat(
                  this.recentElements,
                  ({ item }) => `recent-${item.key}`,
                  ({ item, groupName }) => html`
                    <ha-list-item-button
                      .value=${item.key}
                      class=${this._isCurrent(item) ? "current" : ""}
                      .disabled=${this._isCurrent(item)}
                      aria-current=${this._isCurrent(item) ? "true" : nothing}
                      @click=${this._recentSelected}
                    >
                      <div slot="headline">${item.name}</div>
                      ${this._renderIcon(item)}
                      ${
                        groupName
                          ? html`<span slot="end" class="recent-group"
                              >${groupName}</span
                            >`
                          : nothing
                      }
                    </ha-list-item-button>
                  `
                )}`
            : nothing
        }
        ${this.collections.map(
          (collection) => html`
            ${
              collection.groups.length > 0 &&
              (!!collection.titleKey || this.recentElements.length > 0)
                ? html`<ha-section-title>
                    ${
                      collection.titleKey
                        ? localize(collection.titleKey)
                        : localize(
                            `ui.panel.config.automation.editor.${this.type}s.name`
                          )
                    }
                  </ha-section-title>`
                : nothing
            }
            ${repeat(
              collection.groups,
              (item) => item.key,
              (item) => html`
                <ha-list-item-button
                  .value=${item.key}
                  .index=${collection.collectionIndex}
                  @click=${this._groupSelected}
                  class=${item.key === this.selectedGroup ? "selected" : ""}
                >
                  <div slot="headline">${item.name}</div>
                  ${this._renderIcon(item)}
                  ${
                    this.narrow
                      ? html`<ha-icon-next slot="end"></ha-icon-next>`
                      : nothing
                  }
                </ha-list-item-button>
              `
            )}
          `
        )}
      </ha-list-base>
    `;
  }

  private _isCurrent(item: AddAutomationElementListItem) {
    return item.key === this.replacingItemKey;
  }

  private _renderIcon(item: AddAutomationElementListItem) {
    return item.icon
      ? html`<span slot="start">${item.icon}</span>`
      : item.iconPath
        ? html`<ha-svg-icon slot="start" .path=${item.iconPath}></ha-svg-icon>`
        : nothing;
  }

  private _groupSelected(ev: HASSDomCurrentTargetEvent<ListItemButton>) {
    this._scrollToSelected = false;
    fireEvent(this, "group-selected", {
      group: ev.currentTarget.value,
      collectionIndex: ev.currentTarget.index!,
    });
  }

  private _recentSelected(ev: HASSDomCurrentTargetEvent<ListItemButton>) {
    fireEvent(this, "recent-element-selected", {
      value: ev.currentTarget.value,
    });
  }

  private _clearRecentElements() {
    fireEvent(this, "clear-recent-elements");
  }

  static styles = css`
    :host {
      display: block;
    }

    ha-list-item-button {
      --ha-row-item-padding-block: var(--ha-space-1);
      --ha-row-item-padding-inline: var(--ha-space-3);
      --ha-row-item-min-height: 40px;
    }
    ha-list-item-button::part(start),
    ha-list-item-button::part(end) {
      color: var(--ha-color-on-neutral-quiet);
    }

    .current {
      color: var(--primary-text-color);
      background-color: var(--ha-color-fill-primary-quiet-resting);
    }
    .current::part(base) {
      color: inherit;
    }

    .selected {
      background-color: var(--ha-color-fill-primary-normal-active);
      --icon-primary-color: var(--ha-color-on-primary-normal);
    }
    .selected::part(headline) {
      color: var(--ha-color-on-primary-normal);
    }
    .selected ha-svg-icon {
      color: var(--ha-color-on-primary-normal);
    }

    ha-section-title {
      top: 0;
      position: sticky;
      z-index: 1;
    }

    ha-button.clear-recent {
      margin-inline-start: auto;
      margin-inline-end: calc(-1 * var(--ha-space-2));
      --ha-button-height: var(--ha-space-6);
      --wa-form-control-padding-inline: var(--ha-space-2);
      font-size: var(--ha-font-size-s);
    }

    .recent-group {
      color: var(--ha-color-on-neutral-quiet);
      font-size: var(--ha-font-size-s);
    }

    ha-icon-next {
      width: var(--ha-space-6);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-add-groups": HaAutomationAddGroups;
  }

  interface HASSDomEvents {
    "group-selected": { group: string; collectionIndex: number };
    "recent-element-selected": { value: string };
    "clear-recent-elements": undefined;
  }
}

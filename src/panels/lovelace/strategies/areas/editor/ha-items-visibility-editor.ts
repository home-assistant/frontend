import { mdiDrag, mdiEye, mdiEyeOff } from "@mdi/js";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { repeat } from "lit/directives/repeat";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-icon";
import "../../../../../components/ha-icon-button";
import "../../../../../components/ha-icon-button-next";
import "../../../../../components/ha-md-list";
import "../../../../../components/ha-md-list-item";
import "../../../../../components/ha-sortable";
import "../../../../../components/ha-svg-icon";
import type { HomeAssistant } from "../../../../../types";

export interface VisibilityEditorItem {
  icon?: string;
  iconPath?: string;
  value: string;
  label: string;
  description?: string;
}

export interface VisibilityEditorValue {
  order: string[];
  hidden: string[];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-items-visibility-editor": HaItemVisibilityEditor;
  }
  interface HASSDomEvents {
    "item-navigate-clicked": { value: string };
  }
}

@customElement("ha-items-visibility-editor")
export class HaItemVisibilityEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public items: VisibilityEditorItem[] = [];

  @property({ type: Boolean, attribute: "show-navigation-button" })
  public showNavigationButton = false;

  @property({ attribute: false }) public value: VisibilityEditorValue = {
    order: [],
    hidden: [],
  };

  private _toggle(ev) {
    ev.stopPropagation();
    const value = ev.currentTarget.value;

    const hiddenItems = this._hiddenItems(this.items, this.value.hidden);

    const newHidden = hiddenItems.map((item) => item.value);

    if (newHidden.includes(value)) {
      newHidden.splice(newHidden.indexOf(value), 1);
    } else {
      newHidden.push(value);
    }

    const newVisibleItems = this._visibleItems(this.items, newHidden);
    const newOrder = newVisibleItems.map((a) => a.value);

    this.value = {
      hidden: newHidden,
      order: newOrder,
    };
    fireEvent(this, "value-changed", { value: this.value });
  }

  private _itemMoved(ev: CustomEvent): void {
    ev.stopPropagation();
    const { oldIndex, newIndex } = ev.detail;

    const visibleItems = this._visibleItems(this.items, this.value.hidden);
    const newOrder = visibleItems.map((item) => item.value);

    const movedItem = newOrder.splice(oldIndex, 1)[0];
    newOrder.splice(newIndex, 0, movedItem);

    this.value = {
      ...this.value,
      order: newOrder,
    };
    fireEvent(this, "value-changed", { value: this.value });
  }

  private _navigate(ev) {
    const value = ev.currentTarget.value;
    fireEvent(this, "item-navigate-clicked", { value });
    ev.stopPropagation();
  }

  private _visibleItems = memoizeOne(
    (items: VisibilityEditorItem[], hidden: string[]) =>
      items.filter((item) => !hidden.includes(item.value))
  );

  private _hiddenItems = memoizeOne(
    (items: VisibilityEditorItem[], hidden: string[]) =>
      items.filter((item) => hidden.includes(item.value))
  );

  protected render() {
    const allItems = [
      ...this._visibleItems(this.items, this.value.hidden),
      ...this._hiddenItems(this.items, this.value.hidden),
    ];

    return html`
      <ha-sortable
        draggable-selector=".draggable"
        handle-selector=".handle"
        @item-moved=${this._itemMoved}
      >
        <ha-md-list>
          ${repeat(
            allItems,
            (item) => item.value,
            (item, _idx) => {
              const isVisible = !this.value.hidden.includes(item.value);
              const { label, value, description, icon, iconPath } = item;
              return html`
                <ha-md-list-item
                  class=${classMap({
                    hidden: !isVisible,
                    draggable: isVisible,
                  })}
                >
                  <span slot="headline">${label}</span>
                  ${description
                    ? html`<span slot="supporting-text">${description}</span>`
                    : nothing}
                  ${isVisible
                    ? html`
                        <ha-svg-icon
                          class="handle"
                          .path=${mdiDrag}
                          slot="start"
                        ></ha-svg-icon>
                      `
                    : html` <ha-svg-icon slot="start"></ha-svg-icon> `}
                  ${icon
                    ? html`<ha-icon
                        class="icon"
                        .icon=${icon}
                        slot="start"
                      ></ha-icon>`
                    : iconPath
                      ? html`
                          <ha-svg-icon
                            class="icon"
                            .path=${iconPath}
                            slot="start"
                          ></ha-svg-icon>
                        `
                      : nothing}
                  <ha-icon-button
                    .path=${isVisible ? mdiEye : mdiEyeOff}
                    slot="end"
                    .label=${(isVisible ? "Hide" : "Show") + " " + name}
                    .value=${value}
                    @click=${this._toggle}
                  ></ha-icon-button>
                  ${this.showNavigationButton
                    ? html`
                        <ha-icon-button-next
                          slot="end"
                          .value=${value}
                          @click=${this._navigate}
                        ></ha-icon-button-next>
                      `
                    : nothing}
                </ha-md-list-item>
              `;
            }
          )}
        </ha-md-list>
      </ha-sortable>
    `;
  }

  static styles = css`
    :host {
      display: block;
    }
    .handle {
      cursor: move;
      padding: 8px;
      margin: -8px;
    }
    ha-md-list {
      padding: 0;
    }
    @media (max-width: 500px) {
      .icon {
        display: none;
      }
    }
    ha-md-list-item {
      --md-list-item-top-space: 0;
      --md-list-item-bottom-space: 0;
      --md-list-item-leading-space: 8px;
      --md-list-item-trailing-space: 8px;
      --md-list-item-two-line-container-height: 48px;
      --md-list-item-one-line-container-height: 48px;
    }
    ha-md-list-item ha-icon-button {
      margin-left: -12px;
      margin-right: -12px;
    }
    ha-md-list-item.hidden {
      --md-list-item-label-text-color: var(--disabled-text-color);
      --md-list-item-supporting-text-color: var(--disabled-text-color);
    }
    ha-md-list-item.hidden .icon {
      color: var(--disabled-text-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-items-visibility-editor": HaItemVisibilityEditor;
  }
}

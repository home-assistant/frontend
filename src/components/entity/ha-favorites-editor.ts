import { mdiDragHorizontalVariant } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import { fireEvent, type HASSDomEvent } from "../../common/dom/fire_event";
import type { HaEntityPicker } from "./ha-entity-picker";
import "./ha-entity-picker";
import "../ha-sortable";
import "../ha-svg-icon";
import type { HaEntityPickerEntityFilterFunc } from "../../data/entity/entity";
import type { ValueChangedEvent } from "../../types";
import "./ha-favorite-entity-list-item";

@customElement("ha-favorites-editor")
export class HaFavoritesEditor extends LitElement {
  @property({ attribute: false }) public favorites: string[] = [];

  @property() public label?: string;

  @property() public helper?: string;

  @property({ attribute: false })
  public entityFilter?: HaEntityPickerEntityFilterFunc;

  @property({ attribute: "add-button-label" }) public addButtonLabel?: string;

  protected render() {
    return html`
      ${this.label ? html`<p class="field-label">${this.label}</p>` : nothing}
      ${
        this.helper ? html`<p class="field-helper">${this.helper}</p>` : nothing
      }
      <ha-sortable handle-selector=".handle" @item-moved=${this._moved}>
        <div class="favorites-list">
          ${repeat(
            this.favorites,
            (entityId) => entityId,
            (entityId, index) => html`
              <div class="favorite-row">
                <div class="handle">
                  <ha-svg-icon .path=${mdiDragHorizontalVariant}></ha-svg-icon>
                </div>
                <ha-favorite-entity-list-item
                  class="favorite-content"
                  .entityId=${entityId}
                  .index=${index}
                  @delete-favorite-entity=${this._remove}
                ></ha-favorite-entity-list-item>
              </div>
            `
          )}
        </div>
      </ha-sortable>
      <ha-entity-picker
        add-button
        .addButtonLabel=${this.addButtonLabel}
        .excludeEntities=${this.favorites}
        .entityFilter=${this.entityFilter}
        @value-changed=${this._add}
      ></ha-entity-picker>
    `;
  }

  private _update(next: string[]): void {
    fireEvent(this, "value-changed", { value: next });
  }

  private _add(ev: ValueChangedEvent<string | undefined>): void {
    ev.stopPropagation();
    const entityId = ev.detail.value;
    if (!entityId) return;

    (ev.currentTarget as HaEntityPicker).value = "";

    if (this.favorites.includes(entityId)) return;

    this._update([...this.favorites, entityId]);
  }

  private _remove(ev: HASSDomEvent<{ index: number }>): void {
    const { index } = ev.detail;
    const next = [...this.favorites];
    next.splice(index, 1);
    this._update(next);
  }

  private _moved(ev: HASSDomEvent<HASSDomEvents["item-moved"]>): void {
    ev.stopPropagation();
    const { oldIndex, newIndex } = ev.detail;
    const next = [...this.favorites];
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved);
    this._update(next);
  }

  static styles = css`
    .field-label {
      margin: 0 0 var(--ha-space-1) 0;
      font-size: 14px;
      color: var(--primary-text-color);
    }
    .field-helper {
      margin: 0 0 var(--ha-space-2) 0;
      color: var(--secondary-text-color);
      font-size: 12px;
    }
    .favorites-list {
      display: flex;
      flex-direction: column;
    }
    .favorite-row {
      display: flex;
      align-items: center;
      gap: var(--ha-space-2);
    }
    .favorite-content {
      flex: 1;
      min-width: 0;
    }
    .handle {
      cursor: grab;
      color: var(--secondary-text-color);
      flex-shrink: 0;
      display: flex;
      align-items: center;
    }
    ha-entity-picker {
      display: block;
      padding-top: var(--ha-space-2);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-favorites-editor": HaFavoritesEditor;
  }
}

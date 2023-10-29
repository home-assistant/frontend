import { mdiDrag } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import type { SortableEvent } from "sortablejs";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/entity/ha-entity-picker";
import type {
  HaEntityPicker,
  HaEntityPickerEntityFilterFunc,
} from "../../../components/entity/ha-entity-picker";
import "../../../components/ha-icon-button";
import { sortableStyles } from "../../../resources/ha-sortable-style";
import type { SortableInstance } from "../../../resources/sortable";
import { HomeAssistant } from "../../../types";
import { EntityConfig } from "../entity-rows/types";

@customElement("hui-entity-editor")
export class HuiEntityEditor extends LitElement {
  @property({ attribute: false }) protected hass?: HomeAssistant;

  @property({ attribute: false }) protected entities?: EntityConfig[];

  @property() protected entityFilter?: HaEntityPickerEntityFilterFunc;

  @property() protected label?: string;

  private _entityKeys = new WeakMap<EntityConfig, string>();

  private _sortable?: SortableInstance;

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._destroySortable();
  }

  private _getKey(action: EntityConfig) {
    if (!this._entityKeys.has(action)) {
      this._entityKeys.set(action, Math.random().toString());
    }

    return this._entityKeys.get(action)!;
  }

  protected render() {
    if (!this.entities) {
      return nothing;
    }

    return html`
      <h3>
        ${this.label ||
        this.hass!.localize("ui.panel.lovelace.editor.card.generic.entities") +
          " (" +
          this.hass!.localize("ui.panel.lovelace.editor.card.config.required") +
          ")"}
      </h3>
      <div class="entities">
        ${repeat(
          this.entities,
          (entityConf) => this._getKey(entityConf),
          (entityConf, index) => html`
            <div class="entity" data-entity-id=${entityConf.entity}>
              <div class="handle">
                <ha-svg-icon .path=${mdiDrag}></ha-svg-icon>
              </div>
              <ha-entity-picker
                .hass=${this.hass}
                .value=${entityConf.entity}
                .index=${index}
                .entityFilter=${this.entityFilter}
                @value-changed=${this._valueChanged}
                allow-custom-entity
              ></ha-entity-picker>
            </div>
          `
        )}
      </div>
      <ha-entity-picker
        class="add-entity"
        .hass=${this.hass}
        .entityFilter=${this.entityFilter}
        @value-changed=${this._addEntity}
      ></ha-entity-picker>
    `;
  }

  protected firstUpdated(): void {
    this._createSortable();
  }

  private async _createSortable() {
    const Sortable = (await import("../../../resources/sortable")).default;
    this._sortable = new Sortable(
      this.shadowRoot!.querySelector(".entities")!,
      {
        animation: 150,
        fallbackClass: "sortable-fallback",
        handle: ".handle",
        dataIdAttr: "data-entity-id",
        onChoose: (evt: SortableEvent) => {
          (evt.item as any).placeholder =
            document.createComment("sort-placeholder");
          evt.item.after((evt.item as any).placeholder);
        },
        onEnd: (evt: SortableEvent) => {
          // put back in original location
          if ((evt.item as any).placeholder) {
            (evt.item as any).placeholder.replaceWith(evt.item);
            delete (evt.item as any).placeholder;
          }
          this._entityMoved(evt);
        },
      }
    );
  }

  private _destroySortable() {
    this._sortable?.destroy();
    this._sortable = undefined;
  }

  private async _addEntity(ev: CustomEvent): Promise<void> {
    const value = ev.detail.value;
    if (value === "") {
      return;
    }
    const newConfigEntities = this.entities!.concat({
      entity: value as string,
    });
    (ev.target as HaEntityPicker).value = "";
    fireEvent(this, "entities-changed", { entities: newConfigEntities });
  }

  private _entityMoved(ev: SortableEvent): void {
    if (ev.oldIndex === ev.newIndex) {
      return;
    }

    const newEntities = this.entities!.concat();

    newEntities.splice(ev.newIndex!, 0, newEntities.splice(ev.oldIndex!, 1)[0]);

    fireEvent(this, "entities-changed", { entities: newEntities });
  }

  private _valueChanged(ev: CustomEvent): void {
    const value = ev.detail.value;
    const index = (ev.target as any).index;
    const newConfigEntities = this.entities!.concat();

    if (value === "" || value === undefined) {
      newConfigEntities.splice(index, 1);
    } else {
      newConfigEntities[index] = {
        ...newConfigEntities[index],
        entity: value!,
      };
    }

    fireEvent(this, "entities-changed", { entities: newConfigEntities });
  }

  static get styles(): CSSResultGroup {
    return [
      sortableStyles,
      css`
        ha-entity-picker {
          margin-top: 8px;
        }
        .add-entity {
          display: block;
          margin-left: 31px;
          margin-inline-start: 31px;
          margin-inline-end: initial;
          direction: var(--direction);
        }
        .entity {
          display: flex;
          align-items: center;
        }
        .entity .handle {
          padding-right: 8px;
          cursor: move;
          padding-inline-end: 8px;
          padding-inline-start: initial;
          direction: var(--direction);
        }
        .entity .handle > * {
          pointer-events: none;
        }
        .entity ha-entity-picker {
          flex-grow: 1;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-entity-editor": HuiEntityEditor;
  }
}

import { mdiDrag } from "@mdi/js";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { guard } from "lit/directives/guard";
import type { SortableEvent } from "sortablejs";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/entity/ha-entity-picker";
import type { HaEntityPicker } from "../../../components/entity/ha-entity-picker";
import "../../../components/ha-icon-button";
import { sortableStyles } from "../../../resources/ha-sortable-style";
import {
  loadSortable,
  SortableInstance,
} from "../../../resources/sortable.ondemand";
import { HomeAssistant } from "../../../types";
import { EntityConfig } from "../entity-rows/types";

@customElement("hui-entity-editor")
export class HuiEntityEditor extends LitElement {
  @property({ attribute: false }) protected hass?: HomeAssistant;

  @property({ attribute: false }) protected entities?: EntityConfig[];

  @property() protected label?: string;

  @state() private _attached = false;

  @state() private _renderEmptySortable = false;

  private _sortable?: SortableInstance;

  public connectedCallback() {
    super.connectedCallback();
    this._attached = true;
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._attached = false;
  }

  protected render(): TemplateResult {
    if (!this.entities) {
      return html``;
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
        ${guard([this.entities, this._renderEmptySortable], () =>
          this._renderEmptySortable
            ? ""
            : this.entities!.map(
                (entityConf, index) => html`
                  <div class="entity" data-entity-id=${entityConf.entity}>
                    <ha-svg-icon .path=${mdiDrag}></ha-svg-icon>
                    <ha-entity-picker
                      .hass=${this.hass}
                      .value=${entityConf.entity}
                      .index=${index}
                      @value-changed=${this._valueChanged}
                      allow-custom-entity
                    ></ha-entity-picker>
                  </div>
                `
              )
        )}
      </div>
      <ha-entity-picker
        class="add-entity"
        .hass=${this.hass}
        @value-changed=${this._addEntity}
      ></ha-entity-picker>
    `;
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);

    const attachedChanged = changedProps.has("_attached");
    const entitiesChanged = changedProps.has("entities");

    if (!entitiesChanged && !attachedChanged) {
      return;
    }

    if (attachedChanged && !this._attached) {
      // Tear down sortable, if available
      this._sortable?.destroy();
      this._sortable = undefined;
      return;
    }

    if (!this._sortable && this.entities) {
      this._createSortable();
      return;
    }

    if (entitiesChanged) {
      this._handleEntitiesChanged();
    }
  }

  private async _handleEntitiesChanged() {
    this._renderEmptySortable = true;
    await this.updateComplete;
    const container = this.shadowRoot!.querySelector(".entities")!;
    while (container.lastElementChild) {
      container.removeChild(container.lastElementChild);
    }
    this._renderEmptySortable = false;
  }

  private async _createSortable() {
    const Sortable = await loadSortable();

    this._sortable = new Sortable(
      this.shadowRoot!.querySelector(".entities")!,
      {
        animation: 150,
        fallbackClass: "sortable-fallback",
        handle: "ha-svg-icon",
        dataIdAttr: "data-entity-id",
        onEnd: async (evt: SortableEvent) => this._entityMoved(evt),
      }
    );
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
        .entity ha-svg-icon {
          padding-right: 8px;
          cursor: move;
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

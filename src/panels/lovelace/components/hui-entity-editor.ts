import { mdiDrag } from "@mdi/js";
import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import { guard } from "lit-html/directives/guard";
import type { SortableEvent } from "sortablejs";
import Sortable, {
  AutoScroll,
  OnSpill,
} from "sortablejs/modular/sortable.core.esm";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/entity/ha-entity-picker";
import "../../../components/ha-icon-button";
import { sortableStyles } from "../../../resources/ha-sortable-style";
import { HomeAssistant } from "../../../types";
import { EditorTarget } from "../editor/types";
import { EntityConfig } from "../entity-rows/types";

@customElement("hui-entity-editor")
export class HuiEntityEditor extends LitElement {
  @property({ attribute: false }) protected hass?: HomeAssistant;

  @property({ attribute: false }) protected entities?: EntityConfig[];

  @property() protected label?: string;

  @internalProperty() private _attached = false;

  @internalProperty() private _renderEmptySortable = false;

  private _sortable?: Sortable;

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
            : this.entities!.map((entityConf, index) => {
                return html`
                  <div class="entity" data-entity-id=${entityConf.entity}>
                    <ha-svg-icon .path=${mdiDrag}></ha-svg-icon>
                    <ha-entity-picker
                      .hass=${this.hass}
                      .value=${entityConf.entity}
                      .index=${index}
                      @change=${this._valueChanged}
                      allow-custom-entity
                    ></ha-entity-picker>
                  </div>
                `;
              })
        )}
      </div>
      <ha-entity-picker
        .hass=${this.hass}
        @change=${this._addEntity}
      ></ha-entity-picker>
    `;
  }

  protected firstUpdated(): void {
    Sortable.mount(OnSpill);
    Sortable.mount(new AutoScroll());
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
    this._renderEmptySortable = false;
  }

  private _createSortable() {
    this._sortable = new Sortable(this.shadowRoot!.querySelector(".entities"), {
      animation: 150,
      fallbackClass: "sortable-fallback",
      handle: "ha-svg-icon",
      dataIdAttr: "data-entity-id",
      onEnd: async (evt: SortableEvent) => this._entityMoved(evt),
    });
  }

  private async _addEntity(ev: Event): Promise<void> {
    const target = ev.target! as EditorTarget;
    if (target.value === "") {
      return;
    }
    const newConfigEntities = this.entities!.concat({
      entity: target.value as string,
    });
    target.value = "";
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

  private _valueChanged(ev: Event): void {
    const target = ev.target! as EditorTarget;
    const newConfigEntities = this.entities!.concat();

    if (target.value === "") {
      newConfigEntities.splice(target.index!, 1);
    } else {
      newConfigEntities[target.index!] = {
        ...newConfigEntities[target.index!],
        entity: target.value!,
      };
    }

    fireEvent(this, "entities-changed", { entities: newConfigEntities });
  }

  static get styles(): CSSResult[] {
    return [
      sortableStyles,
      css`
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

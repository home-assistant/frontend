import {
  mdiClose,
  mdiDrag,
  mdiPencil,
  mdiPlus,
  mdiWindowShutter,
} from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import type { SortableEvent } from "sortablejs";
import { fireEvent } from "../../../../common/dom/fire_event";
import { stopPropagation } from "../../../../common/dom/stop_propagation";
import "../../../../components/entity/ha-entity-picker";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-svg-icon";
import { sortableStyles } from "../../../../resources/ha-sortable-style";
import {
  loadSortable,
  SortableInstance,
} from "../../../../resources/sortable.ondemand";
import { HomeAssistant } from "../../../../types";
import { LovelaceTileControlConfig } from "../../tile-control/types";

declare global {
  interface HASSDomEvents {
    "controls-changed": {
      controls: LovelaceTileControlConfig[];
    };
  }
}

@customElement("hui-tile-card-controls-editor")
export class HuiTileCardControlsEditor extends LitElement {
  @property({ attribute: false }) protected hass?: HomeAssistant;

  @property({ attribute: false })
  protected controls?: LovelaceTileControlConfig[];

  @property() protected label?: string;

  private _controlKeys = new WeakMap<LovelaceTileControlConfig, string>();

  private _sortable?: SortableInstance;

  public disconnectedCallback() {
    this._destroySortable();
  }

  private _getKey(control: LovelaceTileControlConfig) {
    if (!this._controlKeys.has(control)) {
      this._controlKeys.set(control, Math.random().toString());
    }

    return this._controlKeys.get(control)!;
  }

  protected render(): TemplateResult {
    if (!this.controls || !this.hass) {
      return html``;
    }

    return html`
      <h3>Controls</h3>
      <div class="controls">
        ${repeat(
          this.controls,
          (controlConf) => this._getKey(controlConf),
          (controlConf, index) => html`
            <div class="control">
              <div class="handle">
                <ha-svg-icon .path=${mdiDrag}></ha-svg-icon>
              </div>
              <div class="special-row">
                <div>
                  <span> ${controlConf.type} </span>
                </div>
              </div>

              <ha-icon-button
                .label=${this.hass!.localize(
                  "ui.components.entity.entity-picker.clear"
                )}
                .path=${mdiClose}
                class="remove-icon"
                .index=${index}
                @click=${this._removeControl}
              ></ha-icon-button>
              <ha-icon-button
                .label=${this.hass!.localize(
                  "ui.components.entity.entity-picker.edit"
                )}
                .path=${mdiPencil}
                class="edit-icon"
                .index=${index}
                @click=${this._editControl}
              ></ha-icon-button>
            </div>
          `
        )}
      </div>

      <ha-button-menu
        fixed
        @action=${this._addControl}
        @closed=${stopPropagation}
      >
        <mwc-button slot="trigger" outlined label="Add control">
          <ha-svg-icon .path=${mdiPlus} slot="icon"></ha-svg-icon>
        </mwc-button>
        <mwc-list-item value="cover-position">
          <ha-svg-icon slot="graphic" .path=${mdiWindowShutter}></ha-svg-icon>
          Cover position
        </mwc-list-item>
      </ha-button-menu>
    `;
  }

  protected firstUpdated(): void {
    this._createSortable();
  }

  private async _createSortable() {
    const Sortable = await loadSortable();
    this._sortable = new Sortable(
      this.shadowRoot!.querySelector(".controls")!,
      {
        animation: 150,
        fallbackClass: "sortable-fallback",
        handle: ".handle",
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
          this._rowMoved(evt);
        },
      }
    );
  }

  private _destroySortable() {
    this._sortable?.destroy();
    this._sortable = undefined;
  }

  private async _addControl(ev: CustomEvent): Promise<void> {
    const index = ev.detail.index as number;

    if (index == null) return;

    const newControl = { type: "cover-position" } as LovelaceTileControlConfig;
    const newConfigControls = this.controls!.concat(newControl);
    fireEvent(this, "controls-changed", { controls: newConfigControls });
  }

  private _rowMoved(ev: SortableEvent): void {
    if (ev.oldIndex === ev.newIndex) {
      return;
    }

    const newEntities = this.controls!.concat();

    newEntities.splice(ev.newIndex!, 0, newEntities.splice(ev.oldIndex!, 1)[0]);

    fireEvent(this, "controls-changed", { controls: newEntities });
  }

  private _removeControl(ev: CustomEvent): void {
    const index = (ev.currentTarget as any).index;
    const newControls = this.controls!.concat();

    newControls.splice(index, 1);

    fireEvent(this, "controls-changed", { controls: newControls });
  }

  private _editControl(ev: CustomEvent): void {
    const index = (ev.currentTarget as any).index;
    fireEvent(this, "edit-detail-element", {
      subElementConfig: {
        index,
        type: "tile-control",
        elementConfig: this.controls![index],
      },
    });
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
          margin-right: 71px;
          margin-inline-start: 31px;
          margin-inline-end: 71px;
          direction: var(--direction);
        }
        .control {
          display: flex;
          align-items: center;
        }

        .control .handle {
          padding-right: 8px;
          cursor: move;
          padding-inline-end: 8px;
          padding-inline-start: initial;
          direction: var(--direction);
        }
        .control .handle > * {
          pointer-events: none;
        }

        .control ha-entity-picker {
          flex-grow: 1;
        }

        .special-row {
          height: 60px;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-grow: 1;
        }

        .special-row div {
          display: flex;
          flex-direction: column;
        }

        .remove-icon,
        .edit-icon {
          --mdc-icon-button-size: 36px;
          color: var(--secondary-text-color);
        }

        .secondary {
          font-size: 12px;
          color: var(--secondary-text-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-tile-card-controls-editor": HuiTileCardControlsEditor;
  }
}

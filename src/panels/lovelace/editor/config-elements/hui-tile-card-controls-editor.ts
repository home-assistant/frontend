import {
  mdiDelete,
  mdiDrag,
  mdiListBox,
  mdiPencil,
  mdiPlus,
  mdiWindowShutter,
} from "@mdi/js";
import { HassEntity } from "home-assistant-js-websocket";
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
import { getTileControlElementClass } from "../../create-element/create-tile-control-element";
import {
  isTileControlEditable,
  supportsTileControl,
} from "../../tile-control/tile-controls";
import { LovelaceTileControlConfig } from "../../tile-control/types";

const CONTROLS_TYPE: LovelaceTileControlConfig["type"][] = [
  "cover-open-close",
  "cover-tilt",
];

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

  @property({ attribute: false }) public stateObj?: HassEntity;

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

  private get _supportedControlTypes() {
    if (!this.stateObj) return [];

    return CONTROLS_TYPE.filter((type) =>
      supportsTileControl(this.stateObj!, type)
    );
  }

  protected render(): TemplateResult {
    if (!this.controls || !this.hass) {
      return html``;
    }

    return html`
      <ha-expansion-panel outlined>
        <h3 slot="header">
          <ha-svg-icon .path=${mdiListBox}></ha-svg-icon>
          ${this.hass!.localize(
            "ui.panel.lovelace.editor.card.tile.controls.name"
          )}
        </h3>
        <div class="content">
          ${this._supportedControlTypes.length === 0 &&
          this.controls.length === 0
            ? html`
                <ha-alert type="info">
                  ${this.hass!.localize(
                    "ui.panel.lovelace.editor.card.tile.controls.no_compatible_available"
                  )}
                </ha-alert>
              `
            : null}
          <div class="controls">
            ${repeat(
              this.controls,
              (controlConf) => this._getKey(controlConf),
              (controlConf, index) => html`
                <div class="control">
                  <div class="handle">
                    <ha-svg-icon .path=${mdiDrag}></ha-svg-icon>
                  </div>
                  <div class="control-content">
                    <div>
                      <span>
                        ${this.hass!.localize(
                          `ui.panel.lovelace.editor.card.tile.controls.types.${controlConf.type}.label`
                        )}
                      </span>
                      ${this.stateObj &&
                      !supportsTileControl(this.stateObj, controlConf.type)
                        ? html`<span class="secondary">
                            ${this.hass!.localize(
                              "ui.panel.lovelace.editor.card.tile.controls.not_compatible"
                            )}
                          </span>`
                        : null}
                    </div>
                  </div>
                  ${isTileControlEditable(controlConf.type)
                    ? html`<ha-icon-button
                        .label=${this.hass!.localize(
                          `ui.panel.lovelace.editor.card.tile.controls.edit`
                        )}
                        .path=${mdiPencil}
                        class="edit-icon"
                        .index=${index}
                        @click=${this._editControl}
                      ></ha-icon-button>`
                    : null}
                  <ha-icon-button
                    .label=${this.hass!.localize(
                      `ui.panel.lovelace.editor.card.tile.controls.remove`
                    )}
                    .path=${mdiDelete}
                    class="remove-icon"
                    .index=${index}
                    @click=${this._removeControl}
                  ></ha-icon-button>
                </div>
              `
            )}
          </div>
          ${this._supportedControlTypes.length > 0
            ? html`
                <ha-button-menu
                  fixed
                  @action=${this._addControl}
                  @closed=${stopPropagation}
                >
                  <mwc-button
                    slot="trigger"
                    outlined
                    .label=${this.hass!.localize(
                      `ui.panel.lovelace.editor.card.tile.controls.add`
                    )}
                  >
                    <ha-svg-icon .path=${mdiPlus} slot="icon"></ha-svg-icon>
                  </mwc-button>
                  ${this._supportedControlTypes.map(
                    (controlType) => html` <mwc-list-item .value=${controlType}>
                      <ha-svg-icon
                        slot="graphic"
                        .path=${mdiWindowShutter}
                      ></ha-svg-icon>
                      ${this.hass!.localize(
                        `ui.panel.lovelace.editor.card.tile.controls.types.${controlType}.label`
                      )}
                    </mwc-list-item>`
                  )}
                </ha-button-menu>
              `
            : null}
        </div>
      </ha-expansion-panel>
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

    const value = this._supportedControlTypes[index];
    const elClass = await getTileControlElementClass(value);

    let newControl: LovelaceTileControlConfig;
    if (elClass && elClass.getStubConfig) {
      newControl = await elClass.getStubConfig(this.hass!);
    } else {
      newControl = { type: value } as LovelaceTileControlConfig;
    }
    const newConfigControls = this.controls!.concat(newControl);
    fireEvent(this, "controls-changed", { controls: newConfigControls });
  }

  private _rowMoved(ev: SortableEvent): void {
    if (ev.oldIndex === ev.newIndex) {
      return;
    }

    const newControls = this.controls!.concat();

    newControls.splice(ev.newIndex!, 0, newControls.splice(ev.oldIndex!, 1)[0]);

    fireEvent(this, "controls-changed", { controls: newControls });
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
        :host {
          display: flex !important;
          flex-direction: column;
        }
        .content {
          padding: 12px;
        }
        ha-expansion-panel {
          display: block;
          --expansion-panel-content-padding: 0;
          border-radius: 6px;
        }
        h3 {
          margin: 0;
          font-size: inherit;
          font-weight: inherit;
        }
        ha-svg-icon,
        ha-icon {
          color: var(--secondary-text-color);
        }
        ha-button-menu {
          margin-top: 8px;
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

        .control-content {
          height: 60px;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-grow: 1;
        }

        .control-content div {
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

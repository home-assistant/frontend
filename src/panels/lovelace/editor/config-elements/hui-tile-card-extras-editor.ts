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
import { getTileExtraElementClass } from "../../create-element/create-tile-extra-element";
import {
  isTileExtraEditable,
  supportsTileExtra,
} from "../../tile-extra/tile-extras";
import { LovelaceTileExtraConfig } from "../../tile-extra/types";

const EXTRAS_TYPE: LovelaceTileExtraConfig["type"][] = [
  "cover-open-close",
  "cover-tilt",
  "light-brightness",
  "vacuum-commands",
];

declare global {
  interface HASSDomEvents {
    "extras-changed": {
      extras: LovelaceTileExtraConfig[];
    };
  }
}

@customElement("hui-tile-card-extras-editor")
export class HuiTileCardExtrasEditor extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?: HassEntity;

  @property({ attribute: false })
  public extras?: LovelaceTileExtraConfig[];

  @property() public label?: string;

  private _extraKeys = new WeakMap<LovelaceTileExtraConfig, string>();

  private _sortable?: SortableInstance;

  public disconnectedCallback() {
    this._destroySortable();
  }

  private _getKey(extra: LovelaceTileExtraConfig) {
    if (!this._extraKeys.has(extra)) {
      this._extraKeys.set(extra, Math.random().toString());
    }

    return this._extraKeys.get(extra)!;
  }

  private get _supportedExtraTypes() {
    if (!this.stateObj) return [];

    return EXTRAS_TYPE.filter((type) =>
      supportsTileExtra(this.stateObj!, type)
    );
  }

  protected render(): TemplateResult {
    if (!this.extras || !this.hass) {
      return html``;
    }

    return html`
      <ha-expansion-panel outlined>
        <h3 slot="header">
          <ha-svg-icon .path=${mdiListBox}></ha-svg-icon>
          ${this.hass!.localize(
            "ui.panel.lovelace.editor.card.tile.extras.name"
          )}
        </h3>
        <div class="content">
          ${this._supportedExtraTypes.length === 0 && this.extras.length === 0
            ? html`
                <ha-alert type="info">
                  ${this.hass!.localize(
                    "ui.panel.lovelace.editor.card.tile.extras.no_compatible_available"
                  )}
                </ha-alert>
              `
            : null}
          <div class="extras">
            ${repeat(
              this.extras,
              (extraConf) => this._getKey(extraConf),
              (extraConf, index) => html`
                <div class="extra">
                  <div class="handle">
                    <ha-svg-icon .path=${mdiDrag}></ha-svg-icon>
                  </div>
                  <div class="extra-content">
                    <div>
                      <span>
                        ${this.hass!.localize(
                          `ui.panel.lovelace.editor.card.tile.extras.types.${extraConf.type}.label`
                        )}
                      </span>
                      ${this.stateObj &&
                      !supportsTileExtra(this.stateObj, extraConf.type)
                        ? html`<span class="secondary">
                            ${this.hass!.localize(
                              "ui.panel.lovelace.editor.card.tile.extras.not_compatible"
                            )}
                          </span>`
                        : null}
                    </div>
                  </div>
                  ${isTileExtraEditable(extraConf.type)
                    ? html`<ha-icon-button
                        .label=${this.hass!.localize(
                          `ui.panel.lovelace.editor.card.tile.extras.edit`
                        )}
                        .path=${mdiPencil}
                        class="edit-icon"
                        .index=${index}
                        @click=${this._editExtra}
                      ></ha-icon-button>`
                    : null}
                  <ha-icon-button
                    .label=${this.hass!.localize(
                      `ui.panel.lovelace.editor.card.tile.extras.remove`
                    )}
                    .path=${mdiDelete}
                    class="remove-icon"
                    .index=${index}
                    @click=${this._removeExtra}
                  ></ha-icon-button>
                </div>
              `
            )}
          </div>
          ${this._supportedExtraTypes.length > 0
            ? html`
                <ha-button-menu
                  fixed
                  @action=${this._addExtra}
                  @closed=${stopPropagation}
                >
                  <mwc-button
                    slot="trigger"
                    outlined
                    .label=${this.hass!.localize(
                      `ui.panel.lovelace.editor.card.tile.extras.add`
                    )}
                  >
                    <ha-svg-icon .path=${mdiPlus} slot="icon"></ha-svg-icon>
                  </mwc-button>
                  ${this._supportedExtraTypes.map(
                    (extraType) => html`<mwc-list-item .value=${extraType}>
                      <ha-svg-icon
                        slot="graphic"
                        .path=${mdiWindowShutter}
                      ></ha-svg-icon>
                      ${this.hass!.localize(
                        `ui.panel.lovelace.editor.card.tile.extras.types.${extraType}.label`
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
    this._sortable = new Sortable(this.shadowRoot!.querySelector(".extras")!, {
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
    });
  }

  private _destroySortable() {
    this._sortable?.destroy();
    this._sortable = undefined;
  }

  private async _addExtra(ev: CustomEvent): Promise<void> {
    const index = ev.detail.index as number;

    if (index == null) return;

    const value = this._supportedExtraTypes[index];
    const elClass = await getTileExtraElementClass(value);

    let newExtra: LovelaceTileExtraConfig;
    if (elClass && elClass.getStubConfig) {
      newExtra = await elClass.getStubConfig(this.hass!, this.stateObj);
    } else {
      newExtra = { type: value } as LovelaceTileExtraConfig;
    }
    const newConfigExtra = this.extras!.concat(newExtra);
    fireEvent(this, "extras-changed", { extras: newConfigExtra });
  }

  private _rowMoved(ev: SortableEvent): void {
    if (ev.oldIndex === ev.newIndex) {
      return;
    }

    const newExtras = this.extras!.concat();

    newExtras.splice(ev.newIndex!, 0, newExtras.splice(ev.oldIndex!, 1)[0]);

    fireEvent(this, "extras-changed", { extras: newExtras });
  }

  private _removeExtra(ev: CustomEvent): void {
    const index = (ev.currentTarget as any).index;
    const newExtras = this.extras!.concat();

    newExtras.splice(index, 1);

    fireEvent(this, "extras-changed", { extras: newExtras });
  }

  private _editExtra(ev: CustomEvent): void {
    const index = (ev.currentTarget as any).index;
    fireEvent(this, "edit-detail-element", {
      subElementConfig: {
        index,
        type: "tile-extra",
        elementConfig: this.extras![index],
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
        .extra {
          display: flex;
          align-items: center;
        }
        .extra .handle {
          padding-right: 8px;
          cursor: move;
          padding-inline-end: 8px;
          padding-inline-start: initial;
          direction: var(--direction);
        }
        .extra .handle > * {
          pointer-events: none;
        }

        .extra-content {
          height: 60px;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-grow: 1;
        }

        .extra-content div {
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
    "hui-tile-card-extras-editor": HuiTileCardExtrasEditor;
  }
}

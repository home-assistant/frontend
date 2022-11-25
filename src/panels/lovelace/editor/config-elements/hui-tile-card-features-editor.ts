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
import { getTileFeatureElementClass } from "../../create-element/create-tile-feature-element";
import {
  isTileFeatureEditable,
  supportsTileFeature,
} from "../../tile-features/tile-features";
import { LovelaceTileFeatureConfig } from "../../tile-features/types";

const FEATURES_TYPE: LovelaceTileFeatureConfig["type"][] = [
  "alarm-commands",
  "cover-open-close",
  "cover-tilt",
  "light-brightness",
  "vacuum-commands",
];

declare global {
  interface HASSDomEvents {
    "features-changed": {
      features: LovelaceTileFeatureConfig[];
    };
  }
}

@customElement("hui-tile-card-features-editor")
export class HuiTileCardFeaturesEditor extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?: HassEntity;

  @property({ attribute: false })
  public features?: LovelaceTileFeatureConfig[];

  @property() public label?: string;

  private _featuresKeys = new WeakMap<LovelaceTileFeatureConfig, string>();

  private _sortable?: SortableInstance;

  public disconnectedCallback() {
    this._destroySortable();
  }

  private _getKey(feature: LovelaceTileFeatureConfig) {
    if (!this._featuresKeys.has(feature)) {
      this._featuresKeys.set(feature, Math.random().toString());
    }

    return this._featuresKeys.get(feature)!;
  }

  private get _supportedFeatureTypes() {
    if (!this.stateObj) return [];

    return FEATURES_TYPE.filter((type) =>
      supportsTileFeature(this.stateObj!, type)
    );
  }

  protected render(): TemplateResult {
    if (!this.features || !this.hass) {
      return html``;
    }

    return html`
      <ha-expansion-panel outlined>
        <h3 slot="header">
          <ha-svg-icon .path=${mdiListBox}></ha-svg-icon>
          ${this.hass!.localize(
            "ui.panel.lovelace.editor.card.tile.features.name"
          )}
        </h3>
        <div class="content">
          ${this._supportedFeatureTypes.length === 0 &&
          this.features.length === 0
            ? html`
                <ha-alert type="info">
                  ${this.hass!.localize(
                    "ui.panel.lovelace.editor.card.tile.features.no_compatible_available"
                  )}
                </ha-alert>
              `
            : null}
          <div class="features">
            ${repeat(
              this.features,
              (featureConf) => this._getKey(featureConf),
              (featureConf, index) => html`
                <div class="feature">
                  <div class="handle">
                    <ha-svg-icon .path=${mdiDrag}></ha-svg-icon>
                  </div>
                  <div class="feature-content">
                    <div>
                      <span>
                        ${this.hass!.localize(
                          `ui.panel.lovelace.editor.card.tile.features.types.${featureConf.type}.label`
                        )}
                      </span>
                      ${this.stateObj &&
                      !supportsTileFeature(this.stateObj, featureConf.type)
                        ? html`<span class="secondary">
                            ${this.hass!.localize(
                              "ui.panel.lovelace.editor.card.tile.features.not_compatible"
                            )}
                          </span>`
                        : null}
                    </div>
                  </div>
                  ${isTileFeatureEditable(featureConf.type)
                    ? html`<ha-icon-button
                        .label=${this.hass!.localize(
                          `ui.panel.lovelace.editor.card.tile.features.edit`
                        )}
                        .path=${mdiPencil}
                        class="edit-icon"
                        .index=${index}
                        @click=${this._editFeature}
                      ></ha-icon-button>`
                    : null}
                  <ha-icon-button
                    .label=${this.hass!.localize(
                      `ui.panel.lovelace.editor.card.tile.features.remove`
                    )}
                    .path=${mdiDelete}
                    class="remove-icon"
                    .index=${index}
                    @click=${this._removeFeature}
                  ></ha-icon-button>
                </div>
              `
            )}
          </div>
          ${this._supportedFeatureTypes.length > 0
            ? html`
                <ha-button-menu
                  fixed
                  @action=${this._addFeature}
                  @closed=${stopPropagation}
                >
                  <mwc-button
                    slot="trigger"
                    outlined
                    .label=${this.hass!.localize(
                      `ui.panel.lovelace.editor.card.tile.features.add`
                    )}
                  >
                    <ha-svg-icon .path=${mdiPlus} slot="icon"></ha-svg-icon>
                  </mwc-button>
                  ${this._supportedFeatureTypes.map(
                    (featureType) => html`<mwc-list-item .value=${featureType}>
                      <ha-svg-icon
                        slot="graphic"
                        .path=${mdiWindowShutter}
                      ></ha-svg-icon>
                      ${this.hass!.localize(
                        `ui.panel.lovelace.editor.card.tile.features.types.${featureType}.label`
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
      this.shadowRoot!.querySelector(".features")!,
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

  private async _addFeature(ev: CustomEvent): Promise<void> {
    const index = ev.detail.index as number;

    if (index == null) return;

    const value = this._supportedFeatureTypes[index];
    const elClass = await getTileFeatureElementClass(value);

    let newFeature: LovelaceTileFeatureConfig;
    if (elClass && elClass.getStubConfig) {
      newFeature = await elClass.getStubConfig(this.hass!, this.stateObj);
    } else {
      newFeature = { type: value } as LovelaceTileFeatureConfig;
    }
    const newConfigFeature = this.features!.concat(newFeature);
    fireEvent(this, "features-changed", { features: newConfigFeature });
  }

  private _rowMoved(ev: SortableEvent): void {
    if (ev.oldIndex === ev.newIndex) {
      return;
    }

    const newFeatures = this.features!.concat();

    newFeatures.splice(ev.newIndex!, 0, newFeatures.splice(ev.oldIndex!, 1)[0]);

    fireEvent(this, "features-changed", { features: newFeatures });
  }

  private _removeFeature(ev: CustomEvent): void {
    const index = (ev.currentTarget as any).index;
    const newfeatures = this.features!.concat();

    newfeatures.splice(index, 1);

    fireEvent(this, "features-changed", { features: newfeatures });
  }

  private _editFeature(ev: CustomEvent): void {
    const index = (ev.currentTarget as any).index;
    fireEvent(this, "edit-detail-element", {
      subElementConfig: {
        index,
        type: "tile-feature",
        elementConfig: this.features![index],
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
        .feature {
          display: flex;
          align-items: center;
        }
        .feature .handle {
          padding-right: 8px;
          cursor: move;
          padding-inline-end: 8px;
          padding-inline-start: initial;
          direction: var(--direction);
        }
        .feature .handle > * {
          pointer-events: none;
        }

        .feature-content {
          height: 60px;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-grow: 1;
        }

        .feature-content div {
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
    "hui-tile-card-features-editor": HuiTileCardFeaturesEditor;
  }
}

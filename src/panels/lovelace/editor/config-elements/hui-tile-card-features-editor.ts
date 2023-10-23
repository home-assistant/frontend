import { mdiDelete, mdiDrag, mdiListBox, mdiPencil, mdiPlus } from "@mdi/js";
import { HassEntity } from "home-assistant-js-websocket";
import { CSSResultGroup, LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import type { SortableEvent } from "sortablejs";
import { fireEvent } from "../../../../common/dom/fire_event";
import { stopPropagation } from "../../../../common/dom/stop_propagation";
import "../../../../components/entity/ha-entity-picker";
import "../../../../components/ha-button";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-list-item";
import "../../../../components/ha-svg-icon";
import {
  CUSTOM_TYPE_PREFIX,
  CustomTileFeatureEntry,
  customTileFeatures,
  isCustomType,
  stripCustomPrefix,
} from "../../../../data/lovelace_custom_cards";
import { sortableStyles } from "../../../../resources/ha-sortable-style";
import type { SortableInstance } from "../../../../resources/sortable";
import { HomeAssistant } from "../../../../types";
import { getTileFeatureElementClass } from "../../create-element/create-tile-feature-element";
import { supportsAlarmModesTileFeature } from "../../tile-features/hui-alarm-modes-tile-feature";
import { supportsClimateHvacModesTileFeature } from "../../tile-features/hui-climate-hvac-modes-tile-feature";
import { supportsCoverOpenCloseTileFeature } from "../../tile-features/hui-cover-open-close-tile-feature";
import { supportsCoverPositionTileFeature } from "../../tile-features/hui-cover-position-tile-feature";
import { supportsCoverTiltPositionTileFeature } from "../../tile-features/hui-cover-tilt-position-tile-feature";
import { supportsCoverTiltTileFeature } from "../../tile-features/hui-cover-tilt-tile-feature";
import { supportsFanSpeedTileFeature } from "../../tile-features/hui-fan-speed-tile-feature";
import { supportsLawnMowerCommandTileFeature } from "../../tile-features/hui-lawn-mower-commands-tile-feature";
import { supportsLightBrightnessTileFeature } from "../../tile-features/hui-light-brightness-tile-feature";
import { supportsLightColorTempTileFeature } from "../../tile-features/hui-light-color-temp-tile-feature";
import { supportsSelectOptionTileFeature } from "../../tile-features/hui-select-options-tile-feature";
import { supportsTargetTemperatureTileFeature } from "../../tile-features/hui-target-temperature-tile-feature";
import { supportsVacuumCommandTileFeature } from "../../tile-features/hui-vacuum-commands-tile-feature";
import { supportsWaterHeaterOperationModesTileFeature } from "../../tile-features/hui-water-heater-operation-modes-tile-feature";
import { LovelaceTileFeatureConfig } from "../../tile-features/types";
import { supportsClimatePresetModesTileFeature } from "../../tile-features/hui-climate-preset-modes-tile-feature";

type FeatureType = LovelaceTileFeatureConfig["type"];
type SupportsFeature = (stateObj: HassEntity) => boolean;

const UI_FEATURE_TYPES = [
  "alarm-modes",
  "climate-hvac-modes",
  "climate-preset-modes",
  "cover-open-close",
  "cover-position",
  "cover-tilt-position",
  "cover-tilt",
  "fan-speed",
  "lawn-mower-commands",
  "light-brightness",
  "light-color-temp",
  "select-options",
  "target-temperature",
  "vacuum-commands",
  "water-heater-operation-modes",
] as const satisfies readonly FeatureType[];

type UiFeatureTypes = (typeof UI_FEATURE_TYPES)[number];

const EDITABLES_FEATURE_TYPES = new Set<UiFeatureTypes>([
  "vacuum-commands",
  "alarm-modes",
  "climate-hvac-modes",
  "water-heater-operation-modes",
  "lawn-mower-commands",
  "climate-preset-modes",
]);

const SUPPORTS_FEATURE_TYPES: Record<
  UiFeatureTypes,
  SupportsFeature | undefined
> = {
  "alarm-modes": supportsAlarmModesTileFeature,
  "climate-hvac-modes": supportsClimateHvacModesTileFeature,
  "climate-preset-modes": supportsClimatePresetModesTileFeature,
  "cover-open-close": supportsCoverOpenCloseTileFeature,
  "cover-position": supportsCoverPositionTileFeature,
  "cover-tilt-position": supportsCoverTiltPositionTileFeature,
  "cover-tilt": supportsCoverTiltTileFeature,
  "fan-speed": supportsFanSpeedTileFeature,
  "lawn-mower-commands": supportsLawnMowerCommandTileFeature,
  "light-brightness": supportsLightBrightnessTileFeature,
  "light-color-temp": supportsLightColorTempTileFeature,
  "target-temperature": supportsTargetTemperatureTileFeature,
  "vacuum-commands": supportsVacuumCommandTileFeature,
  "water-heater-operation-modes": supportsWaterHeaterOperationModesTileFeature,
  "select-options": supportsSelectOptionTileFeature,
};

const CUSTOM_FEATURE_ENTRIES: Record<
  string,
  CustomTileFeatureEntry | undefined
> = {};
customTileFeatures.forEach((feature) => {
  CUSTOM_FEATURE_ENTRIES[feature.type] = feature;
});

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
    super.disconnectedCallback();
    this._destroySortable();
  }

  private _supportsFeatureType(type: string): boolean {
    if (!this.stateObj) return false;

    if (isCustomType(type)) {
      const customType = stripCustomPrefix(type);
      const customFeatureEntry = CUSTOM_FEATURE_ENTRIES[customType];
      if (!customFeatureEntry?.supported) return true;
      try {
        return customFeatureEntry.supported(this.stateObj);
      } catch {
        return false;
      }
    }

    const supportsFeature = SUPPORTS_FEATURE_TYPES[type];
    return !supportsFeature || supportsFeature(this.stateObj);
  }

  private _isFeatureTypeEditable(type: string) {
    if (isCustomType(type)) {
      const customType = stripCustomPrefix(type);
      const customFeatureEntry = CUSTOM_FEATURE_ENTRIES[customType];
      return customFeatureEntry?.configurable;
    }

    return EDITABLES_FEATURE_TYPES.has(type as FeatureType);
  }

  private _getFeatureTypeLabel(type: string) {
    if (isCustomType(type)) {
      const customType = stripCustomPrefix(type);
      const customFeatureEntry = CUSTOM_FEATURE_ENTRIES[customType];
      return customFeatureEntry?.name || type;
    }
    return (
      this.hass!.localize(
        `ui.panel.lovelace.editor.card.tile.features.types.${type}.label`
      ) || type
    );
  }

  private _getKey(feature: LovelaceTileFeatureConfig) {
    if (!this._featuresKeys.has(feature)) {
      this._featuresKeys.set(feature, Math.random().toString());
    }

    return this._featuresKeys.get(feature)!;
  }

  protected firstUpdated() {
    this._createSortable();
  }

  private _getSupportedFeaturesType() {
    const featuresTypes = UI_FEATURE_TYPES as readonly string[];
    const customFeaturesTypes = customTileFeatures.map(
      (feature) => `${CUSTOM_TYPE_PREFIX}${feature.type}`
    );
    return featuresTypes
      .concat(customFeaturesTypes)
      .filter((type) => this._supportsFeatureType(type));
  }

  protected render() {
    if (!this.features || !this.hass) {
      return nothing;
    }

    const supportedFeaturesType = this._getSupportedFeaturesType();

    const types = supportedFeaturesType.filter((type) => !isCustomType(type));
    const customTypes = supportedFeaturesType.filter((type) =>
      isCustomType(type)
    );

    return html`
      <ha-expansion-panel outlined>
        <h3 slot="header">
          <ha-svg-icon .path=${mdiListBox}></ha-svg-icon>
          ${this.hass!.localize(
            "ui.panel.lovelace.editor.card.tile.features.name"
          )}
        </h3>
        <div class="content">
          ${supportedFeaturesType.length === 0 && this.features.length === 0
            ? html`
                <ha-alert type="info">
                  ${this.hass!.localize(
                    "ui.panel.lovelace.editor.card.tile.features.no_compatible_available"
                  )}
                </ha-alert>
              `
            : nothing}
          <div class="features">
            ${repeat(
              this.features,
              (featureConf) => this._getKey(featureConf),
              (featureConf, index) => {
                const type = featureConf.type;
                const supported = this._supportsFeatureType(type);
                const editable = this._isFeatureTypeEditable(type);
                return html`
                  <div class="feature">
                    <div class="handle">
                      <ha-svg-icon .path=${mdiDrag}></ha-svg-icon>
                    </div>
                    <div class="feature-content">
                      <div>
                        <span> ${this._getFeatureTypeLabel(type)} </span>
                        ${this.stateObj && !supported
                          ? html`
                              <span class="secondary">
                                ${this.hass!.localize(
                                  "ui.panel.lovelace.editor.card.tile.features.not_compatible"
                                )}
                              </span>
                            `
                          : nothing}
                      </div>
                    </div>
                    ${editable
                      ? html`
                          <ha-icon-button
                            .label=${this.hass!.localize(
                              `ui.panel.lovelace.editor.card.tile.features.edit`
                            )}
                            .path=${mdiPencil}
                            class="edit-icon"
                            .index=${index}
                            @click=${this._editFeature}
                            .disabled=${!supported}
                          ></ha-icon-button>
                        `
                      : nothing}
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
                `;
              }
            )}
          </div>
          ${supportedFeaturesType.length > 0
            ? html`
                <ha-button-menu
                  fixed
                  @action=${this._addFeature}
                  @closed=${stopPropagation}
                >
                  <ha-button
                    slot="trigger"
                    outlined
                    .label=${this.hass!.localize(
                      `ui.panel.lovelace.editor.card.tile.features.add`
                    )}
                  >
                    <ha-svg-icon .path=${mdiPlus} slot="icon"></ha-svg-icon>
                  </ha-button>
                  ${types.map(
                    (type) => html`
                      <ha-list-item .value=${type}>
                        ${this._getFeatureTypeLabel(type)}
                      </ha-list-item>
                    `
                  )}
                  ${types.length > 0 && customTypes.length > 0
                    ? html`<li divider role="separator"></li>`
                    : nothing}
                  ${customTypes.map(
                    (type) => html`
                      <ha-list-item .value=${type}>
                        ${this._getFeatureTypeLabel(type)}
                      </ha-list-item>
                    `
                  )}
                </ha-button-menu>
              `
            : nothing}
        </div>
      </ha-expansion-panel>
    `;
  }

  private async _createSortable() {
    const Sortable = (await import("../../../../resources/sortable")).default;
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

    const value = this._getSupportedFeaturesType()[index];
    if (!value) return;

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

        li[divider] {
          border-bottom-color: var(--divider-color);
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

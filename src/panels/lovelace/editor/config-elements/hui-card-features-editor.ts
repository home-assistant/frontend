import "@home-assistant/webawesome/dist/components/divider/divider";
import {
  mdiDelete,
  mdiDragHorizontalVariant,
  mdiPencil,
  mdiPlus,
} from "@mdi/js";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-button";
import "../../../../components/ha-dropdown";
import type { HaDropdownSelectEvent } from "../../../../components/ha-dropdown";
import "../../../../components/ha-dropdown-item";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-sortable";
import "../../../../components/ha-svg-icon";
import type { CustomCardFeatureEntry } from "../../../../data/lovelace_custom_cards";
import {
  CUSTOM_TYPE_PREFIX,
  getCustomCardFeatures,
  isCustomType,
  stripCustomPrefix,
} from "../../../../data/lovelace_custom_cards";
import type { HomeAssistant } from "../../../../types";
import type {
  LovelaceCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "../../card-features/types";
import type { UiFeatureType } from "../../card-features/registry";
import {
  SUPPORTS_FEATURE_TYPES,
  UI_FEATURE_TYPES,
} from "../../card-features/registry";
import { getCardFeatureElementClass } from "../../create-element/create-card-feature-element";

export type FeatureType = LovelaceCardFeatureConfig["type"];

const EDITABLES_FEATURE_TYPES = new Set<UiFeatureType>([
  "alarm-modes",
  "area-controls",
  "bar-gauge",
  "button",
  "climate-fan-modes",
  "climate-hvac-modes",
  "climate-preset-modes",
  "climate-swing-modes",
  "climate-swing-horizontal-modes",
  "counter-actions",
  "cover-position-favorite",
  "cover-tilt-favorite",
  "fan-preset-modes",
  "humidifier-modes",
  "lawn-mower-commands",
  "media-player-playback",
  "light-color-favorites",
  "media-player-sound-mode",
  "media-player-source",
  "media-player-volume-buttons",
  "media-player-volume-slider",
  "numeric-input",
  "select-options",
  "trend-graph",
  "update-actions",
  "vacuum-commands",
  "valve-position-favorite",
  "water-heater-operation-modes",
]);

const customCardFeatures = getCustomCardFeatures();

const CUSTOM_FEATURE_ENTRIES: Record<
  string,
  CustomCardFeatureEntry | undefined
> = {};
customCardFeatures.forEach((feature) => {
  CUSTOM_FEATURE_ENTRIES[feature.type] = feature;
});

export const getSupportedFeaturesType = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext,
  featuresTypes?: string[]
) => {
  const filteredFeaturesTypes = UI_FEATURE_TYPES.filter(
    (type) => !featuresTypes || featuresTypes.includes(type)
  ) as string[];

  const customFeaturesTypes = customCardFeatures.map(
    (feature) => `${CUSTOM_TYPE_PREFIX}${feature.type}`
  );
  return filteredFeaturesTypes
    .concat(customFeaturesTypes)
    .filter((type) => supportsFeaturesType(hass, context, type));
};

export const supportsFeaturesType = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext,
  type: string
) => {
  if (isCustomType(type)) {
    const customType = stripCustomPrefix(type);
    const customFeatureEntry = CUSTOM_FEATURE_ENTRIES[customType];

    if (!customFeatureEntry) {
      return false;
    }
    try {
      if (customFeatureEntry.isSupported) {
        return customFeatureEntry.isSupported(hass, context);
      }
      // Fallback to the old supported method
      if (customFeatureEntry.supported) {
        const stateObj = context.entity_id
          ? hass.states[context.entity_id]
          : undefined;
        if (!stateObj) return false;
        return customFeatureEntry.supported(stateObj);
      }
      return true;
    } catch {
      return false;
    }
  }

  const supportsFeature = SUPPORTS_FEATURE_TYPES[type as UiFeatureType];
  return !supportsFeature || supportsFeature(hass, context);
};

declare global {
  interface HASSDomEvents {
    "features-changed": {
      features: LovelaceCardFeatureConfig[];
    };
  }
}

@customElement("hui-card-features-editor")
export class HuiCardFeaturesEditor extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @property({ attribute: false })
  public features?: LovelaceCardFeatureConfig[];

  @property({ attribute: false })
  public featuresTypes?: FeatureType[];

  @property()
  public label?: string;

  private _featuresKeys = new WeakMap<LovelaceCardFeatureConfig, string>();

  private _supportsFeatureType(type: string): boolean {
    if (!this.hass || !this.context) return false;
    return supportsFeaturesType(this.hass, this.context, type);
  }

  private _getSupportedFeaturesType() {
    if (!this.hass || !this.context) return [];
    return getSupportedFeaturesType(
      this.hass,
      this.context,
      this.featuresTypes
    );
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
        `ui.panel.lovelace.editor.features.types.${type}.label`
      ) || type
    );
  }

  private _getKey(feature: LovelaceCardFeatureConfig) {
    if (!this._featuresKeys.has(feature)) {
      this._featuresKeys.set(feature, Math.random().toString());
    }

    return this._featuresKeys.get(feature)!;
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
      ${supportedFeaturesType.length === 0 && this.features.length === 0
        ? html`
            <ha-alert type="info">
              ${this.hass!.localize(
                "ui.panel.lovelace.editor.features.no_compatible_available"
              )}
            </ha-alert>
          `
        : nothing}
      <ha-sortable handle-selector=".handle" @item-moved=${this._featureMoved}>
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
                    <ha-svg-icon
                      .path=${mdiDragHorizontalVariant}
                    ></ha-svg-icon>
                  </div>
                  <div class="feature-content">
                    <div>
                      <span> ${this._getFeatureTypeLabel(type)} </span>
                      ${this.context && !supported
                        ? html`
                            <span class="secondary">
                              ${this.hass!.localize(
                                "ui.panel.lovelace.editor.features.not_compatible"
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
                            `ui.panel.lovelace.editor.features.edit`
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
                      `ui.panel.lovelace.editor.features.remove`
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
      </ha-sortable>
      ${supportedFeaturesType.length > 0
        ? html`
            <ha-dropdown @wa-select=${this._addFeature}>
              <ha-button slot="trigger" appearance="filled" size="small">
                <ha-svg-icon .path=${mdiPlus} slot="start"></ha-svg-icon>
                ${this.hass!.localize(`ui.panel.lovelace.editor.features.add`)}
              </ha-button>
              ${types.map(
                (type) => html`
                  <ha-dropdown-item .value=${type}>
                    ${this._getFeatureTypeLabel(type)}
                  </ha-dropdown-item>
                `
              )}
              ${types.length > 0 && customTypes.length > 0
                ? html`<wa-divider></wa-divider>`
                : nothing}
              ${customTypes.map(
                (type) => html`
                  <ha-dropdown-item .value=${type}>
                    ${this._getFeatureTypeLabel(type)}
                  </ha-dropdown-item>
                `
              )}
            </ha-dropdown>
          `
        : nothing}
    `;
  }

  private async _addFeature(ev: HaDropdownSelectEvent) {
    const value = ev.detail.item.value as FeatureType;
    if (!value) {
      return;
    }

    const elClass = await getCardFeatureElementClass(value);

    let newFeature: LovelaceCardFeatureConfig;
    if (elClass && elClass.getStubConfig) {
      try {
        newFeature = await elClass.getStubConfig(this.hass!, this.context!);
      } catch (_err) {
        const stateObj = this.context!.entity_id
          ? this.hass!.states[this.context!.entity_id]
          : undefined;
        newFeature = await elClass.getStubConfig(this.hass!, stateObj);
      }
    } else {
      newFeature = { type: value } as LovelaceCardFeatureConfig;
    }
    const newConfigFeature = this.features!.concat(newFeature);
    fireEvent(this, "features-changed", { features: newConfigFeature });
  }

  private _featureMoved(ev: CustomEvent): void {
    ev.stopPropagation();
    const { oldIndex, newIndex } = ev.detail;

    const newFeatures = this.features!.concat();

    newFeatures.splice(newIndex, 0, newFeatures.splice(oldIndex, 1)[0]);

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
        type: "feature",
        elementConfig: this.features![index],
      },
    });
  }

  static styles = css`
    :host {
      display: flex !important;
      flex-direction: column;
    }
    ha-dropdown {
      display: inline-block;
      align-self: flex-start;
      margin-top: var(--ha-space-2);
    }
    .feature {
      display: flex;
      align-items: center;
    }
    .feature .handle {
      cursor: move; /* fallback if grab cursor is unsupported */
      cursor: grab;
      padding-right: var(--ha-space-2);
      padding-inline-end: var(--ha-space-2);
      padding-inline-start: initial;
      direction: var(--direction);
    }
    .feature .handle > * {
      pointer-events: none;
    }

    .feature-content {
      height: var(--ha-space-15);
      font-size: var(--ha-font-size-l);
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
      --ha-icon-button-size: var(--ha-space-9);
      color: var(--secondary-text-color);
    }

    .secondary {
      font-size: var(--ha-font-size-s);
      color: var(--secondary-text-color);
    }

    li[divider] {
      border-bottom-color: var(--divider-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-card-features-editor": HuiCardFeaturesEditor;
  }
}

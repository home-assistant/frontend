import { mdiListBox } from "@mdi/js";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import {
  any,
  array,
  assert,
  assign,
  boolean,
  enums,
  object,
  optional,
  string,
  union,
} from "superstruct";
import type { HASSDomEvent } from "../../../../common/dom/fire_event";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import { orderProperties } from "../../../../common/util/order-properties";
import "../../../../components/ha-expansion-panel";
import "../../../../components/ha-form/ha-form";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
import "../../../../components/ha-svg-icon";
import type { HomeAssistant } from "../../../../types";
import type {
  LovelaceCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "../../card-features/types";
import type { TileCardConfig } from "../../cards/types";
import type { LovelaceCardEditor } from "../../types";
import { actionConfigStruct } from "../structs/action-struct";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import { entityNameStruct } from "../structs/entity-name-struct";
import type { EditDetailElementEvent, EditSubElementEvent } from "../types";
import { configElementStyle } from "./config-elements-style";
import {
  tileContentConfigFromForm,
  tileContentFormData,
  tileContentSchema,
} from "./content-schema";
import { getSupportedFeaturesType } from "./hui-card-features-editor";
import { tileInteractionsSchema } from "./interactions-schema";
import { stateContentHasTimestamp } from "../../../../state-display/state-display";
import { timeFormatConfigStruct } from "../../components/types";

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    entity: optional(string()),
    name: optional(entityNameStruct),
    icon: optional(string()),
    color: optional(string()),
    show_entity_picture: optional(boolean()),
    hide_state: optional(boolean()),
    state_content: optional(union([string(), array(string())])),
    vertical: optional(boolean()),
    tap_action: optional(actionConfigStruct),
    hold_action: optional(actionConfigStruct),
    double_tap_action: optional(actionConfigStruct),
    icon_tap_action: optional(actionConfigStruct),
    icon_hold_action: optional(actionConfigStruct),
    icon_double_tap_action: optional(actionConfigStruct),
    features: optional(array(any())),
    features_position: optional(enums(["bottom", "inline"])),
    time_format: optional(timeFormatConfigStruct),
  })
);

export const fieldOrder = Object.keys(cardConfigStruct.schema);

@customElement("hui-tile-card-editor")
export class HuiTileCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: TileCardConfig;

  public setConfig(config: TileCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
  }

  private _featureContext = memoizeOne(
    (entityId?: string): LovelaceCardFeatureContext => ({
      entity_id: entityId,
    })
  );

  private _schema = memoizeOne(
    (
      localize: LocalizeFunc,
      entityId: string | undefined,
      showTimeFormat: boolean
    ) =>
      [
        { name: "entity", selector: { entity: {} } },
        tileContentSchema(localize, showTimeFormat),
        tileInteractionsSchema(entityId),
      ] as const satisfies readonly HaFormSchema[]
  );

  private _featuresSchema = memoizeOne(
    (localize: LocalizeFunc, vertical: boolean) =>
      [
        {
          name: "features_position",
          required: true,
          selector: {
            select: {
              mode: "box",
              options: ["bottom", "inline"].map((value) => ({
                label: localize(
                  `ui.panel.lovelace.editor.card.tile.features_position_options.${value}`
                ),
                description: localize(
                  `ui.panel.lovelace.editor.card.tile.features_position_options.${value}_description`
                ),
                value,
                image: {
                  src: `/static/images/form/tile_features_position_${value}.svg`,
                  src_dark: `/static/images/form/tile_features_position_${value}_dark.svg`,
                  flip_rtl: true,
                },
                disabled: vertical && value === "inline",
              })),
            },
          },
        },
      ] as const satisfies readonly HaFormSchema[]
  );

  private _hasCompatibleFeatures = memoizeOne(
    (context: LovelaceCardFeatureContext) =>
      getSupportedFeaturesType(this.hass!, context).length > 0
  );

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const entityId = this._config!.entity;

    const showTimeFormat =
      !this._config.hide_state &&
      stateContentHasTimestamp(
        entityId,
        this.hass.states[entityId],
        this._config.state_content
      );

    const schema = this._schema(this.hass.localize, entityId, showTimeFormat);

    const vertical = this._config.vertical ?? false;

    const featuresSchema = this._featuresSchema(this.hass.localize, vertical);

    const data = tileContentFormData(this._config);

    // Default features position to bottom and force it to bottom in vertical mode
    if (!data.features_position || vertical) {
      data.features_position = "bottom";
    }

    const featureContext = this._featureContext(entityId);
    const hasCompatibleFeatures = this._hasCompatibleFeatures(featureContext);
    const hasFeatures = (this._config.features?.length ?? 0) > 0;

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${schema}
        .computeLabel=${this._computeLabelCallback}
        .computeHelper=${this._computeHelperCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
      <ha-expansion-panel outlined>
        <ha-svg-icon slot="leading-icon" .path=${mdiListBox}></ha-svg-icon>
        <h3 slot="header">
          ${this.hass!.localize(
            "ui.panel.lovelace.editor.card.generic.features"
          )}
        </h3>
        <div class="content">
          <hui-card-features-editor
            .hass=${this.hass}
            .context=${featureContext}
            .features=${this._config!.features ?? []}
            @features-changed=${this._featuresChanged}
            @edit-detail-element=${this._editDetailElement}
          ></hui-card-features-editor>
          ${
            hasCompatibleFeatures && hasFeatures
              ? html`
                  <ha-form
                    class="features-form"
                    .hass=${this.hass}
                    .data=${data}
                    .schema=${featuresSchema}
                    .computeLabel=${this._computeLabelCallback}
                    .computeHelper=${this._computeHelperCallback}
                    @value-changed=${this._valueChanged}
                  ></ha-form>
                `
              : nothing
          }
        </div>
      </ha-expansion-panel>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    if (!this._config || !this.hass) {
      return;
    }

    const newConfig = ev.detail.value as TileCardConfig;

    let config: TileCardConfig = tileContentConfigFromForm({
      features: this._config.features,
      ...newConfig,
    });

    config = orderProperties(config, fieldOrder);

    fireEvent(this, "config-changed", { config });
  }

  private _featuresChanged(ev: CustomEvent) {
    ev.stopPropagation();
    if (!this._config || !this.hass) {
      return;
    }

    const features = ev.detail.features as LovelaceCardFeatureConfig[];
    const config: TileCardConfig = {
      ...this._config,
      features,
    };

    if (features.length === 0) {
      delete config.features;
    }

    fireEvent(this, "config-changed", { config });
  }

  private _editDetailElement(ev: HASSDomEvent<EditDetailElementEvent>): void {
    const index = ev.detail.subElementConfig.index;
    const config = this._config!.features![index!];
    const featureContext = this._featureContext(this._config!.entity);

    fireEvent(this, "edit-sub-element", {
      config: config,
      saveConfig: (newConfig) => this._updateFeature(index!, newConfig),
      context: featureContext,
      type: "feature",
    } as EditSubElementEvent<
      LovelaceCardFeatureConfig,
      LovelaceCardFeatureContext
    >);
  }

  private _updateFeature(index: number, feature: LovelaceCardFeatureConfig) {
    const features = this._config!.features!.concat();
    features[index] = feature;
    let config = { ...this._config!, features };

    config = orderProperties(config, fieldOrder);

    fireEvent(this, "config-changed", { config });
  }

  private _computeLabelCallback = (
    schema:
      | SchemaUnion<ReturnType<typeof this._schema>>
      | SchemaUnion<ReturnType<typeof this._featuresSchema>>
  ) => {
    switch (schema.name) {
      case "color":
      case "icon_tap_action":
      case "icon_hold_action":
      case "icon_double_tap_action":
      case "show_entity_picture":
      case "hide_state":
      case "state_content":
      case "content_layout":
      case "features_position":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.tile.${schema.name}`
        );
      default:
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.generic.${schema.name}`
        );
    }
  };

  private _computeHelperCallback = (
    schema:
      | SchemaUnion<ReturnType<typeof this._schema>>
      | SchemaUnion<ReturnType<typeof this._featuresSchema>>
  ) => {
    switch (schema.name) {
      case "color":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.tile.${schema.name}_helper`
        );
      case "features_position":
        if (this._config?.vertical) {
          return this.hass!.localize(
            `ui.panel.lovelace.editor.card.tile.${schema.name}_helper_vertical`
          );
        }
        return undefined;
      default:
        return undefined;
    }
  };

  static get styles() {
    return [
      configElementStyle,
      css`
        .container {
          display: flex;
          flex-direction: column;
        }
        ha-form {
          display: block;
          margin-bottom: 24px;
        }
        .info {
          color: var(--secondary-text-color);
          margin-top: 0;
          margin-bottom: 8px;
        }
        .features-form {
          margin-top: var(--ha-space-6);
          margin-bottom: 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-tile-card-editor": HuiTileCardEditor;
  }
}

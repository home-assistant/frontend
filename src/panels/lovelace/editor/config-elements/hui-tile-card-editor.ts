import { mdiGestureTap, mdiListBox, mdiTextShort } from "@mdi/js";
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
import { getEntityDefaultTileIconAction } from "../../cards/hui-tile-card";
import type { TileCardConfig } from "../../cards/types";
import type { LovelaceCardEditor } from "../../types";
import { actionConfigStruct } from "../structs/action-struct";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import type { EditDetailElementEvent, EditSubElementEvent } from "../types";
import { configElementStyle } from "./config-elements-style";
import { getSupportedFeaturesType } from "./hui-card-features-editor";

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    entity: optional(string()),
    name: optional(string()),
    icon: optional(string()),
    hide_state: optional(boolean()),
    state_content: optional(union([string(), array(string())])),
    color: optional(string()),
    show_entity_picture: optional(boolean()),
    vertical: optional(boolean()),
    use_entity_area_name: optional(boolean()),
    tap_action: optional(actionConfigStruct),
    hold_action: optional(actionConfigStruct),
    double_tap_action: optional(actionConfigStruct),
    icon_tap_action: optional(actionConfigStruct),
    icon_hold_action: optional(actionConfigStruct),
    icon_double_tap_action: optional(actionConfigStruct),
    features: optional(array(any())),
    features_position: optional(enums(["bottom", "inline"])),
  })
);

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
      hideState: boolean,
      entityHasArea: boolean,
      useEntityAreaName: boolean
    ) =>
      [
        { name: "entity", selector: { entity: {} } },
        {
          name: "content",
          flatten: true,
          type: "expandable",
          iconPath: mdiTextShort,
          schema: [
            {
              name: "",
              type: "grid",
              schema: [
                {
                  name: "name",
                  selector: { text: {} },
                  disabled: useEntityAreaName,
                },
                {
                  name: "use_entity_area_name",
                  selector: { boolean: {} },
                  disabled: !entityHasArea,
                },
                {
                  name: "icon",
                  selector: {
                    icon: {},
                  },
                  context: { icon_entity: "entity" },
                },
                {
                  name: "color",
                  selector: {
                    ui_color: {
                      default_color: "state",
                      include_state: true,
                    },
                  },
                },
                {
                  name: "show_entity_picture",
                  selector: {
                    boolean: {},
                  },
                },
                {
                  name: "hide_state",
                  selector: {
                    boolean: {},
                  },
                },
              ],
            },
            ...(!hideState
              ? ([
                  {
                    name: "state_content",
                    selector: {
                      ui_state_content: {},
                    },
                    context: {
                      filter_entity: "entity",
                    },
                  },
                ] as const satisfies readonly HaFormSchema[])
              : []),
            {
              name: "content_layout",
              required: true,
              selector: {
                select: {
                  mode: "box",
                  options: ["horizontal", "vertical"].map((value) => ({
                    label: localize(
                      `ui.panel.lovelace.editor.card.tile.content_layout_options.${value}`
                    ),
                    value,
                    image: {
                      src: `/static/images/form/tile_content_layout_${value}.svg`,
                      src_dark: `/static/images/form/tile_content_layout_${value}_dark.svg`,
                      flip_rtl: true,
                    },
                  })),
                },
              },
            },
          ],
        },
        {
          name: "interactions",
          type: "expandable",
          flatten: true,
          iconPath: mdiGestureTap,
          schema: [
            {
              name: "tap_action",
              selector: {
                ui_action: {
                  default_action: "more-info",
                },
              },
            },
            {
              name: "icon_tap_action",
              selector: {
                ui_action: {
                  default_action: entityId
                    ? getEntityDefaultTileIconAction(entityId)
                    : "more-info",
                },
              },
            },
            {
              name: "",
              type: "optional_actions",
              flatten: true,
              schema: (
                [
                  "hold_action",
                  "icon_hold_action",
                  "double_tap_action",
                  "icon_double_tap_action",
                ] as const
              ).map((action) => ({
                name: action,
                selector: {
                  ui_action: {
                    default_action: "none" as const,
                  },
                },
              })),
            },
          ],
        },
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

  private _entityHasArea(entityId: string | undefined): boolean {
    if (!entityId || !this.hass) {
      return false;
    }

    const entityRegistry = this.hass.entities[entityId];

    // Check if entity has direct area assignment
    if (entityRegistry?.area_id) {
      return true;
    }

    // Check if entity has a device and that device has an area
    if (entityRegistry?.device_id) {
      const device = this.hass.devices[entityRegistry.device_id];
      if (device?.area_id) {
        return true;
      }
    }

    return false;
  }

  private _getEntityAreaId(entityId: string): string | null {
    if (!entityId || !this.hass) {
      return null;
    }

    const entityRegistry = this.hass.entities[entityId];

    // Check if entity has direct area assignment
    if (entityRegistry?.area_id) {
      return entityRegistry.area_id;
    }

    // Check if entity has a device and that device has an area
    if (entityRegistry?.device_id) {
      const device = this.hass.devices[entityRegistry.device_id];
      if (device?.area_id) {
        return device.area_id;
      }
    }

    return null;
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const entityId = this._config!.entity;
    const entityHasArea = this._entityHasArea(entityId);

    const schema = this._schema(
      this.hass.localize,
      entityId,
      this._config.hide_state ?? false,
      entityHasArea,
      this._config.use_entity_area_name ?? false
    );

    const featuresSchema = this._featuresSchema(
      this.hass.localize,
      this._config.vertical ?? false
    );

    const data = {
      ...this._config,
      content_layout: this._config.vertical ? "vertical" : "horizontal",
    };

    // Default features position to bottom and force it to bottom in vertical mode
    if (!data.features_position || data.vertical) {
      data.features_position = "bottom";
    }

    const featureContext = this._featureContext(entityId);
    const hasCompatibleFeatures = this._hasCompatibleFeatures(featureContext);

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
          ${hasCompatibleFeatures
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
            : nothing}
          <hui-card-features-editor
            .hass=${this.hass}
            .context=${featureContext}
            .features=${this._config!.features ?? []}
            @features-changed=${this._featuresChanged}
            @edit-detail-element=${this._editDetailElement}
          ></hui-card-features-editor>
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

    const config: TileCardConfig = {
      features: this._config.features,
      ...newConfig,
    };

    if (config.hide_state) {
      delete config.state_content;
    }

    if (!config.state_content) {
      delete config.state_content;
    }

    // Convert content_layout to vertical
    if (config.content_layout) {
      config.vertical = config.content_layout === "vertical";
      delete config.content_layout;
    }

    // Handle use_entity_area_name functionality
    if (config.use_entity_area_name && config.entity) {
      const areaId = this._getEntityAreaId(config.entity);
      if (areaId) {
        const area = this.hass.areas[areaId];
        if (area) {
          config.name = area.name;
        }
      }
    } else if (config.use_entity_area_name === false) {
      // When switching off, remove the name if it was set by the area
      delete config.name;
    }

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
    const config = { ...this._config!, features };
    fireEvent(this, "config-changed", {
      config: config,
    });
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
      case "use_entity_area_name":
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
          margin-bottom: 8px;
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

import { mdiGestureTap, mdiListBox, mdiTextShort } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
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
} from "superstruct";
import {
  fireEvent,
  type HASSDomEvent,
} from "../../../../common/dom/fire_event";
import { generateEntityFilter } from "../../../../common/entity/entity_filter";
import { caseInsensitiveStringCompare } from "../../../../common/string/compare";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-form/ha-form";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
import type { SelectOption } from "../../../../data/selector";
import { getSensorNumericDeviceClasses } from "../../../../data/sensor";
import type { HomeAssistant } from "../../../../types";
import type {
  LovelaceCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "../../card-features/types";
import {
  DEVICE_CLASSES,
  type AreaCardFeatureContext,
} from "../../cards/hui-area-card";
import type { AreaCardConfig } from "../../cards/types";
import type { LovelaceCardEditor } from "../../types";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import type { EditDetailElementEvent, EditSubElementEvent } from "../types";
import { configElementStyle } from "./config-elements-style";
import { getSupportedFeaturesType } from "./hui-card-features-editor";

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    area: optional(string()),
    name: optional(string()),
    color: optional(string()),
    navigation_path: optional(string()),
    show_camera: optional(boolean()),
    display_type: optional(enums(["compact", "icon", "picture", "camera"])),
    camera_view: optional(string()),
    alert_classes: optional(array(string())),
    sensor_classes: optional(array(string())),
    features: optional(array(any())),
    features_position: optional(enums(["bottom", "inline"])),
    aspect_ratio: optional(string()),
    exclude_entities: optional(array(string())),
  })
);

@customElement("hui-area-card-editor")
export class HuiAreaCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: AreaCardConfig;

  @state() private _numericDeviceClasses?: string[];

  @state() private _featureContext: AreaCardFeatureContext = {};

  private _schema = memoizeOne(
    (
      localize: LocalizeFunc,
      showCamera: boolean,
      binaryClasses: SelectOption[],
      sensorClasses: SelectOption[]
    ) =>
      [
        { name: "area", selector: { area: {} } },
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
                { name: "name", selector: { text: {} } },
                { name: "color", selector: { ui_color: {} } },
                {
                  name: "display_type",
                  required: true,
                  selector: {
                    select: {
                      options: ["compact", "icon", "picture", "camera"].map(
                        (value) => ({
                          value,
                          label: localize(
                            `ui.panel.lovelace.editor.card.area.display_type_options.${value}`
                          ),
                        })
                      ),
                      mode: "dropdown",
                    },
                  },
                },
                ...(showCamera
                  ? ([
                      {
                        name: "camera_view",
                        selector: {
                          select: {
                            options: ["auto", "live"].map((value) => ({
                              value,
                              label: localize(
                                `ui.panel.lovelace.editor.card.generic.camera_view_options.${value}`
                              ),
                            })),
                            mode: "dropdown",
                          },
                        },
                      },
                    ] as const satisfies readonly HaFormSchema[])
                  : []),
              ],
            },
            {
              name: "alert_classes",
              selector: {
                select: {
                  reorder: true,
                  multiple: true,
                  custom_value: true,
                  options: binaryClasses,
                },
              },
            },
            {
              name: "sensor_classes",
              selector: {
                select: {
                  reorder: true,
                  multiple: true,
                  custom_value: true,
                  options: sensorClasses,
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
              name: "navigation_path",
              required: false,
              selector: { navigation: {} },
            },
          ],
        },
      ] as const satisfies readonly HaFormSchema[]
  );

  private _binaryClassesForArea = memoizeOne(
    (
      area: string | undefined,
      excludeEntities: string[] | undefined
    ): string[] => {
      if (!area) {
        return [];
      }

      const binarySensorFilter = generateEntityFilter(this.hass!, {
        domain: "binary_sensor",
        area,
        entity_category: "none",
      });

      const classes = Object.keys(this.hass!.entities)
        .filter(
          (id) => binarySensorFilter(id) && !excludeEntities?.includes(id)
        )
        .map((id) => this.hass!.states[id]?.attributes.device_class)
        .filter((c): c is string => Boolean(c));

      return [...new Set(classes)];
    }
  );

  private _sensorClassesForArea = memoizeOne(
    (
      area: string | undefined,
      excludeEntities: string[] | undefined,
      numericDeviceClasses: string[] | undefined
    ): string[] => {
      if (!area) {
        return [];
      }

      const sensorFilter = generateEntityFilter(this.hass!, {
        domain: "sensor",
        area,
        device_class: numericDeviceClasses,
        entity_category: "none",
      });

      const classes = Object.keys(this.hass!.entities)
        .filter((id) => sensorFilter(id) && !excludeEntities?.includes(id))
        .map((id) => this.hass!.states[id]?.attributes.device_class)
        .filter((c): c is string => Boolean(c));

      return [...new Set(classes)];
    }
  );

  private _buildBinaryOptions = memoizeOne(
    (possibleClasses: string[], currentClasses: string[]): SelectOption[] =>
      this._buildOptions("binary_sensor", possibleClasses, currentClasses)
  );

  private _buildSensorOptions = memoizeOne(
    (possibleClasses: string[], currentClasses: string[]): SelectOption[] =>
      this._buildOptions("sensor", possibleClasses, currentClasses)
  );

  private _buildOptions(
    domain: "sensor" | "binary_sensor",
    possibleClasses: string[],
    currentClasses: string[]
  ): SelectOption[] {
    const options = [...new Set([...possibleClasses, ...currentClasses])].map(
      (deviceClass) => ({
        value: deviceClass,
        label:
          this.hass!.localize(
            `component.${domain}.entity_component.${deviceClass}.name`
          ) || deviceClass,
      })
    );
    options.sort((a, b) =>
      caseInsensitiveStringCompare(a.label, b.label, this.hass!.locale.language)
    );

    return options;
  }

  public setConfig(config: AreaCardConfig): void {
    assert(config, cardConfigStruct);

    const displayType =
      config.display_type || (config.show_camera ? "camera" : "picture");
    this._config = {
      ...config,
      display_type: displayType,
    };
    delete this._config.show_camera;

    this._featureContext = {
      area_id: config.area,
      exclude_entities: config.exclude_entities,
    };
  }

  protected async updated() {
    if (this.hass && !this._numericDeviceClasses) {
      const { numeric_device_classes: sensorNumericDeviceClasses } =
        await getSensorNumericDeviceClasses(this.hass);
      this._numericDeviceClasses = sensorNumericDeviceClasses;
    }
  }

  private _featuresSchema = memoizeOne(
    (localize: LocalizeFunc) =>
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

    const possibleBinaryClasses = this._binaryClassesForArea(
      this._config.area,
      this._config.exclude_entities
    );
    const possibleSensorClasses = this._sensorClassesForArea(
      this._config.area,
      this._config.exclude_entities,
      this._numericDeviceClasses
    );
    const binarySelectOptions = this._buildBinaryOptions(
      possibleBinaryClasses,
      this._config.alert_classes || DEVICE_CLASSES.binary_sensor
    );
    const sensorSelectOptions = this._buildSensorOptions(
      possibleSensorClasses,
      this._config.sensor_classes || DEVICE_CLASSES.sensor
    );

    const showCamera = this._config.display_type === "camera";

    const displayType =
      this._config.display_type || this._config.show_camera
        ? "camera"
        : "picture";

    const schema = this._schema(
      this.hass.localize,
      showCamera,
      binarySelectOptions,
      sensorSelectOptions
    );

    const featuresSchema = this._featuresSchema(this.hass.localize);

    const data = {
      camera_view: "auto",
      alert_classes: DEVICE_CLASSES.binary_sensor,
      sensor_classes: DEVICE_CLASSES.sensor,
      features_position: "bottom",
      display_type: displayType,
      ...this._config,
    };

    const hasCompatibleFeatures = this._hasCompatibleFeatures(
      this._featureContext
    );

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
                  @value-changed=${this._valueChanged}
                ></ha-form>
              `
            : nothing}
          <hui-card-features-editor
            .hass=${this.hass}
            .context=${this._featureContext}
            .features=${this._config!.features ?? []}
            @features-changed=${this._featuresChanged}
            @edit-detail-element=${this._editDetailElement}
          ></hui-card-features-editor>
        </div>
      </ha-expansion-panel>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    const newConfig = ev.detail.value as AreaCardConfig;

    const config: AreaCardConfig = {
      features: this._config!.features,
      ...newConfig,
    };

    if (config.display_type !== "camera") {
      delete config.camera_view;
    }

    fireEvent(this, "config-changed", { config });
  }

  private _featuresChanged(ev: CustomEvent) {
    ev.stopPropagation();
    if (!this._config || !this.hass) {
      return;
    }

    const features = ev.detail.features as LovelaceCardFeatureConfig[];
    const config: AreaCardConfig = {
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

    fireEvent(this, "edit-sub-element", {
      config: config,
      saveConfig: (newConfig) => this._updateFeature(index!, newConfig),
      context: this._featureContext,
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

  private _computeHelperCallback = (
    schema:
      | SchemaUnion<ReturnType<typeof this._schema>>
      | SchemaUnion<ReturnType<typeof this._featuresSchema>>
  ): string | undefined => {
    switch (schema.name) {
      case "alert_classes":
        if (this._config?.display_type === "compact") {
          return this.hass!.localize(
            `ui.panel.lovelace.editor.card.area.alert_classes_helper`
          );
        }
        return undefined;
      default:
        return undefined;
    }
  };

  private _computeLabelCallback = (
    schema:
      | SchemaUnion<ReturnType<typeof this._schema>>
      | SchemaUnion<ReturnType<typeof this._featuresSchema>>
  ) => {
    switch (schema.name) {
      case "area":
        return this.hass!.localize("ui.panel.lovelace.editor.card.area.name");
      case "name":
      case "camera_view":
      case "content":
      case "interactions":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.generic.${schema.name}`
        );
      case "navigation_path":
        return this.hass!.localize(
          "ui.panel.lovelace.editor.action-editor.navigation_path"
        );
      case "features_position":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.tile.${schema.name}`
        );
    }
    return this.hass!.localize(
      `ui.panel.lovelace.editor.card.area.${schema.name}`
    );
  };

  static get styles() {
    return [
      configElementStyle,
      css`
        ha-form {
          display: block;
          margin-bottom: 24px;
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
    "hui-area-card-editor": HuiAreaCardEditor;
  }
}

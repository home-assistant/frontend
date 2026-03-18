import { mdiPalette } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import {
  any,
  array,
  assert,
  assign,
  boolean,
  number,
  object,
  optional,
  string,
  union,
} from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import { computeDomain } from "../../../../common/entity/compute_domain";
import { hasLocation } from "../../../../common/entity/has_location";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import { orderProperties } from "../../../../common/util/order-properties";
import "../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import { MAP_CARD_MARKER_LABEL_MODES } from "../../../../components/ha-map"
import "../../../../components/ha-formfield";
import "../../../../components/ha-selector/ha-selector-select";
import "../../../../components/ha-switch";
import type { SelectSelector } from "../../../../data/selector";
import {
  type HomeAssistant,
  type ValueChangedEvent,
  THEME_MODES,
} from "../../../../types";
import { DEFAULT_HOURS_TO_SHOW, DEFAULT_ZOOM } from "../../cards/hui-map-card";
import {
  type MapCardConfig,
  type MapEntityConfig,
} from "../../cards/types";
import "../../components/hui-entity-editor";
import "../hui-sub-element-editor";
import type {
  EditDetailElementEvent,
  SubElementEditorConfig,
  EntitiesEditorEvent,
} from "../types";
import type { HASSDomEvent } from "../../../../common/dom/fire_event";
import type { LovelaceCardEditor } from "../../types";
import { processEditorEntities } from "../process-editor-entities";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import { configElementStyle } from "./config-elements-style";

export const mapEntitiesConfigStruct = union([
  object({
    entity: string(),
    name: optional(string()),
    label_mode: optional(string()),
    attribute: optional(string()),
    unit: optional(string()),
    focus: optional(boolean()),
    color: optional(string()),
  }),
  string(),
]);

const geoSourcesConfigStruct = union([
  object({
    source: string(),
    label_mode: optional(string()),
    attribute: optional(string()),
    unit: optional(string()),
    focus: optional(boolean()),
  }),
  string(),
]);

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    title: optional(string()),
    show_all: optional(boolean()),
    entities: optional(array(mapEntitiesConfigStruct)),
    geo_location_sources: optional(array(geoSourcesConfigStruct)),
    hours_to_show: optional(number()),
    aspect_ratio: optional(string()),
    default_zoom: optional(number()),
    auto_fit: optional(boolean()),
    fit_zones: optional(boolean()),
    cluster: optional(boolean()),
    dark_mode: optional(boolean()), // legacy option
    theme_mode: optional(string()),
    conditions: optional(any()),
  })
);

@customElement("hui-map-card-editor")
export class HuiMapCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: MapCardConfig;

  @state() private _subElementEditorConfig?: SubElementEditorConfig;

  private _disabledOptions = (entityId: string) =>
    computeDomain(entityId) === "zone";

  @state() private _possibleGeoSources?: { value: string; label?: string }[];

  private _locationEntities: string[] = [];

  private _schema = memoizeOne(
    (localize: LocalizeFunc) =>
      [
        { name: "title", selector: { text: {} } },
        {
          name: "",
          type: "expandable",
          iconPath: mdiPalette,
          title: localize(`ui.panel.lovelace.editor.card.map.appearance`),
          schema: [
            {
              name: "",
              type: "grid",
              schema: [
                { name: "aspect_ratio", selector: { text: {} } },
                {
                  name: "default_zoom",
                  default: DEFAULT_ZOOM,
                  selector: { number: { mode: "box", min: 0 } },
                },
                {
                  name: "theme_mode",
                  selector: {
                    select: {
                      mode: "dropdown",
                      options: THEME_MODES.map((themeMode) => ({
                        value: themeMode,
                        label: localize(
                          `ui.panel.lovelace.editor.card.map.theme_modes.${themeMode}`
                        ),
                      })),
                    },
                  },
                },
                {
                  name: "hours_to_show",
                  default: DEFAULT_HOURS_TO_SHOW,
                  selector: { number: { mode: "box", min: 0 } },
                },
                { name: "auto_fit", selector: { boolean: {} } },
                { name: "fit_zones", selector: { boolean: {} } },
                { name: "cluster", default: true, selector: { boolean: {} } },
              ],
            },
          ],
        },
        { name: "show_all", selector: { boolean: {} } },
      ] as const
  );

  private _subSchema = memoizeOne(
    (localize: LocalizeFunc, entityId: string, includeEntities: string[]) =>
      [
        {
          name: "entity",
          selector: {
            entity: {
              include_entities: includeEntities,
            },
          },
          required: true,
        },
        { name: "name", selector: { text: {} } },
        {
          name: "color",
          disabled: this._disabledOptions(entityId),
          selector: { ui_color: {} },
        },
        {
          name: "",
          type: "grid",
          schema: [
            {
              name: "label_mode",
              disabled: this._disabledOptions(entityId),
              selector: {
                select: {
                  mode: "dropdown",
                  options: MAP_CARD_MARKER_LABEL_MODES.map((labelMode) => ({
                    value: labelMode,
                    label: localize(
                      `ui.panel.lovelace.editor.card.map.label_modes.${labelMode}`
                    ),
                  })),
                },
              },
            },
            {
              name: "attribute",
              disabled: this._disabledOptions(entityId),
              selector: {
                attribute: {
                  entity_id: entityId,
                  hide_attributes: ["entity_picture", "friendly_name", "icon"],
                },
              },
            },
            {
              name: "unit",
              disabled: this._disabledOptions(entityId),
              selector: { text: {} },
            },
            { name: "focus", default: true, selector: { boolean: {} } },
          ],
        },
      ] as const
  );

  public setConfig(config: MapCardConfig): void {
    assert(config, cardConfigStruct);

    // Migrate legacy dark_mode to theme_mode
    if (!this._config && !("theme_mode" in config)) {
      config = { ...config };
      if (config.dark_mode) {
        config.theme_mode = "dark";
      } else {
        config.theme_mode = "auto";
      }
      delete config.dark_mode;
      fireEvent(this, "config-changed", { config: config });
    }

    this._config = config;
  }

  private _geoSourcesStrings = memoizeOne((sources): string[] | undefined =>
    sources?.map((s) => (typeof s === "string" ? s : s.source))
  );

  get _geo_location_sources(): string[] {
    return this._geoSourcesStrings(this._config!.geo_location_sources) || [];
  }

  protected firstUpdated(changedProperties) {
    super.firstUpdated(changedProperties);
    this._locationEntities = !this.hass
      ? []
      : Object.keys(this.hass!.states).filter((entity_id) =>
          hasLocation(this.hass!.states[entity_id])
        );
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    if (this._subElementEditorConfig) {
      const entityId = (
        this._subElementEditorConfig.elementConfig! as { entity: string }
      ).entity;
      return html`
        <hui-sub-element-editor
          .hass=${this.hass}
          .config=${this._subElementEditorConfig}
          .schema=${this._subSchema(
            this.hass.localize,
            entityId,
            this._locationEntities
          )}
          @go-back=${this._goBack}
          @config-changed=${this._handleSubEntityChanged}
        >
        </hui-sub-element-editor>
      `;
    }

    const configEntities = this._config.entities
      ? (processEditorEntities(this._config.entities) as MapEntityConfig[])
      : [];
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${this._schema(this.hass.localize)}
        .computeLabel=${this._computeLabelCallback}
        .computeHelper=${this._computeHelperCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>

      <hui-entity-editor
        .hass=${this.hass}
        .entities=${configEntities}
        .entityFilter=${hasLocation}
        can-edit
        .required=${!this._config.show_all}
        @entities-changed=${this._entitiesValueChanged}
        @edit-detail-element=${this._editDetailElement}
      ></hui-entity-editor>

      <h3>
        ${this.hass.localize(
          "ui.panel.lovelace.editor.card.map.geo_location_sources"
        )}
      </h3>

      <ha-selector-select
        .label=${this.hass.localize("ui.panel.lovelace.editor.card.map.source")}
        .required=${false}
        .hass=${this.hass}
        .value=${this._geo_location_sources}
        @value-changed=${this._geoSourcesChanged}
        .selector=${this._selectSchema(
          this._possibleGeoSources,
          this.hass.localize
        )}
      ></ha-selector-select>
    `;
  }

  private _goBack(): void {
    this._subElementEditorConfig = undefined;
  }

  private _editDetailElement(ev: HASSDomEvent<EditDetailElementEvent>): void {
    this._subElementEditorConfig = ev.detail.subElementConfig;
  }

  private _handleSubEntityChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    // get updated entity config
    let newEntityConfig = ev.detail.config as MapEntityConfig;
    const entityId = newEntityConfig.entity;
    if (this._disabledOptions(entityId)) {
      // remove unused "color", "label_mode" etc options
      newEntityConfig = this._deleteOptions(newEntityConfig);
    }

    // update card config with updated entity config
    const index = this._subElementEditorConfig!.index!;
    const newEntities = [...this._config!.entities!];
    newEntities[index] = newEntityConfig;
    let config = this._config!;
    config = { ...config, entities: newEntities };
    this._config = this._orderProperties(config);

    // update sub-element editor config
    this._subElementEditorConfig = {
      ...this._subElementEditorConfig!,
      elementConfig: {
        ...(this._config!.entities![index] as MapEntityConfig),
      },
    };

    fireEvent(this, "config-changed", { config: this._config });
  }

  private _selectSchema = memoizeOne(
    (options, localize: LocalizeFunc): SelectSelector => ({
      select: {
        sort: true,
        multiple: true,
        custom_value: true,
        options: options.length
          ? options
          : [
              {
                value: "",
                label: localize(
                  "ui.panel.lovelace.editor.card.map.no_geo_location_sources"
                ),
              },
            ],
      },
    })
  );

  private _entitiesValueChanged(
    ev: EntitiesEditorEvent<MapEntityConfig>
  ): void {
    if (ev.detail && ev.detail.entities) {
      if (ev.detail.entities.length || !this._config!.show_all) {
        this._config = { ...this._config!, entities: ev.detail.entities };
      } else if (this._config!.entities) {
        const { entities: _, ...rest } = this._config!;
        this._config = rest as MapCardConfig;
      }
      const config = this._orderProperties(this._config!);
      fireEvent(this, "config-changed", { config: config });
    }
  }

  private _geoSourcesChanged(ev: ValueChangedEvent<any>): void {
    if (!this._config || !this.hass) {
      return;
    }

    const value = ev.detail.value;

    if (this._geo_location_sources === value) {
      return;
    }

    if (value === "") {
      this._config = { ...this._config };
      delete this._config.geo_location_sources;
    } else {
      const newSources = value.map(
        (newSource) =>
          this._config!.geo_location_sources?.find(
            (oldSource) =>
              typeof oldSource === "object" && oldSource.source === newSource
          ) || newSource
      );
      this._config = {
        ...this._config,
        geo_location_sources: newSources,
      };
    }
    const config = this._orderProperties(this._config);
    fireEvent(this, "config-changed", { config: config });
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    let config = { ...ev.detail.value };
    if (config.show_all && config.entities?.length === 0) {
      delete config.entities;
    }
    config = this._orderProperties(config);
    fireEvent(this, "config-changed", { config });
  }

  protected willUpdate() {
    if (this.hass && !this._possibleGeoSources) {
      const sources: Record<string, string> = {};
      Object.entries(this.hass.states).forEach(([entity_id, stateObj]) => {
        const domain = computeDomain(entity_id);
        if (domain === "geo_location" && stateObj.attributes.source) {
          sources[stateObj.attributes.source] = stateObj.attributes.attribution;
        }
      });

      this._possibleGeoSources = Object.entries(sources).map(
        ([source, attribution]) => ({
          value: source,
          label: attribution || source,
        })
      );
    }
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    switch (schema.name) {
      case "theme_mode":
      case "default_zoom":
      case "auto_fit":
      case "fit_zones":
      case "cluster":
      case "show_all":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.map.${schema.name}`
        );
      default:
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.generic.${schema.name}`
        );
    }
  };

  private _computeHelperCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    switch (schema.name) {
      case "show_all":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.map.${schema.name}_helper`
        );
      default:
        return undefined;
    }
  };

  // remove "label_mode", "attribute" & "unit" options when needed
  private _deleteOptions(config: MapEntityConfig): MapEntityConfig {
    const { color, label_mode, attribute, unit, ...rest } = config;
    return rest as MapEntityConfig;
  }

  // normalize a generated yaml code by placing lines in a consistent order
  private _orderProperties(config: MapCardConfig): MapCardConfig {
    const fieldOrderCard = Object.keys(cardConfigStruct.schema);
    const fieldOrderEntity = [
      // ideally should be taken from a schema
      "entity",
      "name",
      "color",
      "label_mode",
      "attribute",
      "unit",
      "focus",
    ];
    const fieldOrderGeoSource = [
      // ideally should be taken from a schema
      "source",
      "label_mode",
      "attribute",
      "unit",
      "focus",
    ];

    // normalize card's options
    let orderedConfig = { ...orderProperties(config, fieldOrderCard) };

    // normalize entities' & geosources' options
    const orders = {
      entities: fieldOrderEntity,
      geo_location_sources: fieldOrderGeoSource,
    };
    Object.entries(orders).forEach(([key, value]) => {
      let orderedCfg;
      if (config[key]) {
        orderedCfg = config[key].map((entry: MapEntityConfig | string) =>
          typeof entry !== "string" ? orderProperties(entry, value) : entry
        );
      }
      if (orderedCfg) {
        orderedConfig = { ...orderedConfig, ...{ [key]: orderedCfg } };
      }
    });

    return orderedConfig;
  }

  static get styles(): CSSResultGroup {
    return [configElementStyle, css``];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-map-card-editor": HuiMapCardEditor;
  }
}

import { mdiPalette } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import {
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
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import { hasLocation } from "../../../../common/entity/has_location";
import { computeDomain } from "../../../../common/entity/compute_domain";
import "../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import type { SelectSelector } from "../../../../data/selector";
import "../../../../components/ha-formfield";
import "../../../../components/ha-switch";
import "../../../../components/ha-selector/ha-selector-select";
import type { HomeAssistant, ValueChangedEvent } from "../../../../types";
import { DEFAULT_HOURS_TO_SHOW, DEFAULT_ZOOM } from "../../cards/hui-map-card";
import type { MapCardConfig } from "../../cards/types";
import "../../components/hui-entity-editor";
import type { EntityConfig } from "../../entity-rows/types";
import type { LovelaceCardEditor } from "../../types";
import { processEditorEntities } from "../process-editor-entities";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import type { EntitiesEditorEvent } from "../types";
import { configElementStyle } from "./config-elements-style";
import type { LocalizeFunc } from "../../../../common/translations/localize";

export const mapEntitiesConfigStruct = union([
  object({
    entity: string(),
    label_mode: optional(string()),
    attribute: optional(string()),
    focus: optional(boolean()),
    name: optional(string()),
  }),
  string(),
]);

const geoSourcesConfigStruct = union([
  object({
    source: string(),
    label_mode: optional(string()),
    attribute: optional(string()),
    focus: optional(boolean()),
  }),
  string(),
]);

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    title: optional(string()),
    aspect_ratio: optional(string()),
    default_zoom: optional(number()),
    dark_mode: optional(boolean()),
    entities: optional(array(mapEntitiesConfigStruct)),
    hours_to_show: optional(number()),
    geo_location_sources: optional(array(geoSourcesConfigStruct)),
    auto_fit: optional(boolean()),
    fit_zones: optional(boolean()),
    theme_mode: optional(string()),
  })
);

const themeModes = ["auto", "light", "dark"] as const;

@customElement("hui-map-card-editor")
export class HuiMapCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: MapCardConfig;

  @state() private _configEntities?: EntityConfig[];

  @state() private _possibleGeoSources?: { value: string; label?: string }[];

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
                  default: "auto",
                  selector: {
                    select: {
                      mode: "dropdown",
                      options: themeModes.map((themeMode) => ({
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
              ],
            },
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
    this._configEntities = config.entities
      ? processEditorEntities(config.entities)
      : [];
  }

  private _geoSourcesStrings = memoizeOne((sources): string[] | undefined =>
    sources?.map((s) => (typeof s === "string" ? s : s.source))
  );

  get _geo_location_sources(): string[] {
    return this._geoSourcesStrings(this._config!.geo_location_sources) || [];
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${this._schema(this.hass.localize)}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>

      <hui-entity-editor
        .hass=${this.hass}
        .entities=${this._configEntities}
        .entityFilter=${hasLocation}
        @entities-changed=${this._entitiesValueChanged}
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

  private _entitiesValueChanged(ev: EntitiesEditorEvent): void {
    if (ev.detail && ev.detail.entities) {
      this._config = { ...this._config!, entities: ev.detail.entities };

      this._configEntities = processEditorEntities(this._config.entities || []);
      fireEvent(this, "config-changed", { config: this._config! });
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
    fireEvent(this, "config-changed", { config: this._config });
  }

  private _valueChanged(ev: CustomEvent): void {
    fireEvent(this, "config-changed", { config: ev.detail.value });
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
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.map.${schema.name}`
        );
      case "default_zoom":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.map.${schema.name}`
        );
      default:
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.generic.${schema.name}`
        );
    }
  };

  static get styles(): CSSResultGroup {
    return [configElementStyle, css``];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-map-card-editor": HuiMapCardEditor;
  }
}

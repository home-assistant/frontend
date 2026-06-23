import type { HassServiceTarget } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import {
  array,
  assert,
  assign,
  enums,
  number,
  object,
  optional,
  string,
} from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/entity/ha-entities-picker";
import "../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import "../../../../components/ha-target-picker";
import type { HaEntityPickerEntityFilterFunc } from "../../../../data/entity/entity";
import { filterLogbookCompatibleEntities } from "../../../../data/logbook";
import { targetStruct } from "../../../../data/script";
import { resolveEntityIDs } from "../../../../data/selector";
import type { HomeAssistant } from "../../../../types";
import { DEFAULT_HOURS_TO_SHOW } from "../../cards/hui-logbook-card";
import type { LogbookCardConfig } from "../../cards/types";
import type { LovelaceCardEditor } from "../../types";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    entities: optional(array(string())),
    title: optional(string()),
    hours_to_show: optional(number()),
    theme: optional(string()),
    target: optional(targetStruct),
    state_filter: optional(array(string())),
    name_detail: optional(enums(["auto", "none", "entity", "device", "area"])),
  })
);

const NAME_DETAILS = ["auto", "none", "entity", "device", "area"] as const;

@customElement("hui-logbook-card-editor")
export class HuiLogbookCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: LogbookCardConfig;

  private _schema = memoizeOne(
    (localize: HomeAssistant["localize"]) =>
      [
        { name: "title", selector: { text: {} } },
        {
          name: "",
          type: "grid",
          schema: [
            { name: "theme", selector: { theme: {} } },
            {
              name: "hours_to_show",
              default: DEFAULT_HOURS_TO_SHOW,
              selector: { number: { mode: "box", min: 1 } },
            },
          ],
        },
        {
          name: "name_detail",
          required: true,
          selector: {
            select: {
              mode: "dropdown",
              options: NAME_DETAILS.map((value) => ({
                value,
                label: localize(
                  `ui.panel.lovelace.editor.card.logbook.name_detail_options.${value}`
                ),
              })),
            },
          },
        },
        {
          name: "state_filter",
          context: { filter_entity: "context_entities" },
          selector: { state: { multiple: true } },
        },
      ] as const
  );

  public setConfig(config: LogbookCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
  }

  get _targetPicker(): HassServiceTarget {
    const entities = this._config!.entities || [];
    if (this._config!.entities) {
      this._config = {
        ...this._config!,
        entities: undefined,
        target: { entity_id: entities },
      };
    }
    return (
      this._config!.target || {
        entity_id: entities,
      }
    );
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._data(
          this._config,
          this._targetPicker,
          this.hass.entities,
          this.hass.devices,
          this.hass.areas
        )}
        .schema=${this._schema(this.hass.localize)}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>

      <ha-target-picker
        .hass=${this.hass}
        .entityFilter=${this._filterFunc}
        .value=${this._targetPicker}
        @value-changed=${this._entitiesChanged}
      ></ha-target-picker>
    `;
  }

  private _data = memoizeOne(
    (
      config: LogbookCardConfig,
      target: HassServiceTarget,
      entities: HomeAssistant["entities"],
      devices: HomeAssistant["devices"],
      areas: HomeAssistant["areas"]
    ) => ({
      ...config,
      name_detail: config.name_detail ?? "auto",
      context_entities: resolveEntityIDs(
        this.hass!,
        target,
        entities,
        devices,
        areas
      ),
    })
  );

  private _filterFunc: HaEntityPickerEntityFilterFunc = (entity) =>
    filterLogbookCompatibleEntities(entity);

  private _entitiesChanged(ev: CustomEvent): void {
    this._config = { ...this._config!, target: ev.detail.value };
    fireEvent(this, "config-changed", { config: this._config });
  }

  private _valueChanged(ev: CustomEvent): void {
    const newConfig = { ...ev.detail.value };
    delete newConfig.context_entities;
    fireEvent(this, "config-changed", { config: newConfig });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    switch (schema.name) {
      case "theme":
        return `${this.hass!.localize(
          "ui.panel.lovelace.editor.card.generic.theme"
        )} (${this.hass!.localize(
          "ui.panel.lovelace.editor.card.config.optional"
        )})`;
      case "state_filter":
        return this.hass!.localize(
          "ui.panel.lovelace.editor.card.logbook.state_filter"
        );
      case "name_detail":
        return this.hass!.localize(
          "ui.panel.lovelace.editor.card.logbook.name_detail"
        );
      default:
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.generic.${schema.name}`
        );
    }
  };

  static styles = css`
    ha-target-picker {
      display: block;
      margin-top: var(--ha-space-4);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-logbook-card-editor": HuiLogbookCardEditor;
  }
}

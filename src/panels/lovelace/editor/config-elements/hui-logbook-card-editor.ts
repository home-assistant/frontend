import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import {
  array,
  assert,
  assign,
  number,
  object,
  optional,
  string,
} from "superstruct";
import type { HassServiceTarget } from "home-assistant-js-websocket";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/entity/ha-entities-picker";
import "../../../../components/ha-target-picker";
import "../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import { filterLogbookCompatibleEntities } from "../../../../data/logbook";
import type { HomeAssistant } from "../../../../types";
import type { LogbookCardConfig } from "../../cards/types";
import type { LovelaceCardEditor } from "../../types";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import { DEFAULT_HOURS_TO_SHOW } from "../../cards/hui-logbook-card";
import { targetStruct } from "../../../../data/script";
import { getSensorNumericDeviceClasses } from "../../../../data/sensor";
import type { HaEntityPickerEntityFilterFunc } from "../../../../data/entity";

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    entities: optional(array(string())),
    title: optional(string()),
    hours_to_show: optional(number()),
    theme: optional(string()),
    target: optional(targetStruct),
  })
);

const SCHEMA = [
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
] as const;

@customElement("hui-logbook-card-editor")
export class HuiLogbookCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: LogbookCardConfig;

  @state() private _sensorNumericDeviceClasses?: string[];

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

  private async _loadNumericDeviceClasses(hass: HomeAssistant) {
    // ensures that the _load function is not called a second time
    // if another updated occurs before the async function returns
    this._sensorNumericDeviceClasses = [];
    const deviceClasses = await getSensorNumericDeviceClasses(hass);
    this._sensorNumericDeviceClasses = deviceClasses.numeric_device_classes;
  }

  protected updated() {
    if (this.hass && !this._sensorNumericDeviceClasses) {
      this._loadNumericDeviceClasses(this.hass);
    }
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${SCHEMA}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>

      <ha-target-picker
        .hass=${this.hass}
        .entityFilter=${this._filterFunc}
        .value=${this._targetPicker}
        add-on-top
        @value-changed=${this._entitiesChanged}
      ></ha-target-picker>
    `;
  }

  private _filterFunc: HaEntityPickerEntityFilterFunc = (entity) =>
    filterLogbookCompatibleEntities(entity, this._sensorNumericDeviceClasses);

  private _entitiesChanged(ev: CustomEvent): void {
    this._config = { ...this._config!, target: ev.detail.value };
    fireEvent(this, "config-changed", { config: this._config });
  }

  private _valueChanged(ev: CustomEvent): void {
    fireEvent(this, "config-changed", { config: ev.detail.value });
  }

  private _computeLabelCallback = (schema: SchemaUnion<typeof SCHEMA>) => {
    switch (schema.name) {
      case "theme":
        return `${this.hass!.localize(
          "ui.panel.lovelace.editor.card.generic.theme"
        )} (${this.hass!.localize(
          "ui.panel.lovelace.editor.card.config.optional"
        )})`;
      default:
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.generic.${schema.name}`
        );
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-logbook-card-editor": HuiLogbookCardEditor;
  }
}

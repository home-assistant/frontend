import { CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import {
  assert,
  assign,
  literal,
  number,
  object,
  optional,
  string,
  union,
} from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import type { SensorCardConfig } from "../../cards/types";
import type { LovelaceCardEditor } from "../../types";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import { configElementStyle } from "./config-elements-style";
import { DEFAULT_HOURS_TO_SHOW } from "../../cards/hui-sensor-card";

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    entity: optional(string()),
    name: optional(string()),
    icon: optional(string()),
    graph: optional(union([literal("line"), literal("none")])),
    unit: optional(string()),
    detail: optional(number()),
    theme: optional(string()),
    hours_to_show: optional(number()),
  })
);

const SCHEMA = [
  {
    name: "entity",
    selector: {
      entity: { domain: ["counter", "input_number", "number", "sensor"] },
    },
  },
  { name: "name", selector: { text: {} } },
  {
    type: "grid",
    name: "",
    schema: [
      {
        name: "icon",
        selector: {
          icon: {},
        },
        context: {
          icon_entity: "entity",
        },
      },
      {
        name: "graph",
        selector: {
          select: {
            options: [
              {
                value: "none",
                label: "None",
              },
              {
                value: "line",
                label: "Line",
              },
            ],
          },
        },
      },
      { name: "unit", selector: { text: {} } },
      { name: "detail", selector: { boolean: {} } },
      { name: "theme", selector: { theme: {} } },
      {
        name: "hours_to_show",
        default: DEFAULT_HOURS_TO_SHOW,
        selector: { number: { min: 1, mode: "box" } },
      },
    ],
  },
] as const;

@customElement("hui-sensor-card-editor")
export class HuiSensorCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SensorCardConfig;

  public setConfig(config: SensorCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const data = {
      graph: "none",
      ...this._config,
      detail: this._config!.detail === 2,
    };

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${SCHEMA}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    const config = ev.detail.value;
    config.detail = config.detail ? 2 : 1;
    fireEvent(this, "config-changed", { config });
  }

  private _computeLabelCallback = (schema: SchemaUnion<typeof SCHEMA>) => {
    switch (schema.name) {
      case "theme":
        return `${this.hass!.localize(
          "ui.panel.lovelace.editor.card.generic.theme"
        )} (${this.hass!.localize(
          "ui.panel.lovelace.editor.card.config.optional"
        )})`;
      case "detail":
        return this.hass!.localize(
          "ui.panel.lovelace.editor.card.sensor.show_more_detail"
        );
      case "graph":
        return this.hass!.localize(
          "ui.panel.lovelace.editor.card.sensor.graph_type"
        );
      default:
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.generic.${schema.name}`
        );
    }
  };

  static get styles(): CSSResultGroup {
    return configElementStyle;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-sensor-card-editor": HuiSensorCardEditor;
  }
}

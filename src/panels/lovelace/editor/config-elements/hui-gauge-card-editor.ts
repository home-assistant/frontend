import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import {
  array,
  assert,
  assign,
  boolean,
  number,
  object,
  optional,
  string,
} from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import type { GaugeCardConfig } from "../../cards/types";
import type { LovelaceCardEditor } from "../../types";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import { DEFAULT_MIN, DEFAULT_MAX } from "../../cards/hui-gauge-card";

const gaugeSegmentStruct = object({
  from: number(),
  color: string(),
  label: optional(string()),
});

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    name: optional(string()),
    entity: optional(string()),
    unit: optional(string()),
    min: optional(number()),
    max: optional(number()),
    severity: optional(object()),
    theme: optional(string()),
    needle: optional(boolean()),
    segments: optional(array(gaugeSegmentStruct)),
  })
);

@customElement("hui-gauge-card-editor")
export class HuiGaugeCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: GaugeCardConfig;

  public setConfig(config: GaugeCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
  }

  private _schema = memoizeOne(
    (showSeverity: boolean) =>
      [
        {
          name: "entity",
          selector: {
            entity: {
              domain: ["counter", "input_number", "number", "sensor"],
            },
          },
        },
        {
          name: "",
          type: "grid",
          schema: [
            { name: "name", selector: { text: {} } },
            { name: "unit", selector: { text: {} } },
          ],
        },
        { name: "theme", selector: { theme: {} } },
        {
          name: "",
          type: "grid",
          schema: [
            {
              name: "min",
              default: DEFAULT_MIN,
              selector: { number: { mode: "box", step: "any" } },
            },
            {
              name: "max",
              default: DEFAULT_MAX,
              selector: { number: { mode: "box", step: "any" } },
            },
          ],
        },
        {
          name: "",
          type: "grid",
          schema: [
            { name: "needle", selector: { boolean: {} } },
            { name: "show_severity", selector: { boolean: {} } },
          ],
        },
        ...(showSeverity
          ? ([
              {
                name: "severity",
                type: "grid",
                schema: [
                  {
                    name: "green",
                    selector: { number: { mode: "box", step: "any" } },
                  },
                  {
                    name: "yellow",
                    selector: { number: { mode: "box", step: "any" } },
                  },
                  {
                    name: "red",
                    selector: { number: { mode: "box", step: "any" } },
                  },
                ],
              },
            ] as const)
          : []),
      ] as const
  );

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const schema = this._schema(this._config!.severity !== undefined);
    const data = {
      show_severity: this._config!.severity !== undefined,
      ...this._config,
    };

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${schema}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    let config = ev.detail.value;

    if (config.show_severity) {
      config = {
        ...config,
        severity: {
          green: config.green || config.severity?.green || 0,
          yellow: config.yellow || config.severity?.yellow || 0,
          red: config.red || config.severity?.red || 0,
        },
      };
    } else if (!config.show_severity && config.severity) {
      delete config.severity;
    }

    delete config.show_severity;
    delete config.green;
    delete config.yellow;
    delete config.red;

    fireEvent(this, "config-changed", { config });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    switch (schema.name) {
      case "name":
        return this.hass!.localize(
          "ui.panel.lovelace.editor.card.generic.name"
        );
      case "entity":
        return `${this.hass!.localize(
          "ui.panel.lovelace.editor.card.generic.entity"
        )} (${this.hass!.localize(
          "ui.panel.lovelace.editor.card.config.required"
        )})`;
      case "max":
        return this.hass!.localize(
          "ui.panel.lovelace.editor.card.generic.maximum"
        );
      case "min":
        return this.hass!.localize(
          "ui.panel.lovelace.editor.card.generic.minimum"
        );
      case "show_severity":
        return this.hass!.localize(
          "ui.panel.lovelace.editor.card.gauge.severity.define"
        );
      case "needle":
        return this.hass!.localize(
          "ui.panel.lovelace.editor.card.gauge.needle_gauge"
        );
      case "theme":
        return `${this.hass!.localize(
          "ui.panel.lovelace.editor.card.generic.theme"
        )} (${this.hass!.localize(
          "ui.panel.lovelace.editor.card.config.optional"
        )})`;
      case "unit":
        return this.hass!.localize(
          "ui.panel.lovelace.editor.card.generic.unit"
        );
      default:
        // "green" | "yellow" | "red"
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.gauge.severity.${schema.name}`
        );
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-gauge-card-editor": HuiGaugeCardEditor;
  }
}

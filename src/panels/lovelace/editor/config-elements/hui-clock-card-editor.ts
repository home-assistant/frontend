import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import {
  assert,
  assign,
  boolean,
  enums,
  literal,
  object,
  optional,
  union,
} from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-form/ha-form";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import type { ClockCardConfig } from "../../cards/types";
import type { LovelaceCardEditor } from "../../types";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import { TimeFormat } from "../../../../data/translation";

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    clock_size: optional(
      union([literal("small"), literal("medium"), literal("large")])
    ),
    time_format: optional(enums(Object.values(TimeFormat))),
    show_seconds: optional(boolean()),
  })
);

@customElement("hui-clock-card-editor")
export class HuiClockCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: ClockCardConfig;

  private _schema = memoizeOne(
    (localize: LocalizeFunc) =>
      [
        {
          name: "clock_size",
          selector: {
            select: {
              mode: "dropdown",
              options: ["small", "medium", "large"].map((value) => ({
                value,
                label: localize(
                  `ui.panel.lovelace.editor.card.clock.clock_sizes.${value}`
                ),
              })),
            },
          },
        },
        {
          name: "show_seconds",
          selector: {
            boolean: {},
          },
        },
        {
          name: "time_format",
          selector: {
            select: {
              mode: "dropdown",
              options: ["auto", ...Object.values(TimeFormat)].map((value) => ({
                value,
                label: localize(
                  `ui.panel.lovelace.editor.card.clock.time_formats.${value}`
                ),
              })),
            },
          },
        },
      ] as const satisfies readonly HaFormSchema[]
  );

  private _data = memoizeOne((config) => ({
    clock_size: "small",
    time_format: "auto",
    show_seconds: false,
    ...config,
  }));

  public setConfig(config: ClockCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._data(this._config)}
        .schema=${this._schema(this.hass.localize)}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    if (ev.detail.value.time_format === "auto") {
      delete ev.detail.value.time_format;
    }

    fireEvent(this, "config-changed", { config: ev.detail.value });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    switch (schema.name) {
      case "clock_size":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.clock.clock_size`
        );
      case "time_format":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.clock.time_format`
        );
      case "show_seconds":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.clock.show_seconds`
        );
      default:
        return undefined;
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-clock-card-editor": HuiClockCardEditor;
  }
}

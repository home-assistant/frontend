import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import {
  array,
  assert,
  assign,
  boolean,
  defaulted,
  enums,
  object,
  optional,
  string,
} from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-form/ha-form";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
import type { HomeAssistant, ValueChangedEvent } from "../../../../types";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import type { DateCardConfig } from "../../cards/types";
import { CLOCK_CARD_DATE_PARTS } from "../../cards/clock/clock-date-format";
import type { LovelaceCardEditor } from "../../types";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import { getTimezoneOptions } from "../../../../components/ha-timezone-picker";

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    title: optional(string()),
    date_size: optional(enums(["small", "medium", "large"] as const)),
    date_format: optional(defaulted(array(enums(CLOCK_CARD_DATE_PARTS)), [])),
    time_zone: optional(enums(getTimezoneOptions().map((option) => option.id))),
    no_background: optional(boolean()),
  })
);

@customElement("hui-date-card-editor")
export class HuiDateCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: DateCardConfig;

  private _schema = memoizeOne(
    (localize: LocalizeFunc) =>
      [
        { name: "title", selector: { text: {} } },
        {
          name: "date_size",
          selector: {
            select: {
              mode: "dropdown",
              options: ["small", "medium", "large"].map((value) => ({
                value,
                label: localize(
                  `ui.panel.lovelace.editor.card.date.date_sizes.${value}`
                ),
              })),
            },
          },
        },
        {
          name: "date_format",
          required: false,
          selector: {
            ui_clock_date_format: {},
          },
        },
        { name: "no_background", selector: { boolean: {} } },
        { name: "time_zone", selector: { timezone: {} } },
      ] as const satisfies readonly HaFormSchema[]
  );

  private _data = memoizeOne((config: DateCardConfig): DateCardConfig => ({
    date_size: "small",
    no_background: false,
    date_format: [],
    ...config,
  }));

  public setConfig(config: DateCardConfig): void {
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
        .computeHelper=${this._computeHelperCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: ValueChangedEvent<DateCardConfig>): void {
    const config = ev.detail.value;

    if (!config.date_format || config.date_format.length === 0) {
      delete config.date_format;
    }

    fireEvent(this, "config-changed", { config });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    switch (schema.name) {
      case "title":
        return this.hass!.localize(
          "ui.panel.lovelace.editor.card.generic.title"
        );
      case "date_size":
        return this.hass!.localize(
          "ui.panel.lovelace.editor.card.date.date_size"
        );
      case "date_format":
        return this.hass!.localize(
          "ui.panel.lovelace.editor.card.date.date_format"
        );
      case "no_background":
        return this.hass!.localize(
          "ui.panel.lovelace.editor.card.date.no_background"
        );
      case "time_zone":
        return this.hass!.localize(
          "ui.panel.lovelace.editor.card.date.time_zone"
        );
      default:
        return undefined;
    }
  };

  private _computeHelperCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    switch (schema.name) {
      case "date_format":
        return this.hass!.localize(
          "ui.panel.lovelace.editor.card.date.date_format_description"
        );
      default:
        return undefined;
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-date-card-editor": HuiDateCardEditor;
  }
}

import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import {
  assert,
  assign,
  boolean,
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
import type { HomeAssistant } from "../../../../types";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import type { DateCardConfig } from "../../cards/types";
import { DEFAULT_DATE_FORMAT } from "../../cards/hui-date-card-helpers";
import type { LovelaceCardEditor } from "../../types";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import { getTimezoneOptions } from "../../../../components/ha-timezone-picker";

const DATE_FORMATS = [
  "weekday_day",
  "long",
  "short",
  "numeric",
  "very_short",
  "weekday_very_short_date",
  "weekday_short_date",
] as const;

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    title: optional(string()),
    date_size: optional(enums(["small", "medium", "large"] as const)),
    date_format: optional(enums(DATE_FORMATS)),
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
          selector: {
            select: {
              mode: "dropdown",
              options: DATE_FORMATS.map((value) => ({
                value,
                label: localize(
                  `ui.panel.lovelace.editor.card.date.date_formats.${value}`
                ),
              })),
            },
          },
        },
        { name: "no_background", selector: { boolean: {} } },
        { name: "time_zone", selector: { timezone: {} } },
      ] as const satisfies readonly HaFormSchema[]
  );

  private _data = memoizeOne((config: DateCardConfig) => ({
    date_size: "small",
    date_format: DEFAULT_DATE_FORMAT,
    no_background: false,
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
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    fireEvent(this, "config-changed", { config: ev.detail.value });
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
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-date-card-editor": HuiDateCardEditor;
  }
}

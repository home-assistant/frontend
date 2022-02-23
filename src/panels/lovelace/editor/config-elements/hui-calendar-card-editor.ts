import "../../../../components/ha-form/ha-form";
import { html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import {
  array,
  assert,
  assign,
  boolean,
  object,
  optional,
  string,
  union,
} from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import { LocalizeFunc } from "../../../../common/translations/localize";
import type { HaFormSchema } from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import type { CalendarCardConfig } from "../../cards/types";
import type { LovelaceCardEditor } from "../../types";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    title: optional(union([string(), boolean()])),
    initial_view: optional(string()),
    theme: optional(string()),
    entities: array(string()),
  })
);

const views = ["dayGridMonth", "dayGridDay", "listWeek"];

@customElement("hui-calendar-card-editor")
export class HuiCalendarCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: CalendarCardConfig;

  public setConfig(config: CalendarCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
  }

  private _schema = memoizeOne((localize: LocalizeFunc) => [
    {
      name: "",
      type: "grid",
      schema: [
        { name: "title", required: false, selector: { text: {} } },
        {
          name: "initial_view",
          required: false,
          selector: {
            select: {
              options: views.map((view) => [
                view,
                localize(
                  `ui.panel.lovelace.editor.card.calendar.views.${view}`
                ),
              ]),
            },
          },
        },
      ],
    },
    { name: "theme", required: false, selector: { theme: {} } },
    {
      name: "entities",
      selector: {
        entity: { domain: "calendar" },
      },
    },
  ]);

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    const schema = this._schema(this.hass.localize);

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${schema}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    const config = ev.detail.value;

    if (!config.entities) {
      config.entities = [];
    }

    fireEvent(this, "config-changed", { config });
  }

  private _computeLabelCallback = (schema: HaFormSchema) => {
    if (schema.name === "title") {
      return this.hass!.localize("ui.panel.lovelace.editor.card.generic.title");
    }

    return this.hass!.localize(
      `ui.panel.lovelace.editor.card.calendar.${schema.name}`
    );
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-calendar-card-editor": HuiCalendarCardEditor;
  }
}

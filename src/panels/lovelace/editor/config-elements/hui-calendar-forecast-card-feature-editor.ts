import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import { computeDomain } from "../../../../common/entity/compute_domain";
import "../../../../components/ha-form/ha-form";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import type {
  CalendarForecastCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "../../card-features/types";
import {
  CALENDAR_FORECAST_FOCUS,
  DEFAULT_CALENDAR_FORECAST_FOCUS,
  DEFAULT_CALENDAR_FORECAST_HOURS_TO_SHOW,
} from "../../card-features/types";
import type { LovelaceCardFeatureEditor } from "../../types";

@customElement("hui-calendar-forecast-card-feature-editor")
export class HuiCalendarForecastCardFeatureEditor
  extends LitElement
  implements LovelaceCardFeatureEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: CalendarForecastCardFeatureConfig;

  public setConfig(config: CalendarForecastCardFeatureConfig): void {
    this._config = config;
  }

  private _schema = memoizeOne(
    (isCalendar: boolean, localize: HomeAssistant["localize"]) =>
      [
        {
          name: "hours_to_show",
          default: DEFAULT_CALENDAR_FORECAST_HOURS_TO_SHOW,
          selector: { number: { min: 1, mode: "box" } },
        },
        {
          name: "focus",
          default: DEFAULT_CALENDAR_FORECAST_FOCUS,
          selector: {
            select: {
              mode: "dropdown",
              options: CALENDAR_FORECAST_FOCUS.map((value) => ({
                value,
                label: localize(
                  `ui.panel.lovelace.editor.features.types.calendar-forecast.focus_options.${value}`
                ),
              })),
            },
          },
        },
        {
          name: "show_labels",
          default: true,
          selector: { boolean: {} },
        },
        ...(isCalendar
          ? ([
              {
                name: "show_all_day_events",
                default: false,
                selector: { boolean: {} },
              },
            ] as const)
          : []),
      ] as const satisfies readonly HaFormSchema[]
  );

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const isCalendar = this.context?.entity_id
      ? computeDomain(this.context.entity_id) === "calendar"
      : false;

    const data: CalendarForecastCardFeatureConfig = {
      ...this._config,
      hours_to_show:
        this._config.hours_to_show ?? DEFAULT_CALENDAR_FORECAST_HOURS_TO_SHOW,
      focus: this._config.focus ?? DEFAULT_CALENDAR_FORECAST_FOCUS,
    };

    const schema = this._schema(isCalendar, this.hass.localize);

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
    fireEvent(this, "config-changed", { config: ev.detail.value });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    switch (schema.name) {
      case "hours_to_show":
        return this.hass!.localize(
          "ui.panel.lovelace.editor.card.generic.hours_to_show"
        );
      case "focus":
        return this.hass!.localize(
          "ui.panel.lovelace.editor.features.types.calendar-forecast.focus"
        );
      case "show_all_day_events":
        return this.hass!.localize(
          "ui.panel.lovelace.editor.features.types.calendar-forecast.show_all_day_events"
        );
      case "show_labels":
        return this.hass!.localize(
          "ui.panel.lovelace.editor.features.types.calendar-forecast.show_labels"
        );
      default:
        return "";
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-calendar-forecast-card-feature-editor": HuiCalendarForecastCardFeatureEditor;
  }
}

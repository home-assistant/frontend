import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../../common/dom/fire_event";
import type { CalendarTrigger } from "../../../../../data/automation";
import type { HomeAssistant } from "../../../../../types";
import type { TriggerElement } from "../ha-automation-trigger-row";
import type { HaFormSchema } from "../../../../../components/ha-form/types";
import type { LocalizeFunc } from "../../../../../common/translations/localize";

@customElement("ha-automation-trigger-calendar")
export class HaCalendarTrigger extends LitElement implements TriggerElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public trigger!: CalendarTrigger;

  private _schema = memoizeOne((localize: LocalizeFunc) => [
    {
      name: "entity_id",
      required: true,
      selector: { entity: { domain: "calendar" } },
    },
    {
      name: "event",
      type: "select",
      required: true,
      options: [
        [
          "start",
          localize(
            "ui.panel.config.automation.editor.triggers.type.calendar.start"
          ),
        ],
      ],
    },
  ]);

  public static get defaultConfig() {
    return {
      event: "start" as CalendarTrigger["event"],
    };
  }

  protected render() {
    const schema = this._schema(this.hass.localize);
    return html`
      <ha-form
        .schema=${schema}
        .data=${this.trigger}
        .hass=${this.hass}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const newTrigger = ev.detail.value;
    fireEvent(this, "value-changed", { value: newTrigger });
  }

  private _computeLabelCallback = (schema: HaFormSchema): string =>
    this.hass.localize(
      `ui.panel.config.automation.editor.triggers.type.calendar.${schema.name}`
    );
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger-calendar": HaCalendarTrigger;
  }
}

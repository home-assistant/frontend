import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../../common/dom/fire_event";
import type { CalendarTrigger } from "../../../../../data/automation";
import type { HomeAssistant } from "../../../../../types";
import type { TriggerElement } from "../ha-automation-trigger-row";
import "../../../../../components/ha-form/ha-form";
import type { LocalizeFunc } from "../../../../../common/translations/localize";
import type { SchemaUnion } from "../../../../../components/ha-form/types";

@customElement("ha-automation-trigger-calendar")
export class HaCalendarTrigger extends LitElement implements TriggerElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public trigger!: CalendarTrigger;

  @property({ type: Boolean }) public disabled = false;

  private _schema = memoizeOne(
    (localize: LocalizeFunc) =>
      [
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
            [
              "end",
              localize(
                "ui.panel.config.automation.editor.triggers.type.calendar.end"
              ),
            ],
          ],
        },
        {
          name: "offset",
          required: true,
          selector: { duration: { enable_day: true, mode: "offset" } },
        },
      ] as const
  );

  public static get defaultConfig(): CalendarTrigger {
    return {
      trigger: "calendar",
      entity_id: "",
      event: "start" as CalendarTrigger["event"],
      offset: "0",
    };
  }

  protected render() {
    const schema = this._schema(this.hass.localize);
    return html`
      <ha-form
        .schema=${schema}
        .data=${this.trigger}
        .hass=${this.hass}
        .disabled=${this.disabled}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    fireEvent(this, "value-changed", { value: ev.detail.value });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ): string => {
    switch (schema.name) {
      case "entity_id":
        return this.hass.localize("ui.components.entity.entity-picker.entity");
      case "event":
        return this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.calendar.event"
        );
      case "offset":
        return this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.calendar.offset"
        );
    }
    return "";
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger-calendar": HaCalendarTrigger;
  }
}

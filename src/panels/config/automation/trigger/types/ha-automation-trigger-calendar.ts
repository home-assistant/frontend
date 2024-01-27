import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../../common/dom/fire_event";
import type { CalendarTrigger } from "../../../../../data/automation";
import type { HomeAssistant } from "../../../../../types";
import type { TriggerElement } from "../ha-automation-trigger-row";
import type { HaDurationData } from "../../../../../components/ha-duration-input";
import "../../../../../components/ha-form/ha-form";
import { createDurationData } from "../../../../../common/datetime/create_duration_data";
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
        { name: "offset", selector: { duration: {} } },
        {
          name: "offset_type",
          type: "select",
          required: true,
          options: [
            [
              "before",
              localize(
                "ui.panel.config.automation.editor.triggers.type.calendar.before"
              ),
            ],
            [
              "after",
              localize(
                "ui.panel.config.automation.editor.triggers.type.calendar.after"
              ),
            ],
          ],
        },
      ] as const
  );

  public static get defaultConfig() {
    return {
      event: "start" as CalendarTrigger["event"],
      offset: 0,
    };
  }

  protected render() {
    const schema = this._schema(this.hass.localize);
    // Convert from string representation to ha form duration representation
    const trigger_offset = this.trigger.offset;
    const duration: HaDurationData = createDurationData(trigger_offset)!;
    let offset_type = "after";
    if (
      (typeof trigger_offset === "object" && duration!.hours! < 0) ||
      (typeof trigger_offset === "string" && trigger_offset.startsWith("-"))
    ) {
      duration.hours = Math.abs(duration.hours!);
      offset_type = "before";
    }
    const data = {
      ...this.trigger,
      offset: duration,
      offset_type: offset_type,
    };
    return html`
      <ha-form
        .schema=${schema}
        .data=${data}
        .hass=${this.hass}
        .disabled=${this.disabled}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    // Convert back to duration string representation
    const duration = ev.detail.value.offset;
    const offsetType = ev.detail.value.offset_type === "before" ? "-" : "";
    const newTrigger = {
      ...ev.detail.value,
      offset: `${offsetType}${duration.hours ?? 0}:${duration.minutes ?? 0}:${
        duration.seconds ?? 0
      }`,
    };
    delete newTrigger.offset_type;
    fireEvent(this, "value-changed", { value: newTrigger });
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
    }
    return "";
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger-calendar": HaCalendarTrigger;
  }
}

import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../../common/translations/localize";
import "../../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../../components/ha-form/types";
import type { TimerTrigger } from "../../../../../data/automation";
import type { HomeAssistant } from "../../../../../types";

const EVENTS = [
  "cancelled",
  "finished",
  "started",
  "restarted",
  "paused",
] as const;

@customElement("ha-automation-trigger-timer")
export class HaTimerTrigger extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public trigger!: TimerTrigger;

  @property({ type: Boolean }) public disabled = false;

  private _schema = memoizeOne(
    (localize: LocalizeFunc) =>
      [
        {
          name: "entity_id",
          required: true,
          selector: {
            entity: {
              filter: {
                domain: "timer",
              },
            },
          },
        },
        {
          name: "event",
          type: "select",
          required: true,
          options: EVENTS.map(
            (e) =>
              [
                `timer.${e}`,
                localize(
                  `ui.panel.config.automation.editor.triggers.type.timer.event_types.${e}`
                ),
              ] as const
          ),
        },
      ] as const
  );

  public static get defaultConfig() {
    return {
      platform: "event",
      event_type: undefined,
      metadata: {},
      event_data: {
        entity_id: undefined,
      },
    };
  }

  public render() {
    const schema = this._schema(this.hass.localize);

    const data = {
      entity_id: this.trigger.event_data?.entity_id,
      event: this.trigger.event_type,
    };

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${schema}
        .disabled=${this.disabled}
        @value-changed=${this._valueChanged}
        .computeLabel=${this._computeLabelCallback}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const value = ev.detail.value;

    const newTrigger = {
      platform: "event",
      metadata: {},
      event_data: {
        entity_id: value.entity_id,
      },
      event_type: value.event,
    };

    fireEvent(this, "value-changed", { value: newTrigger });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ): string => {
    switch (schema.name) {
      case "entity_id":
        return this.hass.localize("ui.components.entity.entity-picker.entity");
      default:
        return this.hass.localize(
          `ui.panel.config.automation.editor.triggers.type.timer.${schema.name}`
        );
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger-timer": HaTimerTrigger;
  }
}

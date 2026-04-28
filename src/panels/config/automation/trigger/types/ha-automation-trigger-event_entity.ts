import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { ensureArray } from "../../../../../common/array/ensure-array";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-form/ha-form";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../../components/ha-form/types";
import type { EventEntityTrigger } from "../../../../../data/automation";
import type { HomeAssistant } from "../../../../../types";
import type { TriggerElement } from "../ha-automation-trigger-row";

@customElement("ha-automation-trigger-event_entity")
export class HaEventEntityTrigger extends LitElement implements TriggerElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public trigger!: EventEntityTrigger;

  @property({ type: Boolean }) public disabled = false;

  public static get defaultConfig(): EventEntityTrigger {
    return { trigger: "event_entity", entity_id: [], event_type: "" };
  }

  private _schema = memoizeOne(
    () =>
      [
        {
          name: "entity_id",
          required: true,
          selector: { entity: { multiple: true, filter: { domain: "event" } } },
        },
        {
          name: "event_type",
          required: true,
          context: {
            filter_entity: "entity_id",
          },
          selector: {
            state: {
              multiple: true,
              attribute: "event_type",
            },
          },
        },
      ] as const satisfies HaFormSchema[]
  );

  protected render() {
    const data = {
      ...this.trigger,
      entity_id: ensureArray(this.trigger.entity_id),
      event_type: ensureArray(this.trigger.event_type),
    };

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${this._schema()}
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
  ): string =>
    this.hass.localize(
      schema.name === "entity_id"
        ? "ui.components.entity.entity-picker.entity"
        : `ui.panel.config.automation.editor.triggers.type.event_entity.${schema.name}`
    );
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger-event_entity": HaEventEntityTrigger;
  }
}

import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../../components/ha-form/types";
import type { TimerTrigger } from "../../../../../data/automation";
import type { HomeAssistant } from "../../../../../types";
import type { TriggerElement } from "../ha-automation-trigger-row";

@customElement("ha-automation-trigger-timer")
export class HaTimerTrigger extends LitElement implements TriggerElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public trigger!: TimerTrigger;

  @property({ type: Boolean }) public disabled = false;

  private _schema = memoizeOne(
    (localize: LocalizeFunc) =>
      [
        {
          name: "entity_id",
          required: true,
          selector: { entity: { domain: "timer" } },
        },
        {
          name: "events",
          type: "multi_select",
          required: true,
          options: [
            [
              "start",
              localize(
                "ui.panel.config.automation.editor.triggers.type.timer.start"
              ),
            ],
            [
              "pause",
              localize(
                "ui.panel.config.automation.editor.triggers.type.timer.pause"
              ),
            ],
            [
              "finish",
              localize(
                "ui.panel.config.automation.editor.triggers.type.timer.finish"
              ),
            ],
            [
              "cancel",
              localize(
                "ui.panel.config.automation.editor.triggers.type.timer.cancel"
              ),
            ],
            [
              "restart",
              localize(
                "ui.panel.config.automation.editor.triggers.type.timer.restart"
              ),
            ],
          ],
        },
      ] as const
  );

  public static get defaultConfig(): TimerTrigger {
    return { trigger: "timer", entity_id: "", events: [] };
  }

  protected render() {
    const schema = this._schema(this.hass.localize);
    return html`
      <ha-form
        .hass=${this.hass}
        .schema=${schema}
        .data=${this.trigger}
        .disabled=${this.disabled}
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

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ): string => {
    switch (schema.name) {
      case "entity_id":
        return this.hass.localize("ui.components.entity.entity-picker.entity");
      case "events":
        return this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.timer.events"
        );
    }
    return "";
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger-timer": HaTimerTrigger;
  }
}

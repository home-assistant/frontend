import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import type { TemplateTrigger } from "../../../../../data/automation";
import type { HomeAssistant } from "../../../../../types";
import "../../../../../components/ha-form/ha-form";
import { createDurationData } from "../../../../../common/datetime/create_duration_data";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { hasTemplate } from "../../../../../common/string/has-template";
import type { SchemaUnion } from "../../../../../components/ha-form/types";
import type { LocalizeFunc } from "../../../../../common/translations/localize";

export const SCHEMA = [
  { name: "value_template", required: true, selector: { template: {} } },
  {
    name: "for",
    selector: {
      choose: {
        translation_key:
          "ui.panel.config.automation.editor.triggers.type.template.for_type",
        choices: {
          duration: { selector: { duration: {} } },
          template: { selector: { template: {} } },
        },
      },
    },
  },
] as const;

export const computeLabel = (
  fieldName: string,
  localize: LocalizeFunc
): string =>
  localize(
    `ui.panel.config.automation.editor.triggers.type.template.${fieldName}` as any
  );

@customElement("ha-automation-trigger-template")
export class HaTemplateTrigger extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public trigger!: TemplateTrigger;

  @property({ type: Boolean }) public disabled = false;

  public static get defaultConfig(): TemplateTrigger {
    return { trigger: "template", value_template: "" };
  }

  private _wrapForValue(
    forValue: TemplateTrigger["for"]
  ): Record<string, unknown> | undefined {
    if (forValue === undefined) {
      return undefined;
    }
    if (typeof forValue === "string" && hasTemplate(forValue)) {
      return { active_choice: "template", template: forValue };
    }
    return {
      active_choice: "duration",
      duration: createDurationData(forValue),
    };
  }

  private _unwrapForValue(
    forValue: Record<string, unknown> | undefined
  ): TemplateTrigger["for"] {
    if (!forValue || !forValue.active_choice) {
      return forValue as TemplateTrigger["for"];
    }
    if (forValue.active_choice === "template") {
      return forValue.template as string;
    }
    return forValue.duration as TemplateTrigger["for"];
  }

  protected render() {
    const data = {
      ...this.trigger,
      for: this._wrapForValue(this.trigger.for),
    };

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${SCHEMA}
        .localizeValue=${this.hass.localize}
        @value-changed=${this._valueChanged}
        .computeLabel=${this._computeLabelCallback}
        .disabled=${this.disabled}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const newTrigger = ev.detail.value;

    newTrigger.for = this._unwrapForValue(newTrigger.for);

    if (
      newTrigger.for &&
      typeof newTrigger.for === "object" &&
      Object.values(newTrigger.for).every((value) => value === 0)
    ) {
      delete newTrigger.for;
    }

    fireEvent(this, "value-changed", { value: newTrigger });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<typeof SCHEMA>
  ): string => computeLabel(schema.name, this.hass.localize);
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger-template": HaTemplateTrigger;
  }
}

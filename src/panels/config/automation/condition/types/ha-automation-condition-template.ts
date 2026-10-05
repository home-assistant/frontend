import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import type { TemplateCondition } from "../../../../../data/automation";
import type { HomeAssistant } from "../../../../../types";
import type { SchemaUnion } from "../../../../../components/ha-form/types";
import "../../../../../components/ha-form/ha-form";
import { fireEvent } from "../../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../../common/translations/localize";

export const SCHEMA = [
  { name: "value_template", required: true, selector: { template: {} } },
] as const;

export const computeLabel = (
  fieldName: string,
  localize: LocalizeFunc
): string =>
  localize(
    `ui.panel.config.automation.editor.conditions.type.template.${fieldName}` as any
  );

@customElement("ha-automation-condition-template")
export class HaTemplateCondition extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public condition!: TemplateCondition;

  @property({ type: Boolean }) public disabled = false;

  public static get defaultConfig(): TemplateCondition {
    return { condition: "template", value_template: "" };
  }

  protected render() {
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this.condition}
        .schema=${SCHEMA}
        @value-changed=${this._valueChanged}
        .computeLabel=${this._computeLabelCallback}
        .disabled=${this.disabled}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const newCondition = ev.detail.value;
    fireEvent(this, "value-changed", { value: newCondition });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<typeof SCHEMA>
  ): string => computeLabel(schema.name, this.hass.localize);
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-condition-template": HaTemplateCondition;
  }
}

import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../../common/dom/fire_event";
import type { SunCondition } from "../../../../../data/automation";
import type { HomeAssistant } from "../../../../../types";
import type { ConditionElement } from "../ha-automation-condition-row";
import type { LocalizeFunc } from "../../../../../common/translations/localize";
import "../../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../../components/ha-form/types";

@customElement("ha-automation-condition-sun")
export class HaSunCondition extends LitElement implements ConditionElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public condition!: SunCondition;

  @property({ type: Boolean }) public disabled = false;

  public static get defaultConfig() {
    return {};
  }

  private _schema = memoizeOne(
    (localize: LocalizeFunc) =>
      [
        {
          name: "before",
          type: "select",
          required: true,
          options: [
            [
              "sunrise",
              localize(
                "ui.panel.config.automation.editor.conditions.type.sun.sunrise"
              ),
            ],
            [
              "sunset",
              localize(
                "ui.panel.config.automation.editor.conditions.type.sun.sunset"
              ),
            ],
          ],
        },
        { name: "before_offset", selector: { text: {} } },
        {
          name: "after",
          type: "select",
          required: true,
          options: [
            [
              "sunrise",
              localize(
                "ui.panel.config.automation.editor.conditions.type.sun.sunrise"
              ),
            ],
            [
              "sunset",
              localize(
                "ui.panel.config.automation.editor.conditions.type.sun.sunset"
              ),
            ],
          ],
        },
        { name: "after_offset", selector: { text: {} } },
      ] as const
  );

  protected render() {
    const schema = this._schema(this.hass.localize);
    return html`
      <ha-form
        .schema=${schema}
        .data=${this.condition}
        .hass=${this.hass}
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
  ): string =>
    this.hass.localize(
      `ui.panel.config.automation.editor.conditions.type.sun.${schema.name}`
    );
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-condition-sun": HaSunCondition;
  }
}

import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../../common/dom/fire_event";
import type { SunTrigger } from "../../../../../data/automation";
import type { HomeAssistant } from "../../../../../types";
import type { TriggerElement } from "../ha-automation-trigger-row";
import "../../../../../components/ha-form/ha-form";
import type { LocalizeFunc } from "../../../../../common/translations/localize";
import type { SchemaUnion } from "../../../../../components/ha-form/types";

export const computeLabel = (
  fieldName: string,
  localize: LocalizeFunc
): string =>
  localize(
    `ui.panel.config.automation.editor.triggers.type.sun.${fieldName}` as any
  );

export const YAML_SCHEMA = [
  {
    name: "event",
    type: "select" as const,
    required: true,
    options: [["sunrise", "sunrise"] as const, ["sunset", "sunset"] as const],
  },
  { name: "offset", selector: { text: {} } },
] as const;

@customElement("ha-automation-trigger-sun")
export class HaSunTrigger extends LitElement implements TriggerElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public trigger!: SunTrigger;

  @property({ type: Boolean }) public disabled = false;

  private _schema = memoizeOne(
    (localize: LocalizeFunc) =>
      [
        {
          name: "event",
          type: "select",
          required: true,
          options: [
            [
              "sunrise",
              localize(
                "ui.panel.config.automation.editor.triggers.type.sun.sunrise"
              ),
            ],
            [
              "sunset",
              localize(
                "ui.panel.config.automation.editor.triggers.type.sun.sunset"
              ),
            ],
          ],
        },
        { name: "offset", selector: { text: {} } },
      ] as const
  );

  public static get defaultConfig(): SunTrigger {
    return {
      trigger: "sun",
      event: "sunrise" as SunTrigger["event"],
      offset: 0,
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
    const newTrigger = ev.detail.value;
    fireEvent(this, "value-changed", { value: newTrigger });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ): string => computeLabel(schema.name, this.hass.localize);
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger-sun": HaSunTrigger;
  }
}

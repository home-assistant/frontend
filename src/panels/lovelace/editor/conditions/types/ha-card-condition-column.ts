import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../../common/translations/localize";
import "../../../../../components/ha-form/ha-form";
import type {
  SchemaUnion,
  HaFormSchema,
} from "../../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../../types";
import type { ViewColumnsCondition } from "../../../common/validate-condition";

@customElement("ha-card-condition-view_columns")
export class HaCardConditionColumn extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public condition!: ViewColumnsCondition;

  @property({ type: Boolean }) public disabled = false;

  public static get defaultConfig(): ViewColumnsCondition {
    return { condition: "view_columns" };
  }

  protected static validateUIConfig(_condition: ViewColumnsCondition) {
    // All valid column conditions can be represented in the UI
  }

  private _schema = memoizeOne(
    (localize: LocalizeFunc) =>
      [
        {
          name: "min",
          selector: {
            number: {
              min: 1,
              max: 4,
              mode: "box",
              unit_of_measurement: localize(
                "ui.panel.lovelace.editor.condition-editor.condition.view_columns.unit"
              ),
            },
          },
        },
        {
          name: "max",
          selector: {
            number: {
              min: 1,
              max: 4,
              mode: "box",
              unit_of_measurement: localize(
                "ui.panel.lovelace.editor.condition-editor.condition.view_columns.unit"
              ),
            },
          },
        },
      ] as const satisfies readonly HaFormSchema[]
  );

  protected render() {
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this.condition}
        .schema=${this._schema(this.hass.localize)}
        .disabled=${this.disabled}
        @value-changed=${this._valueChanged}
        .computeLabel=${this._computeLabelCallback}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const data = ev.detail.value as ViewColumnsCondition;

    const condition: ViewColumnsCondition = {
      condition: "view_columns",
      ...(data.min != null ? { min: data.min } : {}),
      ...(data.max != null ? { max: data.max } : {}),
    };

    fireEvent(this, "value-changed", { value: condition });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ): string =>
    this.hass.localize(
      `ui.panel.lovelace.editor.condition-editor.condition.view_columns.${schema.name}`
    );
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-card-condition-view_columns": HaCardConditionColumn;
  }
}

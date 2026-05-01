import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../../common/translations/localize";
import "../../../../../components/ha-form/ha-form";
import type { HaSelectSelectEvent } from "../../../../../components/ha-select";
import type { SunCondition } from "../../../../../data/automation";
import type { HomeAssistant } from "../../../../../types";
import type { ConditionElement } from "../ha-automation-condition-row";

type FormType = "before" | "after" | "between";

const BEFORE_DEFAULT = "sunrise";
const AFTER_DEFAULT = "sunset";

@customElement("ha-automation-condition-sun")
export class HaSunCondition extends LitElement implements ConditionElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public condition!: SunCondition;

  @property({ type: Boolean }) public disabled = false;

  @state() private _formType: FormType = "before";

  public connectedCallback() {
    super.connectedCallback();
    if (this.condition.before && this.condition.after) {
      this._formType = "between";
    } else if (this.condition.after) {
      this._formType = "after";
    }
  }

  public static get defaultConfig(): SunCondition {
    return { condition: "sun", before: BEFORE_DEFAULT };
  }

  private _schema = memoizeOne(
    (localize: LocalizeFunc, formType: FormType) =>
      [
        ...(["between", "before"].includes(formType)
          ? [
              {
                name: "before",
                type: "select",
                default: BEFORE_DEFAULT,
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
              {
                name: "before_offset",
                selector: {
                  duration: {
                    allow_negative: true,
                  },
                },
              },
            ]
          : []),
        ...(["between", "after"].includes(formType)
          ? [
              {
                name: "after",
                type: "select",
                default: AFTER_DEFAULT,
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
              {
                name: "after_offset",
                selector: {
                  duration: {
                    allow_negative: true,
                  },
                },
              },
            ]
          : []),
      ] as const
  );

  protected render() {
    const schema = this._schema(this.hass.localize, this._formType);
    return html`
      <ha-select
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.conditions.type_select"
        )}
        .value=${this._formType}
        @selected=${this._typeSelected}
        .options=${[
          {
            value: "before",
            label: this.hass.localize(
              "ui.panel.config.automation.editor.conditions.type.sun.before"
            ),
          },
          {
            value: "after",
            label: this.hass.localize(
              "ui.panel.config.automation.editor.conditions.type.sun.after"
            ),
          },
          {
            value: "between",
            label: this.hass.localize(
              "ui.panel.config.automation.editor.conditions.type.sun.between"
            ),
          },
        ]}
      >
      </ha-select>
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
    fireEvent(this, "value-changed", { value: ev.detail.value });
  }

  private _computeLabelCallback = (schema: {
    name: "before" | "after";
  }): string =>
    this.hass.localize(
      `ui.panel.config.automation.editor.conditions.type.sun.${schema.name}`
    );

  private _typeSelected(ev: HaSelectSelectEvent): void {
    const value = ev.detail.value as FormType;
    this._formType = value;

    if (value === "after") {
      delete this.condition.before;
      delete this.condition.before_offset;
    } else if (!this.condition.before) {
      this.condition.before = BEFORE_DEFAULT;
    }

    if (value === "before") {
      delete this.condition.after;
      delete this.condition.after_offset;
    } else if (!this.condition.after) {
      this.condition.after = AFTER_DEFAULT;
    }
    fireEvent(this, "value-changed", { value: { ...this.condition } });
  }

  static styles = css`
    ha-select {
      display: block;
      margin-bottom: var(--ha-space-4);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-condition-sun": HaSunCondition;
  }
}

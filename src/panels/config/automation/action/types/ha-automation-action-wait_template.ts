import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { isTemplate } from "../../../../../common/string/has-template";
import type { WaitAction } from "../../../../../data/script";
import type { HomeAssistant } from "../../../../../types";
import type { ActionElement } from "../ha-automation-action-row";
import "../../../../../components/ha-form/ha-form";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../../components/ha-form/types";
import type { TimeoutType } from "../../types";

@customElement("ha-automation-action-wait_template")
export class HaWaitAction extends LitElement implements ActionElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public action!: WaitAction;

  @property({ type: Boolean }) public disabled = false;

  public static get defaultConfig(): WaitAction {
    return { wait_template: "" };
  }

  private _schema = memoizeOne(
    (timeoutType: TimeoutType, timeoutSet: boolean) =>
      [
        {
          name: "wait_template",
          selector: { template: {} },
        },
        {
          name: "timeout",
          required: false,
          selector:
            timeoutType === "string_template"
              ? { template: {} }
              : timeoutType === "object_template"
                ? { object: {} }
                : { duration: { enable_millisecond: true } },
        },
        {
          name: "continue_on_timeout",
          selector: { boolean: {} },
          default: timeoutSet,
          disabled: !timeoutSet,
        },
      ] as const satisfies readonly HaFormSchema[]
  );

  protected render() {
    const timeout = this.action.timeout;
    const timeoutType: TimeoutType =
      typeof timeout === "string" && isTemplate(timeout)
        ? "string_template"
        : typeof timeout === "object" &&
            timeout !== null &&
            Object.values(timeout).some(
              (v) => typeof v === "string" && isTemplate(v)
            )
          ? "object_template"
          : "duration";
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this.action}
        .schema=${this._schema(timeoutType, timeout !== undefined)}
        .disabled=${this.disabled}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._formValueChanged}
      ></ha-form>
    `;
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ): string =>
    this.hass.localize(
      `ui.panel.config.automation.editor.actions.type.wait_template.${
        schema.name === "continue_on_timeout" ? "continue_timeout" : schema.name
      }`
    );

  private _formValueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const value = { ...ev.detail.value };
    if (value.timeout === undefined) {
      delete value.continue_on_timeout;
    }
    fireEvent(this, "value-changed", { value });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-action-wait_template": HaWaitAction;
  }
}

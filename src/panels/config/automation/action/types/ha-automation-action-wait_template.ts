import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
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
    return { wait_template: "", continue_on_timeout: true };
  }

  private _schema = memoizeOne(
    (timeoutType: TimeoutType) =>
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
        .schema=${this._schema(timeoutType)}
        .disabled=${this.disabled}
        .computeLabel=${this._computeLabelCallback}
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
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-action-wait_template": HaWaitAction;
  }
}

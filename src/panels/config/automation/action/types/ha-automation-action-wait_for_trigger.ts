import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { ensureArray } from "../../../../../common/array/ensure-array";
import { isTemplate } from "../../../../../common/string/has-template";
import "../../../../../components/ha-form/ha-form";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../../components/ha-form/types";
import type { WaitForTriggerAction } from "../../../../../data/script";
import type { HomeAssistant } from "../../../../../types";
import "../../trigger/ha-automation-trigger";
import type { TimeoutType } from "../../types";
import type { ActionElement } from "../ha-automation-action-row";
import { handleChangeEvent } from "../ha-automation-action-row";

@customElement("ha-automation-action-wait_for_trigger")
export class HaWaitForTriggerAction
  extends LitElement
  implements ActionElement
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public action!: WaitForTriggerAction;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean, attribute: "sidebar" }) public inSidebar = false;

  @property({ type: Boolean, attribute: "indent" }) public indent = false;

  public static get defaultConfig(): WaitForTriggerAction {
    return { wait_for_trigger: [] };
  }

  private _schema = memoizeOne(
    (timeoutType: TimeoutType) =>
      [
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
      ${this.inSidebar || (!this.inSidebar && !this.indent)
        ? html`
            <ha-form
              .hass=${this.hass}
              .data=${this.action}
              .schema=${this._schema(timeoutType)}
              .disabled=${this.disabled}
              .computeLabel=${this._computeLabelCallback}
            ></ha-form>
          `
        : nothing}
      ${this.indent || (!this.inSidebar && !this.indent)
        ? html`<ha-automation-trigger
            class=${!this.inSidebar && !this.indent ? "expansion-panel" : ""}
            .triggers=${ensureArray(this.action.wait_for_trigger)}
            .hass=${this.hass}
            .disabled=${this.disabled}
            .name=${"wait_for_trigger"}
            @value-changed=${this._valueChanged}
            .optionsInSidebar=${this.indent}
            .narrow=${this.narrow}
          ></ha-automation-trigger>`
        : nothing}
    `;
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ): string =>
    this.hass.localize(
      `ui.panel.config.automation.editor.actions.type.wait_for_trigger.${
        schema.name === "continue_on_timeout" ? "continue_timeout" : schema.name
      }`
    );

  private _valueChanged(ev: CustomEvent): void {
    handleChangeEvent(this, ev);
  }

  static styles = css`
    ha-automation-trigger.expansion-panel {
      display: block;
      margin-top: 24px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-action-wait_for_trigger": HaWaitForTriggerAction;
  }
}

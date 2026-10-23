import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, queryAll } from "lit/decorators";
import memoizeOne from "memoize-one";
import { ensureArray } from "../../../../../common/array/ensure-array";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { isTemplate } from "../../../../../common/string/has-template";
import "../../../../../components/ha-alert";
import "../../../../../components/ha-form/ha-form";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../../components/ha-form/types";
import type { Action, WaitForTriggerAction } from "../../../../../data/script";
import type { HomeAssistant } from "../../../../../types";
import "../../trigger/ha-automation-trigger";
import type HaAutomationTrigger from "../../trigger/ha-automation-trigger";
import "../ha-automation-action";
import type HaAutomationAction from "../ha-automation-action";
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

  @query("ha-automation-trigger")
  private _triggerElement?: HaAutomationTrigger;

  @queryAll("ha-automation-action")
  private _actionElements?: HaAutomationAction[];

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
          default: true,
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
    const hasTimeout = this._hasTimeout(this.action);
    const branchesAllowed =
      hasTimeout && this.action.continue_on_timeout !== false;
    const hasBranchActions =
      ensureArray(this.action.on_complete ?? []).length > 0 ||
      ensureArray(this.action.on_timeout ?? []).length > 0;

    return html`
      ${
        this.inSidebar || (!this.inSidebar && !this.indent)
          ? html`
              <ha-form
                .hass=${this.hass}
                .data=${this.action}
                .schema=${this._schema(timeoutType)}
                .disabled=${this.disabled}
                .computeLabel=${this._computeLabelCallback}
              ></ha-form>
            `
          : nothing
      }
      ${
        this.indent || (!this.inSidebar && !this.indent)
          ? html`<ha-automation-trigger
                class=${!this.inSidebar && !this.indent ? "expansion-panel" : ""}
                .triggers=${ensureArray(this.action.wait_for_trigger)}
                .hass=${this.hass}
                .disabled=${this.disabled}
                .name=${"wait_for_trigger"}
                @value-changed=${this._valueChanged}
                .optionsInSidebar=${this.indent}
                .narrow=${this.narrow}
              ></ha-automation-trigger>
              ${
                branchesAllowed || hasBranchActions
                  ? html`
                      ${
                        !branchesAllowed
                          ? html`<ha-alert alert-type="warning">
                              ${this.hass.localize(
                                "ui.panel.config.automation.editor.actions.type.wait_for_trigger.branches_need_timeout"
                              )}
                            </ha-alert>`
                          : nothing
                      }
                      <h4>
                        ${this.hass.localize(
                          "ui.panel.config.automation.editor.actions.type.wait_for_trigger.on_complete"
                        )}:
                      </h4>
                      <ha-automation-action
                        .actions=${ensureArray(this.action.on_complete ?? [])}
                        .disabled=${this.disabled}
                        @value-changed=${this._onCompleteChanged}
                        .hass=${this.hass}
                        .narrow=${this.narrow}
                        .optionsInSidebar=${this.indent}
                      ></ha-automation-action>
                      <h4>
                        ${this.hass.localize(
                          "ui.panel.config.automation.editor.actions.type.wait_for_trigger.on_timeout"
                        )}:
                      </h4>
                      <ha-automation-action
                        .actions=${ensureArray(this.action.on_timeout ?? [])}
                        .disabled=${this.disabled}
                        @value-changed=${this._onTimeoutChanged}
                        .hass=${this.hass}
                        .narrow=${this.narrow}
                        .optionsInSidebar=${this.indent}
                      ></ha-automation-action>
                    `
                  : nothing
              }`
          : nothing
      }
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

  private _hasTimeout(action: WaitForTriggerAction): boolean {
    return (
      action.timeout !== undefined &&
      action.timeout !== null &&
      action.timeout !== ""
    );
  }

  private _valueChanged(ev: CustomEvent): void {
    handleChangeEvent(this, ev);
  }

  private _onCompleteChanged(ev: CustomEvent) {
    this._branchChanged(ev, "on_complete");
  }

  private _onTimeoutChanged(ev: CustomEvent) {
    this._branchChanged(ev, "on_timeout");
  }

  private _branchChanged(ev: CustomEvent, key: "on_complete" | "on_timeout") {
    ev.stopPropagation();
    const actions = ev.detail.value as Action[];
    const newValue: WaitForTriggerAction = {
      ...this.action,
      [key]: actions,
    };
    if (actions.length === 0) {
      delete newValue[key];
    }
    fireEvent(this, "value-changed", { value: newValue });
  }

  public expandAll() {
    this._triggerElement?.expandAll();
    this._actionElements?.forEach((element) => element.expandAll?.());
  }

  public collapseAll() {
    this._actionElements?.forEach((element) => element.collapseAll?.());
  }

  static styles = css`
    ha-automation-trigger.expansion-panel {
      display: block;
      margin-top: 24px;
    }
    ha-alert {
      display: block;
      margin-top: var(--ha-space-4);
    }
    h4 {
      color: var(--secondary-text-color);
      margin-bottom: 8px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-action-wait_for_trigger": HaWaitForTriggerAction;
  }
}

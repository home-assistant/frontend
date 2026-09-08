import { consume, type ContextType } from "@lit/context";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { internationalizationContext } from "../../../data/context";
import type {
  AutomationBehaviorConditionMode,
  AutomationBehaviorTriggerMode,
} from "../../../data/selector";
import { rowSummaryStyles } from "./styles";

interface HaAutomationRowBehaviorConfig {
  options?: {
    behavior?: AutomationBehaviorTriggerMode | AutomationBehaviorConditionMode;
  };
}

@customElement("ha-automation-row-behavior")
export class HaAutomationRowBehavior extends LitElement {
  @property({ attribute: false }) public config?: HaAutomationRowBehaviorConfig;

  @property() public mode: "trigger" | "condition" = "trigger";

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  private get _label(): string | undefined {
    const behavior = this.config?.options?.behavior;
    if (!behavior) {
      return "";
    }
    return (
      (this.mode === "condition"
        ? this._i18n?.localize(
            `ui.components.selectors.automation_behavior.condition.options.${behavior as AutomationBehaviorConditionMode}.row_label`
          )
        : this._i18n?.localize(
            `ui.components.selectors.automation_behavior.trigger.options.${behavior as AutomationBehaviorTriggerMode}.row_label`
          )) || ""
    );
  }

  protected render() {
    const label = this._label;

    return html`<span class="dot-separator"></span>${label}`;
  }

  static styles = rowSummaryStyles;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-row-behavior": HaAutomationRowBehavior;
  }
}

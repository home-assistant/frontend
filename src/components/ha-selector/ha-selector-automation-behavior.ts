import { LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import type { LocalizeKeys } from "../../common/translations/localize";
import type {
  AutomationBehavior,
  AutomationBehaviorConditionMode,
  AutomationBehaviorSelector,
  AutomationBehaviorTriggerMode,
} from "../../data/selector";
import type { HomeAssistant } from "../../types";
import "../ha-input-helper-text";
import type { SelectBoxOption } from "../ha-select-box";
import "../ha-select-box";

const TRIGGER_BEHAVIORS: AutomationBehaviorTriggerMode[] = [
  "any",
  "first",
  "last",
];

const CONDITION_BEHAVIORS: AutomationBehaviorConditionMode[] = ["any", "all"];

@customElement("ha-selector-automation_behavior")
export class HaSelectorAutomationBehavior extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false })
  public selector!: AutomationBehaviorSelector;

  @property() public value?: AutomationBehavior;

  @property() public helper?: string;

  @property({ attribute: false })
  public localizeValue?: (key: string) => string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  protected render() {
    const { mode } = this.selector.automation_behavior ?? {};
    const modeKey = mode ?? "trigger";

    const isTrigger = modeKey === "trigger";

    const options = this._behaviors().map<SelectBoxOption>((behavior) => ({
      value: behavior,
      label: this._localizeOption(behavior, "label"),
      description: this._localizeOption(behavior, "description"),
      disabled: this.disabled,
      ...(isTrigger && {
        image: {
          src: `/static/images/form/automation_behavior_trigger_${behavior}.svg`,
          src_dark: `/static/images/form/automation_behavior_trigger_${behavior}_dark.svg`,
        },
      }),
    }));

    return html`
      <ha-select-box
        .hass=${this.hass}
        .options=${options}
        .value=${this.value ?? ""}
        max_columns="1"
        ?stacked_image=${isTrigger}
        @value-changed=${this._valueChanged}
      ></ha-select-box>
      ${this.helper
        ? html`<ha-input-helper-text .disabled=${this.disabled}
            >${this.helper}</ha-input-helper-text
          >`
        : nothing}
    `;
  }

  private _behaviors(): AutomationBehavior[] {
    const mode = this.selector.automation_behavior?.mode;
    return mode === "condition" ? CONDITION_BEHAVIORS : TRIGGER_BEHAVIORS;
  }

  private _localizeOption(
    behavior: AutomationBehavior,
    field: "label" | "description"
  ): string {
    const { translation_key: translationKey, mode } =
      this.selector.automation_behavior ?? {};

    if (this.localizeValue && translationKey) {
      const translated = this.localizeValue(
        `${translationKey}.options.${behavior}.${field}`
      );
      if (translated) {
        return translated;
      }
    }
    return this.hass.localize(
      `ui.components.selectors.automation_behavior.${mode ?? "trigger"}.options.${behavior}.${field}` as LocalizeKeys
    );
  }

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const value = ev.detail.value as AutomationBehavior;
    if (this.disabled || value === this.value) {
      return;
    }
    fireEvent(this, "value-changed", { value });
  }

  static styles = css`
    ha-select-box {
      --ha-select-box-image-size: 28px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-automation_behavior": HaSelectorAutomationBehavior;
  }
}

import { LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import type {
  AutomationBehavior,
  AutomationBehaviorSelector,
} from "../../data/selector";
import type { HomeAssistant } from "../../types";
import "../ha-formfield";
import "../ha-input-helper-text";
import "../ha-radio";

const ALL_BEHAVIORS: AutomationBehavior[] = ["any", "all", "first", "last"];

@customElement("ha-selector-automation_behavior")
export class HaSelectorAutomationBehavior extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false })
  public selector!: AutomationBehaviorSelector;

  @property() public value?: AutomationBehavior;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ attribute: false })
  public localizeValue?: (key: string) => string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  protected render() {
    const behaviors = this._behaviors();

    return html`
      ${this.label ? html`<span class="label">${this.label}</span>` : nothing}
      <div class="container">
        ${behaviors.map(
          (behavior) => html`
            <ha-formfield
              .label=${this._localizeOption(behavior)}
              .disabled=${this.disabled}
            >
              <ha-radio
                .checked=${behavior === this.value}
                .value=${behavior}
                .disabled=${this.disabled}
                @change=${this._radioChanged}
              ></ha-radio>
            </ha-formfield>
          `
        )}
      </div>
      ${this.helper
        ? html`<ha-input-helper-text .disabled=${this.disabled}
            >${this.helper}</ha-input-helper-text
          >`
        : nothing}
    `;
  }

  private _behaviors(): AutomationBehavior[] {
    return (
      (this.selector.automation_behavior?.behaviors as AutomationBehavior[]) ||
      ALL_BEHAVIORS
    );
  }

  private _localizeOption(behavior: AutomationBehavior): string {
    const translationKey = this.selector.automation_behavior?.translation_key;

    if (this.localizeValue && translationKey) {
      const translated = this.localizeValue(
        `${translationKey}.options.${behavior}`
      );
      if (translated) {
        return translated;
      }
    }
    return (
      this.hass.localize(
        `ui.components.selectors.automation_behavior.options.${behavior}`
      ) || behavior
    );
  }

  private _radioChanged(ev: Event) {
    ev.stopPropagation();
    const value = (ev.target as HTMLInputElement).value as AutomationBehavior;
    if (this.disabled || value === this.value) {
      return;
    }
    fireEvent(this, "value-changed", { value });
  }

  static styles = css`
    .label {
      display: block;
      margin-bottom: var(--ha-space-2);
      color: var(--secondary-text-color);
      font-size: var(--ha-font-size-s);
    }

    .container {
      border: 1px solid var(--divider-color);
      border-radius: var(--ha-border-radius-lg);
      padding: var(--ha-space-2) var(--ha-space-4);
      padding-left: 0;
    }

    ha-formfield {
      display: block;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-automation_behavior": HaSelectorAutomationBehavior;
  }
}

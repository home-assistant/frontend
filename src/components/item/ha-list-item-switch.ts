import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html } from "lit";
import { customElement, property, query } from "lit/decorators";
import { live } from "lit/directives/live";
import { fireEvent } from "../../common/dom/fire_event";
import type { HASSDomCurrentTargetEvent } from "../../common/dom/fire_event";
import { forwardHaptic } from "../../data/haptics";
import "../ha-switch";
import { HaListItemBase } from "./ha-list-item-base";

/**
 * @element ha-list-item-switch
 * @extends {HaListItemBase}
 *
 * @summary
 * List row with a switch at the end. The whole row is the label of the
 * switch, so clicking anywhere on it toggles the switch. The headline names the
 * switch for assistive technology and the supporting text describes it.
 *
 * The switch is its own tab stop, so the row does not join the roving tabindex
 * of a parent list. Outside a list, the row has no role.
 *
 * Everything in the row is part of the label, so it has no `end` slot and the
 * `start` slot is for icons and avatars only. For a row with other controls
 * next to the switch, use `ha-list-item-base` with an `ha-switch` and its
 * `accessibleLabel`.
 *
 * @slot start - Leading icon or avatar.
 * @slot headline - Primary text (overrides the `headline` attribute). Names the switch.
 * @slot supporting-text - Secondary text (overrides the `supporting-text` attribute). Describes the switch.
 *
 * @csspart switch - The `ha-switch`. It only shows the state; the row handles input.
 *
 * @attr {boolean} checked - Whether the switch is on.
 * @attr {boolean} haptic - Vibrates on toggle. Only use when the change is applied right away.
 *
 * @fires change - The switch was toggled. Read the new state from `checked` on the row.
 */
@customElement("ha-list-item-switch")
export class HaListItemSwitch extends HaListItemBase {
  @property({ type: Boolean, reflect: true }) public checked = false;

  @property({ type: Boolean }) public haptic = false;

  @query("input") private _input?: HTMLInputElement;

  public connectedCallback(): void {
    super.connectedCallback();
    if (!this._list && this.getAttribute("role") === "listitem") {
      this.removeAttribute("role");
    }
  }

  public override focus(options?: FocusOptions): void {
    this._input?.focus(options);
  }

  public override activate(): void {
    this._input?.click();
  }

  // The input lives in this shadow root, so it can point at the headline and
  // supporting text. The switch inside ha-switch could not.
  protected override _renderBase(inner: TemplateResult): TemplateResult {
    return html`<label part="base" class="base">
      <input
        class="input"
        type="checkbox"
        role="switch"
        aria-checked=${this.checked ? "true" : "false"}
        .checked=${live(this.checked)}
        .disabled=${this.disabled}
        aria-labelledby="headline"
        aria-describedby="supporting-text"
        @change=${this._inputChanged}
      />${inner}<ha-switch
        part="switch"
        inert
        aria-hidden="true"
        .checked=${this.checked}
        .disabled=${this.disabled}
      ></ha-switch>
    </label>`;
  }

  protected override _renderInner(): TemplateResult {
    return html`${this._renderStart()}${this._renderContent()}`;
  }

  private _inputChanged(ev: HASSDomCurrentTargetEvent<HTMLInputElement>): void {
    this.checked = ev.currentTarget.checked;
    if (this.haptic) {
      forwardHaptic(this, "light");
    }
    fireEvent(this, "change");
  }

  static styles: CSSResultGroup = [
    HaListItemBase.styles,
    css`
      :host {
        cursor: pointer;
      }
      :host([disabled]) {
        cursor: default;
      }
      .base {
        cursor: inherit;
      }
      .input {
        position: absolute;
        margin: 0;
        opacity: 0;
        pointer-events: none;
      }
      /* ha-switch is inert, so the row gives it hover and focus styles */
      :host(:not([disabled])) .base:hover ha-switch::part(control) {
        background-color: var(
          --ha-switch-background-color-hover,
          var(
            --ha-switch-background-color,
            var(--ha-color-fill-disabled-quiet-hover)
          )
        );
      }
      :host([checked]:not([disabled])) .base:hover ha-switch::part(control) {
        background-color: var(
          --ha-switch-checked-background-color-hover,
          var(
            --ha-switch-checked-background-color,
            var(--ha-color-fill-primary-normal-hover)
          )
        );
      }
      .input:focus-visible ~ ha-switch::part(control) {
        outline: var(--wa-focus-ring);
        outline-offset: var(--wa-focus-ring-offset);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-list-item-switch": HaListItemSwitch;
  }
}

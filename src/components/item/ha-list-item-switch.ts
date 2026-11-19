import { HasSlotController } from "@home-assistant/webawesome/dist/internal/slot";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html } from "lit";
import { customElement, property, query } from "lit/decorators";
import { live } from "lit/directives/live";
import type { HASSDomCurrentTargetEvent } from "../../common/dom/fire_event";
import "../ha-switch";
import type { HaSwitch } from "../ha-switch";
import { HaListItemBase } from "./ha-list-item-base";

/**
 * @element ha-list-item-switch
 * @extends {HaListItemBase}
 *
 * @summary
 * List row with a switch at the end. The whole row is the label of the
 * switch, so clicking anywhere on it toggles the switch, and the headline and
 * supporting text name the switch for assistive technology.
 *
 * The switch is its own tab stop, so the row does not join the roving tabindex
 * of a parent list. Outside a list, the row has no role.
 *
 * Everything in the row is part of the label, so it has no `end` slot. The
 * `start` slot is hidden from assistive technology, so it is for decorative
 * icons and avatars only. For a row with other controls next to the switch,
 * use `ha-list-item-base` with an `ha-switch` and its `accessibleLabel`.
 *
 * @slot start - Decorative leading icon or avatar.
 * @slot headline - Primary text (overrides the `headline` attribute).
 * @slot supporting-text - Secondary text (overrides the `supporting-text` attribute).
 *
 * @csspart switch - The `ha-switch`.
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

  @query("ha-switch") private _switch?: HaSwitch;

  private readonly _startSlotController = new HasSlotController(this, "start");

  public connectedCallback(): void {
    super.connectedCallback();
    if (!this._list && this.getAttribute("role") === "listitem") {
      this.removeAttribute("role");
    }
  }

  public override focus(options?: FocusOptions): void {
    this._switch?.focus(options);
  }

  public override activate(): void {
    this._switch?.click();
  }

  protected override _renderBase(inner: TemplateResult): TemplateResult {
    return html`<div part="base" class="base">
      <ha-switch
        part="switch"
        .checked=${live(this.checked)}
        .disabled=${this.disabled}
        .haptic=${this.haptic}
        @change=${this._switchChanged}
        >${inner}</ha-switch
      >
    </div>`;
  }

  protected override _renderInner(): TemplateResult {
    return html`${this._renderStart()}${this._renderContent()}`;
  }

  // The label names the switch, so the start content stays out of the name
  protected override _renderStart(): TemplateResult {
    return html`<div
      part="start"
      class="start"
      aria-hidden="true"
      ?hidden=${!this._startSlotController.test("start")}
    >
      <slot name="start"></slot>
    </div>`;
  }

  // Runs before listeners on the row, which read `checked` from it
  private _switchChanged(ev: HASSDomCurrentTargetEvent<HaSwitch>): void {
    this.checked = ev.currentTarget.checked;
  }

  static styles: CSSResultGroup = [
    HaListItemBase.styles,
    css`
      .base {
        padding: 0;
      }
      ha-switch {
        flex: 1;
        align-self: stretch;
        min-width: 0;
      }
      /* The label of the switch fills the row, padding included */
      ha-switch::part(base) {
        flex: 1;
        min-width: 0;
        gap: var(--ha-row-item-gap, var(--ha-space-4));
        padding-block: var(--ha-row-item-padding-block, var(--ha-space-3));
        padding-inline: var(--ha-row-item-padding-inline, var(--ha-space-4));
        min-height: var(--ha-row-item-min-height, 48px);
        box-sizing: border-box;
        color: inherit;
      }
      ha-switch::part(control) {
        order: 1;
      }
      ha-switch::part(label) {
        display: flex;
        align-items: center;
        flex: 1;
        min-width: 0;
        gap: var(--ha-row-item-gap, var(--ha-space-4));
        margin-inline-start: 0;
        line-height: var(--ha-line-height-normal);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-list-item-switch": HaListItemSwitch;
  }
}

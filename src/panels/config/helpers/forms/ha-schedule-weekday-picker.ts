import type { ContextType } from "@lit/context";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consume } from "../../../../common/decorators/consume";
import type { HASSDomCurrentTargetEvent } from "../../../../common/dom/fire_event";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/chips/ha-chip-set";
import "../../../../components/chips/ha-filter-chip";
import { internationalizationContext } from "../../../../data/context";
import type { ScheduleWeekday } from "../../../../data/schedule";
import {
  formatScheduleWeekday,
  localeWeekdays,
} from "../../../../data/schedule";

/**
 * Multi-select chips for the days of the week, in the user's week order.
 *
 * @fires value-changed - `detail.value` is the list of selected days.
 */
@customElement("ha-schedule-weekday-picker")
export class HaScheduleWeekdayPicker extends LitElement {
  @property({ attribute: false }) public value: ScheduleWeekday[] = [];

  /** A day that is shown but cannot be selected. */
  @property() public exclude?: ScheduleWeekday;

  @property() public label?: string;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  protected render() {
    if (!this._i18n) {
      return nothing;
    }
    const locale = this._i18n.locale;
    return html`
      <div role="group" aria-label=${this.label ?? nothing}>
        ${this.label ? html`<div class="label">${this.label}</div>` : nothing}
        <ha-chip-set>
          ${localeWeekdays(locale).map(
            (day) => html`
              <ha-filter-chip
                no-leading-icon
                data-day=${day}
                .label=${formatScheduleWeekday(day, locale, "short")}
                title=${formatScheduleWeekday(day, locale)}
                .selected=${this.value.includes(day)}
                .disabled=${day === this.exclude}
                @click=${this._toggle}
              ></ha-filter-chip>
            `
          )}
        </ha-chip-set>
      </div>
    `;
  }

  private _toggle(ev: HASSDomCurrentTargetEvent<HTMLElement>) {
    const day = ev.currentTarget.dataset.day as ScheduleWeekday;
    const value = this.value.includes(day)
      ? this.value.filter((d) => d !== day)
      : [...this.value, day];
    fireEvent(this, "value-changed", { value });
  }

  static styles = css`
    .label {
      margin-bottom: var(--ha-space-2);
      color: var(--secondary-text-color);
      font-size: var(--ha-font-size-s);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-schedule-weekday-picker": HaScheduleWeekdayPicker;
  }
}

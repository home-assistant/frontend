import { mdiCheck } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { HaChipBase } from "./ha-chip-base";

@customElement("ha-filter-chip")
export class HaFilterChip extends HaChipBase {
  @property({ type: Boolean, reflect: true }) selected = false;

  @property({ type: Boolean, reflect: true }) elevated = false;

  @property({ type: Boolean, reflect: true, attribute: "no-leading-icon" })
  noLeadingIcon = false;

  protected override get pressed() {
    return this.selected;
  }

  protected override renderLeadingIcon() {
    if (this.noLeadingIcon) {
      return nothing;
    }

    return this.selected
      ? html`<span class="icon" aria-hidden="true">
          <slot name="selected-icon">
            <ha-svg-icon .path=${mdiCheck}></ha-svg-icon>
          </slot>
        </span>`
      : super.renderLeadingIcon();
  }

  protected override handlePrimaryClick(event: MouseEvent) {
    if (this.disabled || this.softDisabled) {
      return;
    }

    const previous = this.selected;
    this.selected = !this.selected;
    event.stopPropagation();

    // Dispatch from the chip so listeners see the new selection before deciding
    // whether to cancel it. Preserve pointer and modifier-key information.
    const click =
      typeof PointerEvent !== "undefined" && event instanceof PointerEvent
        ? new PointerEvent("click", event)
        : new MouseEvent("click", event);

    if (!this.dispatchEvent(click)) {
      this.selected = previous;
      event.preventDefault();
    }
  }

  static override get styles(): CSSResultGroup {
    return [
      super.styles,
      css`
        :host {
          --ha-button-border-radius: var(--ha-border-radius-md);
          --ha-chip-label-weight: var(--ha-font-weight-medium);
        }
        :host([selected]) {
          --ha-chip-outline-width: var(
            --md-filter-chip-selected-outline-width,
            0px
          );
          --ha-chip-container-color: var(
            --md-filter-chip-selected-container-color,
            rgba(var(--rgb-primary-text-color), 0.15)
          );
        }
        :host([selected]:not([no-leading-icon])) .primary {
          padding-inline-start: var(--ha-space-2);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-filter-chip": HaFilterChip;
  }
}

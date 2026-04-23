import type { TemplateResult } from "lit";
import { html } from "lit";
import { customElement } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { HaListBase } from "./ha-list-base";

/**
 * @element ha-list-nav
 * @extends {HaListBase}
 *
 * @summary
 * Navigation list. Wraps the list in a `<nav>` landmark. Items should be
 * `<ha-list-item-button>` with an `href`. Use `aria-label` to name the landmark.
 *
 * @csspart nav - The `<nav>` wrapper.
 * @csspart base - The inner `<div role="list">`.
 */
@customElement("ha-list-nav")
export class HaListNav extends HaListBase {
  // No host role — the inner <nav> carries the landmark semantics, and the
  // inner <div role="list"> preserves the list semantics for screen readers.
  protected override readonly hostRole = "";

  protected render(): TemplateResult {
    return html`<nav
      part="nav"
      aria-label=${ifDefined(this.ariaLabel ?? undefined)}
    >
      <div part="base" class="base" role="list">
        <slot @slotchange=${this.handleSlotChange}></slot>
      </div>
    </nav>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-list-nav": HaListNav;
  }
}

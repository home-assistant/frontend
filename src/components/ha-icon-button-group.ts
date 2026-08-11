import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, query } from "lit/decorators";

const THUMB_SIZE = 40;

@customElement("ha-icon-button-group")
export class HaIconButtonGroup extends LitElement {
  @query(".thumb") private _thumb?: HTMLDivElement;

  private _observer = new MutationObserver(() => this._updateThumb());

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._observer.disconnect();
  }

  protected render(): TemplateResult {
    return html`
      <div class="thumb"></div>
      <slot @slotchange=${this._handleSlotchange}></slot>
    `;
  }

  private _handleSlotchange(ev: Event) {
    this._observer.disconnect();
    const slot = ev.target as HTMLSlotElement;
    for (const el of slot.assignedElements()) {
      this._observer.observe(el, {
        attributes: true,
        attributeFilter: ["selected"],
      });
    }
    // Positions are only valid once the slotted buttons are laid out.
    requestAnimationFrame(() => this._updateThumb());
  }

  private _updateThumb() {
    const thumb = this._thumb;
    if (!thumb) {
      return;
    }
    const selected = this.querySelector<HTMLElement>(
      "ha-icon-button-toggle[selected]:not([disabled])"
    );
    if (!selected) {
      thumb.style.opacity = "0";
      return;
    }
    const x = selected.offsetLeft + (selected.offsetWidth - THUMB_SIZE) / 2;
    thumb.classList.toggle("border-only", selected.hasAttribute("border-only"));
    const appearing = thumb.style.opacity !== "1";
    if (appearing) {
      // Fade in at the target position instead of sliding in from the edge.
      thumb.style.transition = "none";
      thumb.style.transform = `translateX(${x}px)`;
      thumb.getBoundingClientRect();
      thumb.style.transition = "";
    } else {
      thumb.style.transform = `translateX(${x}px)`;
    }
    thumb.style.opacity = "1";
  }

  static styles = css`
    :host {
      position: relative;
      display: flex;
      flex-direction: row;
      align-items: center;
      height: 48px;
      border-radius: var(--ha-border-radius-4xl);
      background-color: rgba(139, 145, 151, 0.1);
      box-sizing: border-box;
      width: auto;
      padding: 0;
    }
    /* The selected toggle's circle is drawn here so it can slide between
       toggles; their own circles are suppressed below. */
    .thumb {
      position: absolute;
      top: calc(50% - 20px);
      left: 0;
      width: 40px;
      height: 40px;
      border-radius: var(--ha-border-radius-circle);
      background-color: var(
        --ha-icon-button-group-thumb-color,
        var(--primary-text-color)
      );
      opacity: 0;
      box-sizing: border-box;
      transition:
        transform var(--ha-animation-duration-fast) ease-in-out,
        opacity var(--ha-animation-duration-fast) ease-in-out;
    }
    .thumb.border-only {
      background-color: transparent;
      border: 2px solid
        var(--ha-icon-button-group-thumb-color, var(--primary-text-color));
    }
    ::slotted(ha-icon-button-toggle) {
      --ha-icon-button-toggle-thumb-opacity: 0;
    }
    ::slotted(.separator) {
      background-color: rgba(var(--rgb-primary-text-color), 0.15);
      width: 1px;
      margin: 0 1px;
      height: 40px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-icon-button-group": HaIconButtonGroup;
  }
}

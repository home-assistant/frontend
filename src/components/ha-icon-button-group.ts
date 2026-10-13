import { animate } from "@lit-labs/motion";
import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";

const THUMB_SIZE = 40;

@customElement("ha-icon-button-group")
export class HaIconButtonGroup extends LitElement {
  @state() private _thumbX = 0;

  @state() private _thumbVisible = false;

  @state() private _thumbBorderOnly = false;

  // When the thumb appears, only fade it in at its new position instead of
  // also sliding it from wherever it was last visible.
  private _thumbAppearing = false;

  private _observer = new MutationObserver(() => this._updateThumb());

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._observer.disconnect();
  }

  protected render() {
    return html`
      <div
        class="thumb ${classMap({
          visible: this._thumbVisible,
          "border-only": this._thumbBorderOnly,
        })}"
        style=${styleMap({ left: `${this._thumbX}px` })}
        ${animate(() => ({
          properties: this._thumbAppearing ? ["opacity"] : ["left", "opacity"],
          keyframeOptions: {
            duration: this._animationDuration(),
            easing: "ease-in-out",
          },
          skipInitial: true,
        }))}
      ></div>
      <slot @slotchange=${this._handleSlotchange}></slot>
    `;
  }

  protected updated() {
    this._thumbAppearing = false;
  }

  private _animationDuration(): number {
    return (
      parseFloat(
        getComputedStyle(this).getPropertyValue("--ha-animation-duration-fast")
      ) || 150
    );
  }

  private _handleSlotchange(ev: Event) {
    this._observer.disconnect();
    const slot = ev.target as HTMLSlotElement;
    for (const el of slot.assignedElements()) {
      this._observer.observe(el, {
        attributes: true,
        attributeFilter: ["selected", "disabled"],
      });
    }
    // Positions are only valid once the slotted buttons are laid out.
    requestAnimationFrame(() => this._updateThumb());
  }

  private _updateThumb() {
    const selected = this.querySelector<HTMLElement>(
      "ha-icon-button-toggle[selected]:not([disabled])"
    );
    if (!selected) {
      this._thumbVisible = false;
      return;
    }
    this._thumbAppearing = !this._thumbVisible;
    this._thumbBorderOnly = selected.hasAttribute("border-only");
    this._thumbX =
      selected.offsetLeft + (selected.offsetWidth - THUMB_SIZE) / 2;
    this._thumbVisible = true;
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
      opacity: 0;
      width: 40px;
      height: 40px;
      border-radius: var(--ha-border-radius-circle);
      background-color: var(
        --ha-icon-button-group-thumb-color,
        var(--primary-text-color)
      );
      box-sizing: border-box;
    }
    .thumb.visible {
      opacity: 1;
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

import { ResizeController } from "@lit-labs/observers/resize-controller";
import { css, html } from "lit";
import type {
  CSSResultGroup,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { classMap } from "lit/directives/class-map";
import { state } from "lit/decorators";
import type { Constructor } from "../types";

const stylesArray = (styles?: CSSResultGroup | CSSResultGroup[]) =>
  styles === undefined ? [] : Array.isArray(styles) ? styles : [styles];

/**
 * Mixin that adds top and bottom fade overlays for scrollable content.
 * @param superClass - The LitElement class to extend.
 * @returns Extended class with scrollable fade functionality.
 */
export const ScrollableFadeMixin = <T extends Constructor<LitElement>>(
  superClass: T
) => {
  class ScrollableFadeClass extends superClass {
    /** Whether content has scrolled past the threshold. Controls top fade visibility. */
    @state() protected _contentScrolled = false;

    /** Whether content extends beyond the viewport. Controls bottom fade visibility. */
    @state() protected _contentScrollable = false;

    private _scrollTarget?: HTMLElement | null;

    private _onScroll = (ev: Event) => {
      const target = ev.currentTarget as HTMLElement;
      this._contentScrolled =
        (target.scrollTop ?? 0) > this.scrollFadeThreshold;
      this._updateScrollableState(target);
    };

    private _resize = new ResizeController(this, {
      target: null,
      callback: (entries) => {
        const target = entries[0]?.target as HTMLElement | undefined;
        if (target) {
          this._updateScrollableState(target);
        }
      },
    });

    /**
     * Safe area padding in pixels for the scrollable element.
     */
    protected scrollFadeSafeAreaPadding = 16;

    /**
     * Scroll threshold in pixels for showing the fades.
     */
    protected scrollFadeThreshold = 4;

    /**
     * Default scrollable element value.
     */
    private static readonly DEFAULT_SCROLLABLE_ELEMENT: HTMLElement | null =
      null;

    /**
     * Element to observe for scroll and resize events. Override with a getter to specify target.
     * Kept as a getter to allow subclasses to return query results.
     */
    protected get scrollableElement(): HTMLElement | null {
      return ScrollableFadeClass.DEFAULT_SCROLLABLE_ELEMENT;
    }

    protected firstUpdated(changedProperties: PropertyValues) {
      super.firstUpdated?.(changedProperties);
      this._attachScrollableElement();
    }

    protected updated(changedProperties: PropertyValues) {
      super.updated?.(changedProperties);
      this._attachScrollableElement();
    }

    disconnectedCallback() {
      this._detachScrollableElement();
      super.disconnectedCallback();
    }

    /**
     * Renders top and bottom fade overlays. Call in render method.
     * @param rounded - Whether to apply rounded corners.
     * @returns Template containing fade elements.
     */
    protected renderScrollableFades(rounded = false): TemplateResult {
      return html`
        <div
          class=${classMap({
            "fade-top": true,
            rounded,
            visible: this._contentScrolled,
          })}
        ></div>
        <div
          class=${classMap({
            "fade-bottom": true,
            rounded,
            visible: this._contentScrollable,
          })}
        ></div>
      `;
    }

    static get styles() {
      const superCtor = Object.getPrototypeOf(this) as
        | typeof LitElement
        | undefined;
      const inheritedStyles = stylesArray(
        (superCtor?.styles ?? []) as CSSResultGroup | CSSResultGroup[]
      );
      return [
        ...inheritedStyles,
        css`
          .fade-top,
          .fade-bottom {
            position: absolute;
            left: var(--ha-space-0);
            right: var(--ha-space-0);
            height: var(--ha-space-4);
            pointer-events: none;
            transition: opacity 180ms ease-in-out;
            background: linear-gradient(
              to bottom,
              var(--shadow-color),
              transparent
            );
            border-radius: var(--ha-border-radius-square);
            opacity: 0;
          }
          .fade-top {
            top: var(--ha-space-0);
          }
          .fade-bottom {
            bottom: var(--ha-space-0);
            transform: rotate(180deg);
          }

          .fade-top.visible,
          .fade-bottom.visible {
            opacity: 1;
          }

          .fade-top.rounded,
          .fade-bottom.rounded {
            border-radius: var(
              --ha-card-border-radius,
              var(--ha-border-radius-lg)
            );
            border-bottom-left-radius: var(--ha-border-radius-square);
            border-bottom-right-radius: var(--ha-border-radius-square);
          }
          .fade-top.rounded {
            border-top-left-radius: var(--ha-border-radius-square);
            border-top-right-radius: var(--ha-border-radius-square);
          }
          .fade-bottom.rounded {
            border-bottom-left-radius: var(--ha-border-radius-square);
            border-bottom-right-radius: var(--ha-border-radius-square);
          }
        `,
      ];
    }

    private _attachScrollableElement() {
      const element = this.scrollableElement;
      if (element === this._scrollTarget) {
        return;
      }
      this._detachScrollableElement();
      if (!element) {
        return;
      }
      this._scrollTarget = element;
      element.addEventListener("scroll", this._onScroll, { passive: true });
      this._resize.observe(element);
      this._updateScrollableState(element);
    }

    private _detachScrollableElement() {
      if (!this._scrollTarget) {
        return;
      }
      this._scrollTarget.removeEventListener("scroll", this._onScroll);
      this._resize.unobserve?.(this._scrollTarget);
      this._scrollTarget = undefined;
    }

    private _updateScrollableState(element: HTMLElement) {
      const safeAreaInsetBottom =
        parseFloat(
          getComputedStyle(element).getPropertyValue("--safe-area-inset-bottom")
        ) || 0;
      const { scrollHeight = 0, clientHeight = 0, scrollTop = 0 } = element;
      this._contentScrollable =
        scrollHeight - clientHeight >
        scrollTop + safeAreaInsetBottom + this.scrollFadeSafeAreaPadding;
    }
  }

  return ScrollableFadeClass;
};
